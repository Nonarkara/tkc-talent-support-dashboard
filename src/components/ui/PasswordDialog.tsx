"use client";

/**
 * PasswordDialog — the Boss PIN prompt.
 *
 *   <PasswordDialog
 *     open={asking}
 *     onOpenChange={setAsking}
 *     onUnlock={(pin) => gate.tryUnlock(pin)}
 *   />
 *
 * Single 6-digit input, monospace, centered. Correct PIN closes;
 * wrong PIN shakes the box and prints "Access denied." No lockout
 * counter (the PIN is ceremony, not security).
 */

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Return true if the PIN matches. */
  onUnlock: (pin: string) => boolean;
}

export function PasswordDialog({ open, onOpenChange, onUnlock }: Props) {
  const [pin, setPin] = useState("");
  const [shaking, setShaking] = useState(false);
  const [denied, setDenied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const frame = requestAnimationFrame(() => {
      setPin("");
      setDenied(false);
      setShaking(false);
      inputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [open]);

  const submit = () => {
    if (onUnlock(pin)) {
      onOpenChange(false);
    } else {
      setDenied(true);
      setShaking(true);
      setTimeout(() => setShaking(false), 420);
      setPin("");
      inputRef.current?.focus();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{
          animation: shaking ? "pinshake 400ms cubic-bezier(.36,.07,.19,.97)" : undefined,
        }}
      >
        <DialogHeader>
          <DialogTitle>Boss PIN required</DialogTitle>
          <DialogDescription>
            This field has been saved to the company ledger. Enter the PIN to change it.
          </DialogDescription>
        </DialogHeader>

        <div style={{ padding: "12px 0" }}>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={6}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
              setDenied(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && pin.length === 6) submit();
            }}
            aria-label="Boss PIN"
            aria-invalid={denied}
            style={{
              width: "100%",
              padding: "12px 14px",
              fontFamily: "var(--font-mono)",
              fontSize: 24,
              letterSpacing: "0.6em",
              textAlign: "center",
              background: "rgba(6,10,27,0.6)",
              border: `1px solid ${denied ? "#d45e4e" : "rgba(243,197,103,0.3)"}`,
              color: "var(--dq-ink)",
              outline: "none",
            }}
          />
          {denied && (
            <div
              role="alert"
              style={{
                marginTop: 8,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "#d45e4e",
                letterSpacing: "0.06em",
              }}
            >
              Access denied — changes are locked.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pin.length !== 6}>
            Unlock
          </Button>
        </DialogFooter>

        <style>{`@keyframes pinshake{
          10%,90%{transform:translate3d(-1px,0,0)}
          20%,80%{transform:translate3d(2px,0,0)}
          30%,50%,70%{transform:translate3d(-4px,0,0)}
          40%,60%{transform:translate3d(4px,0,0)}
        }`}</style>
      </DialogContent>
    </Dialog>
  );
}
