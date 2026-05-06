"use client";

/**
 * SquadTray — the top-rail strip showing who's currently in the squad.
 *
 * Up to 8 chips. Each chip is the picked employee's sprite, nickname,
 * and a small "×" to remove them. An empty-state placeholder invites
 * the boss to pick from the candidate list below.
 *
 * The tray never triggers a write to the DB by itself — it's a
 * client-side array until the user hits "Save as Ninja Quest". That's
 * the atomic moment the Sheets mirror fires.
 */

import { PixelSprite } from "@/components/PixelSprite";
import { getVariation, inferGender } from "@/lib/sprite-variation";
import { getArchetype, ARCHETYPE_LABEL } from "@/lib/token-economy";
import type { Employee } from "../_shared/types";

export const MAX_SQUAD = 8;

export function SquadTray({
  members,
  onRemove,
  onSave,
  saving,
  canSave,
  title,
  onTitleChange,
}: {
  members: Employee[];
  onRemove: (id: string) => void;
  onSave: () => void;
  saving: boolean;
  canSave: boolean;
  title: string;
  onTitleChange: (title: string) => void;
}) {
  return (
    <div
      className="cc-squad-tray"
      style={{
        border: "1px solid var(--border-subtle)",
        background: "var(--ink-4)",
        padding: "10px 12px",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 12,
        alignItems: "center",
      }}
    >
      <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink-1)",
          }}
        >
          <span style={{ color: "var(--rpg-purple, #8B6FB5)", fontWeight: 700 }}>
            Squad Tray
          </span>
          <span>·</span>
          <span>
            {members.length}/{MAX_SQUAD} picked
          </span>
        </div>

        {/* Chip row — horizontal scroll if they fill it. */}
        {members.length === 0 ? (
          <div
            style={{
              fontSize: 11,
              color: "var(--ink-2)",
              padding: "8px 2px",
              fontStyle: "italic",
            }}
          >
            Pick warriors from the list below — click the ＋ on any candidate.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            {members.map((emp) => (
              <TrayChip key={emp.id} emp={emp} onRemove={() => onRemove(emp.id)} />
            ))}
          </div>
        )}

        {/* Mission title — required for save. */}
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Name this mission… (e.g. 'Q2 Procurement Blitz')"
          style={{
            background: "transparent",
            border: "none",
            borderBottom: "1px solid var(--ink-2)",
            color: "var(--ink-0)",
            padding: "4px 0",
            fontFamily: "inherit",
            fontSize: 13,
            outline: "none",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderBottomColor = "var(--rpg-purple, #8B6FB5)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderBottomColor = "var(--ink-2)";
          }}
        />
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={!canSave || saving}
        style={{
          padding: "10px 16px",
          background: canSave && !saving ? "var(--rpg-purple, #8B6FB5)" : "var(--ink-3)",
          color: canSave && !saving ? "var(--ink-4)" : "var(--ink-1)",
          border: "none",
          cursor: canSave && !saving ? "pointer" : "not-allowed",
          fontFamily: "inherit",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {saving ? "Saving…" : "Save as Ninja Quest →"}
      </button>
    </div>
  );
}

function TrayChip({ emp, onRemove }: { emp: Employee; onRemove: () => void }) {
  const archetype = getArchetype(emp);
  return (
    <div
      title={`${emp.display_name} · ${ARCHETYPE_LABEL[archetype]}`}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px 4px 4px",
        background: "rgba(139,111,181,0.12)",
        border: "1px solid rgba(139,111,181,0.5)",
      }}
    >
      <PixelSprite archetype={archetype} gender={inferGender(emp.id, emp.full_name_en ?? emp.full_name_th, emp.nickname, emp.title_en)} size={20} seed={emp.id} />
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--ink-0)",
          maxWidth: 120,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {emp.display_name}
      </span>
      <button
        type="button"
        onClick={onRemove}
        title="Remove from squad"
        style={{
          background: "transparent",
          border: "none",
          color: "var(--ink-1)",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 13,
          lineHeight: 1,
          padding: 2,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--rpg-red)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--ink-1)";
        }}
      >
        ×
      </button>
    </div>
  );
}
