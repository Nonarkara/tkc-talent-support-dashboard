"use client";

import type { ActiveAllocation } from "@/app/command-center/_shared/types";

function formatDate(value?: string | null) {
  if (!value) return "Open";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function labelForAllocation(allocation: ActiveAllocation) {
  return (
    allocation.assignment_label ||
    allocation.project_name ||
    allocation.project_code ||
    allocation.quest_title ||
    allocation.quest_code ||
    allocation.coe_name ||
    "Workshop hold"
  );
}

export function AvailabilityTimeline({
  allocations,
  nextAvailableAt,
  compact = false,
}: {
  allocations: ActiveAllocation[];
  nextAvailableAt?: string | null;
  compact?: boolean;
}) {
  if (allocations.length === 0) {
    return (
      <div
        style={{
          border: "1px solid rgba(245,240,232,0.18)",
          background: "rgba(0,0,0,0.12)",
          padding: compact ? "6px 8px" : "8px 10px",
          color: "var(--flux-up)",
          fontSize: compact ? 9 : 10,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        Open now
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: compact ? 5 : 6 }}>
      {allocations.slice(0, compact ? 2 : 5).map((allocation) => {
        const tone =
          allocation.planned_or_actual === "actual"
            ? "var(--rpg-orange)"
            : "var(--rpg-purple)";

        return (
          <div
            key={allocation.id}
            style={{
              display: "grid",
              gridTemplateColumns: compact ? "1fr auto" : "1fr auto auto",
              gap: compact ? 6 : 8,
              alignItems: "center",
              border: "1px solid rgba(245,240,232,0.18)",
              background: "rgba(0,0,0,0.12)",
              padding: compact ? "6px 8px" : "7px 10px",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: "var(--ink-0)",
                  fontSize: compact ? 10 : 11,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {labelForAllocation(allocation)}
              </div>
              <div
                style={{
                  color: "var(--ink-1)",
                  fontSize: compact ? 8 : 9,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginTop: 2,
                }}
              >
                {allocation.project_code || allocation.quest_code || allocation.coe_name || "Workshop"}
              </div>
            </div>

            <div
              style={{
                color: tone,
                fontSize: compact ? 9 : 10,
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              {Number(allocation.fte).toFixed(1)} FTE
            </div>

            {!compact ? (
              <div
                style={{
                  color: "var(--ink-1)",
                  fontSize: 9,
                  whiteSpace: "nowrap",
                  textAlign: "right",
                }}
              >
                {formatDate(allocation.start_date)} - {formatDate(allocation.end_date)}
              </div>
            ) : null}
          </div>
        );
      })}

      {nextAvailableAt ? (
        <div
          style={{
            color: "var(--ink-1)",
            fontSize: compact ? 8 : 9,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Next free: <span style={{ color: "var(--rpg-yellow)" }}>{formatDate(nextAvailableAt)}</span>
        </div>
      ) : null}
    </div>
  );
}
