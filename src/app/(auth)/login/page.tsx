"use client";

/**
 * /login — site-wide access gate for the deployed URL.
 *
 * Subway-flat PIN form. Correct password sets the `tkc_access` cookie
 * (via POST /api/auth/login) and redirects to the intended destination
 * or /command-center.
 *
 * Incorrect password shakes the input and shows "Access denied."
 * No lockout — ceremony security for a "show someone" link.
 */

import { useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function getSafeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/command-center";
  }

  return next;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = getSafeNextPath(params.get("next"));

  const [pin, setPin] = useState("");
  const [shaking, setShaking] = useState(false);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!pin || busy) return;
    setBusy(true);
    setDenied(false);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pin }),
    });

    if (res.ok) {
      router.push(next);
    } else {
      setBusy(false);
      setDenied(true);
      setShaking(true);
      setTimeout(() => setShaking(false), 420);
      setPin("");
      inputRef.current?.focus();
    }
  }

  return (
    <div
      style={{
        minHeight: "100svh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--ink-4, #0c0c14)",
        fontFamily: "var(--font-mono, monospace)",
      }}
    >
      <div
        style={{
          width: 340,
          padding: 32,
          border: "1px solid rgba(243,182,31,0.3)",
          animation: shaking ? "pinshake 400ms cubic-bezier(.36,.07,.19,.97)" : undefined,
        }}
      >
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <div
            style={{
              fontFamily: "var(--font-pixel, monospace)",
              fontSize: 18,
              letterSpacing: "0.12em",
              color: "#f3b61f",
              marginBottom: 6,
            }}
          >
            TKC X
          </div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(245,240,232,0.45)",
            }}
          >
            บริษัท เทิร์นคีย์ คอมมูนิเคชั่น เซอร์วิส จำกัด (มหาชน)
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(245,240,232,0.45)",
              marginBottom: 8,
            }}
          >
            Access Code
          </div>
          <input
            ref={inputRef}
            type="password"
            autoComplete="current-password"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setDenied(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            autoFocus
            aria-label="Access code"
            aria-invalid={denied}
            style={{
              width: "100%",
              padding: "12px 14px",
              fontSize: 20,
              letterSpacing: "0.5em",
              textAlign: "center",
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${denied ? "#d45e4e" : "rgba(243,182,31,0.35)"}`,
              color: "#f5f1e8",
              outline: "none",
              fontFamily: "var(--font-mono, monospace)",
              boxSizing: "border-box",
            }}
          />
          {denied && (
            <div
              role="alert"
              style={{
                marginTop: 8,
                fontSize: 10,
                letterSpacing: "0.1em",
                color: "#d45e4e",
              }}
            >
              Access denied.
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => void submit()}
          disabled={!pin || busy}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            background: pin && !busy ? "#f3b61f" : "transparent",
            color: pin && !busy ? "#0c0c0c" : "rgba(245,240,232,0.3)",
            border: `1px solid ${pin && !busy ? "#f3b61f" : "rgba(245,240,232,0.15)"}`,
            cursor: pin && !busy ? "pointer" : "not-allowed",
            fontFamily: "var(--font-mono, monospace)",
            transition: "background 0.15s, color 0.15s",
          }}
        >
          {busy ? "Verifying…" : "Enter"}
        </button>
      </div>

      <style>{`
        @keyframes pinshake {
          10%,90%  { transform: translate3d(-1px,0,0) }
          20%,80%  { transform: translate3d(2px,0,0) }
          30%,50%,70% { transform: translate3d(-4px,0,0) }
          40%,60%  { transform: translate3d(4px,0,0) }
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
