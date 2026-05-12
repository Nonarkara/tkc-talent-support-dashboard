"use client";

/**
 * LobbyTab — the company floor, rendered as a subway-flat canvas.
 *
 * Every employee who has clocked in today walks around the lobby as a
 * small portrait. Physics is a tiny affinity model:
 *   • gentle wander toward a per-agent goal
 *   • soft wall at the canvas edges
 *   • personal-space repulsion within 26 px
 *   • long-range attraction scaled by affinity (dept, archetype,
 *     gender, shared skills) → tech folks cluster with tech, women
 *     cluster with women, etc.
 *
 * The check-in panel on the right lets Dr Non clock anyone in or
 * out. The click updates the visible floor immediately and records the
 * punch to the Google Sheets Attendance ledger.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DashboardPayload } from "../_shared/types";
import type { Employee } from "../_shared/types";
import { getArchetype } from "@/lib/token-economy";
import { inferGender } from "@/lib/sprite-variation";
import { translate, useLocale } from "@/lib/i18n";
import { LOBBY } from "@/lib/i18n-dict";
import { getHeroDialogue } from "@/lib/dialogue";
import type { WorldEvent } from "../_shared/types";
import {
  PALETTE,
  PREBAKED_CLASSES,
  primaryColorForSeed,
  spriteClassFor,
  type SpriteClassName,
} from "@/lib/sprite-16";

const LOGGED_CHATS = new Set<string>();
const RECENT_CHAT_LOGS = new Map<string, number>();
const AUTO_INTERACTION_WINDOW_MS = 60_000;
const AUTO_INTERACTION_LIMIT_PER_WINDOW = 6;
const CHAT_PAIR_COOLDOWN_MS = 10 * 60_000;
let autoInteractionWindowStartedAt = 0;
let autoInteractionWritesInWindow = 0;

// ─── Sprite-to-canvas cache ───────────────────────────────────────────
// Per (matrix, primaryColor) combination, render the 16×16 grid into an
// offscreen canvas once, then `drawImage` from it for every agent each
// frame. Three matrices × three colours = 9 cached canvases. Tiny.

const SPRITE_CANVAS_CACHE = new Map<string, HTMLCanvasElement>();

function getSpriteCanvas(spriteClass: SpriteClassName, primaryColor: string): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const key = `${spriteClass}_${primaryColor}`;
  const cached = SPRITE_CANVAS_CACHE.get(key);
  if (cached) return cached;

  const off = document.createElement("canvas");
  off.width = 16;
  off.height = 16;
  const c = off.getContext("2d");
  if (!c) return null;
  const matrix = PREBAKED_CLASSES[spriteClass];
  for (let y = 0; y < 16; y++) {
    const row = matrix[y];
    if (!row) continue;
    for (let x = 0; x < 16; x++) {
      const idx = row[x];
      if (idx === 0) continue; // transparent
      const colour = idx === 3 ? primaryColor : PALETTE[idx];
      if (!colour || colour === "transparent") continue;
      c.fillStyle = colour;
      c.fillRect(x, y, 1, 1);
    }
  }
  SPRITE_CANVAS_CACHE.set(key, off);
  return off;
}

/** How long after a chat starts the speech bubble stays visible. The
 *  chat itself lasts 4-10s; the bubble only flashes for the first
 *  2.5s so a busy lobby doesn't drown in overlapping bubbles. */
const BUBBLE_VISIBLE_MS = 2500;

// ─── Agent ──────────────────────────────────────────────────────────────

interface Agent {
  id: string;
  label: string;
  archetype: "captain" | "ops" | "tech" | "scout" | "sales" | "fighter" | "goofoff";
  gender: "m" | "f";
  dept: string;
  projectCode: string | null;
  skills: string[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  goalX: number;
  goalY: number;
  chatUntil: number;
  /** When the current chat began. Used to fade dialogue bubbles after
   *  ~2.5s so the lobby stays comprehensible when many heroes mingle.
   *  The chat itself continues (4-10s) — only the speech bubble vanishes. */
  chatStartedAt: number;
  chatPartner: string | null;
  dialogue: string | null;
  /** Pre-resolved sprite identity. Set once in buildAgent so the draw
   *  loop can drawImage from a sprite cache without recomputing. */
  spriteClass: SpriteClassName;
  primaryColor: string;
}

type LobbyContext = {
  worldEvents: WorldEvent[];
  employeeById: Map<string, Employee>;
};

function shouldPersistAutoInteraction(chatKey: string, now: number): boolean {
  const lastLoggedAt = RECENT_CHAT_LOGS.get(chatKey);
  if (lastLoggedAt != null && now - lastLoggedAt < CHAT_PAIR_COOLDOWN_MS) {
    return false;
  }

  if (now - autoInteractionWindowStartedAt > AUTO_INTERACTION_WINDOW_MS) {
    autoInteractionWindowStartedAt = now;
    autoInteractionWritesInWindow = 0;
  }

  if (autoInteractionWritesInWindow >= AUTO_INTERACTION_LIMIT_PER_WINDOW) {
    return false;
  }

  autoInteractionWritesInWindow += 1;
  RECENT_CHAT_LOGS.set(chatKey, now);
  return true;
}

const ACCENT: Record<Agent["archetype"], string> = {
  captain: "#2B5FA0",
  ops: "#C43A2E",
  tech: "#5E3A7A",
  scout: "#3E6231",
  sales: "#D8812A",
  fighter: "#E69138",
  goofoff: "#D5A6BD",
};

// ─── Affinity scoring ───────────────────────────────────────────────────

function affinity(a: Agent, b: Agent): number {
  let w = 0;
  // Shared project is the strongest bond in the lobby.
  if (a.projectCode && a.projectCode === b.projectCode) w += 3.0;
  if (a.dept && a.dept === b.dept) w += 1.0;
  if (a.archetype === b.archetype) w += 0.7;
  if (a.gender === b.gender) w += 0.4;
  const shared = a.skills.filter((s) => b.skills.includes(s)).length;
  if (shared >= 2) w += 0.5;
  return w;
}

// ─── Step ───────────────────────────────────────────────────────────────

function step(agents: Agent[], w: number, h: number, now: number, context: LobbyContext) {
  const PERSONAL = 26;
  const ATTRACT = 180;
  const MAX_V = 0.7;
  const DAMP = 0.92;

  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];

    // If chatting, hold position.
    if (a.chatPartner && now < a.chatUntil) {
      a.vx *= 0.6;
      a.vy *= 0.6;
      a.x += a.vx;
      a.y += a.vy;
      continue;
    } else if (a.chatPartner) {
      const chatKey = [a.id, a.chatPartner].sort().join(":");
      LOGGED_CHATS.delete(chatKey);
      a.chatPartner = null;
      a.dialogue = null;
    }

    // Wander toward goal; pick a new goal occasionally.
    if (Math.hypot(a.goalX - a.x, a.goalY - a.y) < 20 || Math.random() < 0.003) {
      // More likely to stop for a bit ("Human" idling)
      if (Math.random() < 0.4) {
        a.goalX = a.x;
        a.goalY = a.y;
      } else {
        a.goalX = 60 + Math.random() * (w - 120);
        a.goalY = 60 + Math.random() * (h - 120);
      }
    }

    let fx = (a.goalX - a.x) * 0.0008; // Slower acceleration
    let fy = (a.goalY - a.y) * 0.0008;

    // Soft walls
    if (a.x < 40) fx += (40 - a.x) * 0.005;
    if (a.x > w - 40) fx -= (a.x - (w - 40)) * 0.005;
    if (a.y < 40) fy += (40 - a.y) * 0.005;
    if (a.y > h - 40) fy -= (a.y - (h - 40)) * 0.005;

    // Neighbour forces
    for (let j = 0; j < agents.length; j++) {
      if (j === i) continue;
      const b = agents[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d < 1 || d > ATTRACT) continue;
      const nx = dx / d;
      const ny = dy / d;
      if (d < PERSONAL) {
        // Repel
        const push = (PERSONAL - d) * 0.015;
        fx -= nx * push;
        fy -= ny * push;
        // Chat trigger: close + high affinity + not already chatting
        if (!a.chatPartner && !b.chatPartner && affinity(a, b) >= 1.5 && Math.random() < 0.008) {
          a.chatPartner = b.id;
          b.chatPartner = a.id;
          const until = now + 4000 + Math.random() * 6000;
          a.chatUntil = until;
          b.chatUntil = until;
          a.chatStartedAt = now;
          b.chatStartedAt = now;

          // Bounded persistence: keep a sample of ambient lobby chats
          // without turning a busy canvas into a Sheets write storm.
          const chatKey = [a.id, b.id].sort().join(":");
          if (!LOGGED_CHATS.has(chatKey)) {
            LOGGED_CHATS.add(chatKey);
            
            const activeEvent = context.worldEvents[0];
            const employeeA = context.employeeById.get(a.id);
            const employeeB = context.employeeById.get(b.id);
            a.dialogue = employeeA ? getHeroDialogue(employeeA, activeEvent) : "...";
            b.dialogue = employeeB ? getHeroDialogue(employeeB, activeEvent) : "...";

            if (shouldPersistAutoInteraction(chatKey, now)) {
              void fetch("/api/lobby/interaction", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  initiator_id: a.id,
                  partner_id: b.id,
                  interaction_type: "chat",
                  note: `Mingle: ${a.label} & ${b.label}`,
                }),
              }).catch(() => {});
            }
          }
        }
      } else {
        // Attract, weighted by affinity
        const w = affinity(a, b);
        if (w > 0) {
          const pull = (w * 0.0004 * (1 - d / ATTRACT));
          fx += nx * pull;
          fy += ny * pull;
        }
      }
    }

    a.vx = clamp((a.vx + fx) * DAMP, -MAX_V, MAX_V);
    a.vy = clamp((a.vy + fy) * DAMP, -MAX_V, MAX_V);
    a.x += a.vx;
    a.y += a.vy;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

// ─── Build Agent from Employee ──────────────────────────────────────────

function buildAgent(
  emp: Employee,
  w: number,
  h: number,
  teams: DashboardPayload["teams"],
): Agent {
  const archetype = (() => {
    try {
      return getArchetype({
        role_level: (emp.role_level ?? "staff") as string,
        dept_code: emp.dept_code ?? null,
      });
    } catch {
      return "ops" as const;
    }
  })();

  // Detect project membership for affinity
  const project = teams.find((t) => t.player_ids?.includes(emp.id))?.project_code ?? null;

  const spriteClass = spriteClassFor(archetype);
  const primaryColor = primaryColorForSeed(emp.id);

  // Eagerly warm the sprite cache for this combination so the first
  // draw frame doesn't stall on lazy canvas creation.
  getSpriteCanvas(spriteClass, primaryColor);

  return {
    id: emp.id,
    label: emp.nickname || emp.full_name_en || emp.full_name_th || emp.id.slice(0, 6),
    archetype,
    gender: inferGender(emp.id, emp.full_name_en ?? emp.full_name_th, emp.nickname, emp.title_en),
    dept: emp.dept_code ?? "",
    projectCode: project,
    skills: emp.skills ?? [],
    x: 40 + Math.random() * (w - 80),
    y: 40 + Math.random() * (h - 80),
    vx: 0,
    vy: 0,
    goalX: 40 + Math.random() * (w - 80),
    goalY: 40 + Math.random() * (h - 80),
    chatUntil: 0,
    chatStartedAt: 0,
    chatPartner: null,
    dialogue: null,
    spriteClass,
    primaryColor,
  };
}

// ─── Draw ───────────────────────────────────────────────────────────────

function draw(ctx: CanvasRenderingContext2D, agents: Agent[], w: number, h: number, showGraph: boolean) {
  // Dark wood tabletop — the tavern floor, not a subway station.
  ctx.fillStyle = "#1a1209";
  ctx.fillRect(0, 0, w, h);

  // Social Graph (tavern candlelight)
  if (showGraph) {
    ctx.lineWidth = 0.5;
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const a = agents[i];
        const b = agents[j];
        const aff = affinity(a, b);
        if (aff > 0.5) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          const opacity = Math.min(0.5, aff * 0.12);
          ctx.strokeStyle = `rgba(245,240,232,${opacity})`;
          ctx.lineWidth = aff * 0.5;
          ctx.stroke();
        }
      }
    }
  }

  // Faint grid — wood grain lines
  ctx.strokeStyle = "rgba(245,240,232,0.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Disable smoothing so sprite-cache drawImage stays pixel-crisp.
  ctx.imageSmoothingEnabled = false;
  const now = Date.now();

  for (const a of agents) {
    const isMoving = Math.abs(a.vx) + Math.abs(a.vy) > 0.05;

    // Shadow — deeper on dark wood
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.ellipse(a.x, a.y + 14, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // "Mingle" physics: bobbing while moving
    const bob = isMoving ? Math.round(Math.sin(now * 0.01) * 2) : 0;

    // Sprite
    const sprite = getSpriteCanvas(a.spriteClass, a.primaryColor);
    if (sprite) {
      const sx = Math.round(a.x - 16);
      const sy = Math.round(a.y - 24 + bob);
      ctx.drawImage(sprite, sx, sy, 32, 32);
    }

    // Project indicator (small lit square on chest).
    if (a.projectCode) {
      ctx.fillStyle = "#1a1209";
      ctx.fillRect(a.x - 3, a.y - 6 + bob, 6, 6);
      ctx.strokeStyle = "rgba(245,240,232,0.85)";
      ctx.lineWidth = 1;
      ctx.strokeRect(a.x - 3, a.y - 6 + bob, 6, 6);
    }

    // Label (cream, uppercase)
    ctx.fillStyle = "rgba(245,240,232,0.75)";
    ctx.font = "bold 9px ui-monospace, SFMono-Regular, monospace";
    ctx.textAlign = "center";
    ctx.fillText(a.label.toUpperCase().slice(0, 10), a.x, a.y + 28);

    // Chat bubble
    const bubbleVisible =
      a.chatPartner != null &&
      a.dialogue != null &&
      now - a.chatStartedAt < BUBBLE_VISIBLE_MS;
    if (bubbleVisible && a.dialogue) {
      const partner = agents.find(p => p.id === a.chatPartner);
      const isTeamChat = partner && partner.projectCode === a.projectCode && a.projectCode !== null;

      const text = a.dialogue;
      ctx.font = "8px ui-monospace, SFMono-Regular, monospace";
      const textWidth = ctx.measureText(text).width;
      const bubbleW = textWidth + 12;
      const bubbleH = 14;
      const bx = a.x - bubbleW / 2;
      const by = a.y - 48 + bob;

      ctx.fillStyle = "rgba(10,10,10,0.92)";
      ctx.fillRect(bx, by, bubbleW, bubbleH);
      ctx.strokeStyle = isTeamChat ? "#7db865" : "#E8C547";
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bubbleW, bubbleH);

      ctx.fillStyle = "#f5f0e8";
      ctx.textAlign = "center";
      ctx.fillText(text, a.x, by + 10);

      // Bubble tail
      ctx.beginPath();
      ctx.moveTo(a.x - 4, by + bubbleH);
      ctx.lineTo(a.x + 4, by + bubbleH);
      ctx.lineTo(a.x, by + bubbleH + 4);
      ctx.fill();
    }
  }
}

// ─── Component ──────────────────────────────────────────────────────────

export function LobbyTab({ dash }: { dash: DashboardPayload }) {
  const { loc } = useLocale();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const agentsRef = useRef<Agent[]>([]);
  const rafRef = useRef<number | null>(null);

  const [onFloor, setOnFloor] = useState<Set<string>>(
    () => new Set(dash.employees.map((employee) => employee.id)),
  );
  const [query, setQuery] = useState("");
  const [punchError, setPunchError] = useState<string | null>(null);
  const [showGraph, setShowGraph] = useState(false);

  const employees = dash.employees;

  // ── On-mount: load who is actually on the floor today ─────────────────
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/lobby/punch");
        if (!res.ok) {
          throw new Error(`attendance fetch failed: ${res.status}`);
        }
        const data = (await res.json()) as { on_floor?: string[] };
        if (Array.isArray(data.on_floor)) {
          setOnFloor(new Set(data.on_floor));
        }
      } catch {
        // Keep the fallback roster visible when attendance is unavailable.
      }
    })();
  }, []);

  // Build / maintain the agents array whenever the floor set changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    const byId = new Map(agentsRef.current.map((a) => [a.id, a]));
    const next: Agent[] = [];
    for (const emp of employees) {
      if (!onFloor.has(emp.id)) continue;
      const existing = byId.get(emp.id);
      if (existing) {
        next.push(existing);
      } else {
        next.push(buildAgent(emp, w || 600, h || 400, dash.teams));
      }
    }
    agentsRef.current = next;
  }, [dash.teams, employees, onFloor]);

  // Animation loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext("2d");
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const lobbyContext: LobbyContext = {
      worldEvents: dash.world_events,
      employeeById: new Map(dash.employees.map((employee) => [employee.id, employee])),
    };

    const loop = (now: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      // Step physics at ~60 fps
      step(agentsRef.current, w, h, now, lobbyContext);
      draw(ctx, agentsRef.current, w, h, showGraph);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [showGraph, dash.world_events, dash.employees]);

  const togglePunch = useCallback((emp: Employee) => {
    const empId = emp.id;
    const action = onFloor.has(empId) ? "out" : "in";
    setPunchError(null);
    setOnFloor((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
    void fetch("/api/lobby/punch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ employee_id: empId, action }),
    }).then((res) => {
      if (!res.ok) throw new Error("Punch save failed");
    }).catch(() => {
      setOnFloor((prev) => {
        const rollback = new Set(prev);
        if (action === "in") rollback.delete(empId);
        else rollback.add(empId);
        return rollback;
      });
      setPunchError(`Could not save ${emp.display_name ?? emp.employee_code} to Attendance.`);
    });
  }, [onFloor]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => {
      const hay = [e.nickname, e.full_name_en, e.full_name_th, e.employee_code]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [employees, query]);

  const floorCount = onFloor.size;
  const totalCount = employees.length;

  return (
    <div
      className="lobby-floor-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 320px",
        gap: 0,
        height: "calc(100vh - 220px)",
        minHeight: 500,
        background: "#1a1209",
        color: "#f5f0e8",
        border: "1px solid #3d2e1e",
      }}
    >
      <div className="lobby-map-pane" style={{ position: "relative", borderRight: "1px solid #3d2e1e" }}>
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
        {/* Tavern floor tag */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            background: "#231a0f",
            color: "#f5f0e8",
            padding: "6px 12px",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.12em",
            border: "1px solid #3d2e1e",
          }}
        >
          {translate(loc, { en: "LOBBY", th: "ล็อบบี้" })} · {floorCount}/{totalCount}{" "}
          {translate(loc, LOBBY.on_floor).toUpperCase()}
        </div>

        {/* Graph Toggle */}
        <button
          onClick={() => setShowGraph(!showGraph)}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: showGraph ? "#D4A843" : "#231a0f",
            color: showGraph ? "#1a1209" : "#f5f0e8",
            border: "1px solid #3d2e1e",
            padding: "6px 12px",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 800,
            cursor: "pointer",
            letterSpacing: "0.12em",
          }}
        >
          {showGraph ? "HIDE SOCIAL GRAPH" : "SHOW SOCIAL GRAPH"}
        </button>

        {/* Legend */}
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            display: "flex",
            gap: 10,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: "#f5f0e8",
          }}
        >
          {(Object.entries(ACCENT) as Array<[Agent["archetype"], string]>).map(([k, c]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 10, height: 10, background: c, border: "1px solid #f5f0e8" }} />
              <span>{k.toUpperCase()}</span>
            </div>
          ))}
        </div>
      </div>

      <aside style={{ display: "flex", flexDirection: "column", minHeight: 0, background: "#1a1209" }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid #3d2e1e" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.1em",
              marginBottom: 8,
              color: "#f5f0e8",
            }}
          >
            {translate(loc, LOBBY.aside_title).toUpperCase()}
          </div>
          <input
            type="search"
            placeholder={translate(loc, LOBBY.search)}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid #3d2e1e",
              background: "#231a0f",
              color: "#f5f0e8",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              outline: "none",
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.map((emp) => {
            const isOn = onFloor.has(emp.id);
            const name = emp.nickname || emp.full_name_en || emp.full_name_th || emp.id.slice(0, 8);
            return (
              <div
                key={emp.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderBottom: "1px solid rgba(245,240,232,0.08)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "#f5f0e8",
                    }}
                  >
                    {name.toUpperCase()}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#8a7f6b",
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {(emp.dept_code ?? "—")} · {emp.title_en ?? emp.title ?? "—"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => togglePunch(emp)}
                  style={{
                    padding: "6px 10px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    border: `1px solid ${isOn ? "#f5f0e8" : "#3d2e1e"}`,
                    background: isOn ? "#f5f0e8" : "transparent",
                    color: isOn ? "#1a1209" : "#f5f0e8",
                    cursor: "pointer",
                  }}
                >
                  {isOn
                    ? translate(loc, LOBBY.check_out).toUpperCase()
                    : translate(loc, LOBBY.check_in).toUpperCase()}
                </button>
              </div>
            );
          })}
          {punchError && (
            <div
              role="alert"
              style={{
                padding: "8px 12px",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "#f5f0e8",
                background: "rgba(196,58,46,0.18)",
                borderTop: "1px solid rgba(196,58,46,0.35)",
              }}
            >
              {punchError}
            </div>
          )}
          {filtered.length === 0 && (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "#8a7f6b",
              }}
            >
              {translate(loc, { en: "No match.", th: "ไม่พบผลลัพธ์" })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
