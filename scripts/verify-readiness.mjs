#!/usr/bin/env node

/**
 * TKC release-readiness gate.
 *
 * This is intentionally a smoke test, not a replacement for deep domain QA.
 * It proves the cassette can be linted, built, booted, health-probed, and
 * exercised through the command-center shell before a demo or deployment.
 */

import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const DEFAULT_PORT = 3217;
const DEFAULT_LINT_WARNING_BUDGET = 120;
const STARTUP_TIMEOUT_MS = 60_000;
const REQUEST_TIMEOUT_MS = 15_000;

const env = process.env;
const externalBaseUrl = env.TKC_BASE_URL?.replace(/\/$/, "");
const port = Number(env.TKC_VERIFY_PORT ?? DEFAULT_PORT);
const baseUrl = externalBaseUrl ?? `http://127.0.0.1:${port}`;
const warningBudget = Number(
  env.TKC_LINT_WARNING_BUDGET ?? DEFAULT_LINT_WARNING_BUDGET,
);

let devServer = null;

function heading(label) {
  console.log(`\n== ${label}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function commandSummary(command, args) {
  return [command, ...args].join(" ");
}

function runCommand(command, args, options = {}) {
  const printable = commandSummary(command, args);
  console.log(`$ ${printable}`);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: {
        ...env,
        NEXT_TELEMETRY_DISABLED: "1",
        ...options.env,
      },
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });

    let output = "";
    if (options.capture) {
      child.stdout.on("data", (chunk) => {
        const text = chunk.toString();
        output += text;
        process.stdout.write(text);
      });
      child.stderr.on("data", (chunk) => {
        const text = chunk.toString();
        output += text;
        process.stderr.write(text);
      });
    }

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`${printable} exited with ${code}`));
      }
    });
  });
}

function parseLintWarnings(output) {
  const match = output.match(/(\d+)\s+warnings?\)/);
  return match ? Number(match[1]) : 0;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(env.TKC_SESSION_PASSWORD
          ? { cookie: `tkc_session=${env.TKC_SESSION_PASSWORD}` }
          : {}),
        ...(options.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function waitForServer(url) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < STARTUP_TIMEOUT_MS) {
    try {
      const response = await fetchWithTimeout(url);
      if (response.status < 500 || response.status === 503) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(800);
  }

  throw new Error(
    `Server did not become ready at ${url}: ${
      lastError instanceof Error ? lastError.message : "unknown error"
    }`,
  );
}

function startDevServer() {
  if (externalBaseUrl) {
    console.log(`Using existing server: ${baseUrl}`);
    return null;
  }

  console.log(`Starting Next dev server on ${baseUrl}`);
  const child = spawn(
    "npm",
    ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: process.cwd(),
      env: {
        ...env,
        DASHBOARD_PASSWORD: "",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  child.on("exit", (code) => {
    if (code !== null && code !== 0) {
      console.error(`Next dev server exited with ${code}`);
    }
  });

  return child;
}

async function probeJson(path, validate) {
  const url = `${baseUrl}${path}`;
  const response = await fetchWithTimeout(url, {
    headers: { accept: "application/json" },
  });
  const contentType = response.headers.get("content-type") ?? "";
  assert(
    contentType.includes("application/json"),
    `${path} returned ${contentType || "no content-type"}, expected JSON`,
  );

  const body = await response.json();
  validate(response, body);
  console.log(`ok ${path} -> HTTP ${response.status}`);
}

async function browserSmoke() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    baseURL: baseUrl,
  });

  if (env.TKC_SESSION_PASSWORD) {
    await context.addCookies([
      {
        name: "tkc_session",
        value: env.TKC_SESSION_PASSWORD,
        url: baseUrl,
      },
    ]);
  }

  try {
    const page = await context.newPage();
    const consoleProblems = [];
    page.on("console", (message) => {
      if (["error"].includes(message.type())) {
        consoleProblems.push(message.text());
      }
    });
    page.on("pageerror", (error) => consoleProblems.push(error.message));

    await page.goto("/command-center", {
      waitUntil: "domcontentloaded",
      timeout: REQUEST_TIMEOUT_MS,
    });
    await page.locator(".cc-root").waitFor({ state: "visible" });
    await page.getByRole("heading", { name: "Boss Room" }).waitFor();

    const title = await page.title();
    assert(title.includes("TKC X"), `Unexpected document title: ${title}`);

    await page.getByTitle("Open route menu").click();
    await page.getByRole("dialog").waitFor();
    await page.getByTitle("Open Formation Board").click();
    await page
      .getByRole("heading", { name: "Formation Board" })
      .waitFor({ timeout: REQUEST_TIMEOUT_MS });
    assert(
      page.url().includes("screen=formation"),
      `Formation navigation did not update the URL: ${page.url()}`,
    );

    await page.getByTitle("Return to Boss Room").click();
    await page
      .getByRole("heading", { name: "Boss Room" })
      .waitFor({ timeout: REQUEST_TIMEOUT_MS });

    const portalTexts = await page.locator("nextjs-portal").allTextContents();
    const overlayProblem = portalTexts.find((text) =>
      /Unhandled Runtime Error|Runtime Error|Build Error|Application error|Hydration failed|Error:/i.test(
        text,
      ),
    );
    assert(
      !overlayProblem,
      `Next.js error overlay is present:\n${overlayProblem}`,
    );
    assert(
      consoleProblems.length === 0,
      `Browser console/page errors:\n${consoleProblems.join("\n")}`,
    );

    console.log("ok browser smoke -> Boss Room, route menu, Formation, Home");
  } finally {
    await browser.close();
  }
}

async function main() {
  try {
    heading("Lint");
    const lintOutput = await runCommand("npm", ["run", "lint"], {
      capture: true,
    });
    const lintWarnings = parseLintWarnings(lintOutput);
    assert(
      lintWarnings <= warningBudget,
      `Lint warnings ${lintWarnings} exceed budget ${warningBudget}`,
    );
    console.log(`ok lint warnings ${lintWarnings}/${warningBudget}`);

    heading("Build");
    await runCommand("npm", ["run", "build"]);

    heading("Boot");
    devServer = startDevServer();
    await waitForServer(`${baseUrl}/command-center`);
    console.log(`ok command center reachable at ${baseUrl}/command-center`);

    heading("Health Probes");
    await probeJson("/api/sheets/health", (response, body) => {
      assert(response.status === 200, "Sheets health must return HTTP 200");
      assert(typeof body.ok === "boolean", "Sheets health missing ok flag");
      assert(Array.isArray(body.declared), "Sheets health missing schema list");
      assert(
        body.enabled || body.ok === false,
        "Disabled Sheets mirror should report ok=false",
      );
    });

    await probeJson("/api/db/dashboard", (response, body) => {
      assert(
        [200, 503].includes(response.status),
        `Dashboard returned unexpected HTTP ${response.status}`,
      );
      assert(
        typeof body.live === "boolean",
        "Dashboard payload missing live flag",
      );
      if (response.status === 200) {
        assert(Array.isArray(body.employees), "Dashboard missing employees");
        assert(Array.isArray(body.projects), "Dashboard missing projects");
      } else {
        assert(
          body.error === "Database not configured",
          `Unexpected degraded dashboard error: ${body.error}`,
        );
      }
    });

    heading("Browser Smoke");
    await browserSmoke();

    heading("Readiness");
    console.log("PASS TKC cassette release-readiness gate");
  } finally {
    if (devServer) {
      devServer.kill("SIGTERM");
      await delay(300);
      if (!devServer.killed) devServer.kill("SIGKILL");
    }
  }
}

main().catch((error) => {
  console.error(`\nFAIL ${error instanceof Error ? error.message : error}`);
  if (devServer) devServer.kill("SIGTERM");
  process.exitCode = 1;
});
