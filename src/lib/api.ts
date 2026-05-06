import { NextResponse } from "next/server";
import type { ZodType } from "zod";

const DEFAULT_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

function mergeHeaders(headers?: HeadersInit): Headers {
  const merged = new Headers(DEFAULT_HEADERS);

  if (headers) {
    const incoming = new Headers(headers);
    incoming.forEach((value, key) => {
      merged.set(key, value);
    });
  }

  return merged;
}

export function apiJson<T>(body: T, init: ResponseInit = {}) {
  return NextResponse.json(body, {
    ...init,
    headers: mergeHeaders(init.headers),
  });
}

export function apiError(
  message: string,
  status = 500,
  details?: unknown,
) {
  return apiJson(
    {
      error: message,
      ...(details === undefined ? {} : { details }),
    },
    { status },
  );
}

type ParsedBodyResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<ParsedBodyResult<T>> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return {
      ok: false,
      response: apiError("Expected application/json request body", 415),
    };
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return {
      ok: false,
      response: apiError("Malformed JSON body", 400),
    };
  }

  const result = schema.safeParse(payload);
  if (!result.success) {
    return {
      ok: false,
      response: apiError("Invalid request body", 400, result.error.flatten()),
    };
  }

  return { ok: true, data: result.data };
}

export function getErrorMessage(
  error: unknown,
  fallback = "Unknown error",
): string {
  return error instanceof Error ? error.message : fallback;
}

export function logApiError(scope: string, error: unknown) {
  console.error(`[${scope}]`, error);
}
