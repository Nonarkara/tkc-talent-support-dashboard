/**
 * /tome/[employee_id]
 *
 * The Tome — a print-ready hardcover layout of one employee's full
 * institutional record. Server-rendered. Cmd-P prints to PDF. Designed
 * to be the artifact handed to the leaving employee on the day of
 * departure (the Retirement Ritual).
 *
 * Layout:
 *   page 1 — Cover (banner, name, employee code, dates of service)
 *   page 2 — Identity (full names, titles, dept, division, tenure, attributes, skills)
 *   page 3+ — The Chronicle (every check_in narrative, in chronological order)
 *   page N+ — Quests Played (project allocations as a campaign log)
 *   page N+ — Recognition (every support_action stamp)
 *   page N+ — Ascensions (vocation_changes — "the class evolved here")
 *   final — Closing page with MD signature line + Tome registry number
 *
 * Print stylesheet: A4 page size, classical book margins, serif body,
 * monospace stat blocks, geometric sans for headings. No interactive
 * elements except the "Print" button which the print stylesheet hides.
 */

import { notFound } from "next/navigation";
import { loadTome } from "@/lib/tome";
import { PrintButton } from "./PrintButton";
import "./tome.css";

type PageProps = {
  params: Promise<{ employee_id: string }>;
};

export default async function TomePage({ params }: PageProps) {
  const { employee_id } = await params;
  const tome = await loadTome(employee_id);

  if (!tome) return notFound();

  const id = tome.identity;
  const a = tome.attributes;
  const fullName = id.full_name_en ?? id.full_name_th;
  const nick = id.nickname ? ` "${id.nickname}"` : "";
  const dateRange = `${id.joined_at ? id.joined_at.slice(0, 10) : "—"} → ${id.is_active ? "present" : "—"}`;
  const tenureLine = id.tenure_years != null ? `${id.tenure_years} year${id.tenure_years === 1 ? "" : "s"} of service` : "Tenure not recorded";

  return (
    <main className="tome-root">
      <PrintButton />

      {/* Always-visible return path — the Tome opens in a new tab from
          the Roster drawer, but if a user lands here without a parent
          tab they need an explicit way out. Hidden on print. */}
      <a
        href="/command-center?screen=roster"
        className="no-print"
        style={{
          position: "fixed",
          top: 18,
          left: 18,
          zIndex: 100,
          padding: "10px 14px",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          background: "transparent",
          color: "#181816",
          border: "1px solid #181816",
          textDecoration: "none",
        }}
      >
        ← Roster
      </a>

      {/* ── Cover ─────────────────────────────────────────────── */}
      <section className="tome-page tome-cover">
        <div className="tome-cover-rule" />
        <div className="tome-cover-banner">{id.banner}</div>
        <h1 className="tome-cover-name">{fullName}{nick}</h1>
        <div className="tome-cover-thai">{id.full_name_th}</div>
        <div className="tome-cover-class">{id.archetype_label.toUpperCase()}</div>
        <div className="tome-cover-rule" />
        <div className="tome-cover-meta">
          <div>{id.title_en ?? id.title_th ?? "—"}</div>
          <div>{id.dept_name_en ?? id.dept_code ?? "—"}{id.div_code ? ` · ${id.div_code}` : ""}</div>
          <div className="tome-cover-dates">{dateRange}</div>
          <div className="tome-cover-tenure">{tenureLine}</div>
        </div>
        <div className="tome-cover-registry">{tome.registry_number}</div>
      </section>

      {/* ── Identity ──────────────────────────────────────────── */}
      <section className="tome-page tome-section">
        <h2 className="tome-section-h">Identity</h2>

        <table className="tome-table">
          <tbody>
            <tr><th>Employee code</th><td><code>{id.employee_code ?? "—"}</code></td></tr>
            <tr><th>Full name (Thai)</th><td>{id.full_name_th}</td></tr>
            <tr><th>Full name (English)</th><td>{id.full_name_en ?? "—"}</td></tr>
            <tr><th>Nickname</th><td>{id.nickname ?? "—"}</td></tr>
            <tr><th>Email</th><td>{id.email ?? "—"}</td></tr>
            <tr><th>Title</th><td>{id.title_en ?? id.title_th ?? "—"}</td></tr>
            <tr><th>Role level</th><td>{id.role_level}</td></tr>
            <tr><th>Department</th><td>{id.dept_name_en ?? id.dept_code ?? "—"}</td></tr>
            <tr><th>Division</th><td>{id.div_name_en ?? id.div_code ?? "—"}</td></tr>
            <tr><th>Joined</th><td>{id.joined_at?.slice(0, 10) ?? "—"}</td></tr>
            <tr><th>Tenure</th><td>{id.tenure_years != null ? `${id.tenure_years} year${id.tenure_years === 1 ? "" : "s"}` : "—"}</td></tr>
            <tr><th>Class</th><td>{id.archetype_label} — <em>{id.banner}</em></td></tr>
            <tr><th>Status</th><td>{id.is_active ? "Active" : "Retired"}</td></tr>
          </tbody>
        </table>

        <h3 className="tome-section-h3">Attributes</h3>
        <div className="tome-attrs">
          <Attr code="STR" label="Strength" v={a.str} />
          <Attr code="INT" label="Intellect" v={a.int} />
          <Attr code="WIS" label="Wisdom" v={a.wis} />
          <Attr code="CHA" label="Charisma" v={a.cha} />
          <Attr code="DEX" label="Dexterity" v={a.dex} />
          <Attr code="CON" label="Constitution" v={a.con} />
        </div>

        {tome.skills.length > 0 ? (
          <>
            <h3 className="tome-section-h3">Skills</h3>
            <div className="tome-tag-row">
              {tome.skills.map((s) => <span key={s} className="tome-tag">{s}</span>)}
            </div>
          </>
        ) : null}

        {(tome.languages.length > 0 || tome.certifications.length > 0 || tome.soft_skills.length > 0) ? (
          <>
            <h3 className="tome-section-h3">Profile facets</h3>
            <div className="tome-facets">
              {tome.languages.length > 0 && <FacetGroup label="Languages" values={tome.languages} />}
              {tome.certifications.length > 0 && <FacetGroup label="Certifications" values={tome.certifications} />}
              {tome.soft_skills.length > 0 && <FacetGroup label="Soft skills" values={tome.soft_skills} />}
            </div>
          </>
        ) : null}
      </section>

      {/* ── The Chronicle ─────────────────────────────────────── */}
      <section className="tome-page tome-section">
        <h2 className="tome-section-h">The Chronicle</h2>
        <p className="tome-section-deck">
          What managers wrote about {id.nickname ?? id.full_name_en ?? id.full_name_th}, in chronological order.
          Every paragraph is preserved exactly as written. The numbers are the game state, but the paragraphs are the truth.
        </p>

        {tome.chronicles.length === 0 ? (
          <p className="tome-empty">
            No chronicles yet — the next one is the first. Ask a manager to open <code>/check-in/{id.id}</code>.
          </p>
        ) : (
          <div className="tome-chronicles">
            {tome.chronicles.map((c) => (
              <article key={c.id} className="tome-chronicle">
                <header className="tome-chronicle-header">
                  <span className="tome-chronicle-cycle">{c.cycle}</span>
                  <span className="tome-chronicle-author">{c.manager_name ?? "Anonymous"}</span>
                  <span className="tome-chronicle-date">{c.created_at?.slice(0, 10)}</span>
                </header>
                <p className="tome-chronicle-body">{c.narrative || <em className="tome-empty-inline">(empty)</em>}</p>
                {c.approved_deltas && Object.keys(c.approved_deltas).length > 0 ? (
                  <footer className="tome-chronicle-deltas">
                    {Object.entries(c.approved_deltas)
                      .filter(([, v]) => Number(v) !== 0)
                      .map(([k, v]) => (
                        <span key={k} className="tome-delta">
                          {k.toUpperCase()} {Number(v) > 0 ? "+" : ""}{v}
                        </span>
                      ))}
                  </footer>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ── Quests Played ─────────────────────────────────────── */}
      <section className="tome-page tome-section">
        <h2 className="tome-section-h">Quests Played</h2>
        <p className="tome-section-deck">
          Every project allocation, in order. Each row is a fixture in the campaign — the slot they covered, the load they carried, the readiness they reached.
        </p>

        {tome.quests_played.length === 0 ? (
          <p className="tome-empty">No quests played yet.</p>
        ) : (
          <table className="tome-table tome-quests">
            <thead>
              <tr>
                <th>Code</th><th>Name</th><th>Slot</th><th>FTE</th>
                <th>Readiness</th><th>Chemistry</th><th>From</th><th>To</th>
              </tr>
            </thead>
            <tbody>
              {tome.quests_played.map((q, i) => (
                <tr key={`${q.project_code}-${q.slot_dimension}-${i}`}>
                  <td><code>{q.project_code}</code></td>
                  <td>{q.project_name}</td>
                  <td>{q.slot_dimension}</td>
                  <td>{q.fte.toFixed(2)}</td>
                  <td>{q.overall_pct ?? "—"}</td>
                  <td>{q.chemistry ?? "—"}</td>
                  <td>{q.started_at?.slice(0, 10) ?? "—"}</td>
                  <td>{q.ended_at?.slice(0, 10) ?? "present"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Recognition ───────────────────────────────────────── */}
      <section className="tome-page tome-section">
        <h2 className="tome-section-h">Recognition</h2>
        <p className="tome-section-deck">Every public stamp in the Tome.</p>

        {tome.recognitions.length === 0 ? (
          <p className="tome-empty">No recognitions yet — the next one is the first.</p>
        ) : (
          <ul className="tome-recognitions">
            {tome.recognitions.map((r) => (
              <li key={r.id}>
                <span className="tome-recog-cycle">{r.cycle}</span>
                <span className="tome-recog-type">{r.action_type.replaceAll("_", " ")}</span>
                <strong className="tome-recog-title">{r.title}</strong>
                {r.note ? <p className="tome-recog-note">{r.note}</p> : null}
                <footer className="tome-recog-foot">
                  by {r.owner_name ?? "Anonymous"} · {r.created_at?.slice(0, 10)}
                </footer>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Ascensions ────────────────────────────────────────── */}
      {tome.ascensions.length > 0 ? (
        <section className="tome-page tome-section">
          <h2 className="tome-section-h">Ascensions</h2>
          <p className="tome-section-deck">When the class evolved. Reskilling is recorded; the prior class is never deleted.</p>
          <ul className="tome-ascensions">
            {tome.ascensions.map((asc) => (
              <li key={asc.id}>
                <span className="tome-asc-date">{asc.changed_at?.slice(0, 10)}</span>
                <strong>{asc.from_label} → {asc.to_label}</strong>
                {asc.level_before != null ? <span className="tome-asc-level">at level {asc.level_before}</span> : null}
                {asc.reason ? <p className="tome-asc-reason">{asc.reason}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── Closing ───────────────────────────────────────────── */}
      <section className="tome-page tome-closing">
        <div className="tome-closing-rule" />
        <p className="tome-closing-text">
          This volume is the institutional record of a single career at <strong>The House of TKC</strong>.
          Every paragraph was written by hand. Every number was earned. Every quest was played. The
          numbers are the game state — but these pages are the truth.
        </p>
        <p className="tome-closing-text">
          On the date of retirement, this Tome is given to its subject in physical form. A digital twin
          remains in the Registry — searchable forever, so that a future manager faced with a similar
          problem can find the answer here.
        </p>
        <div className="tome-closing-sigs">
          <div className="tome-sig">
            <div className="tome-sig-line" />
            <div className="tome-sig-label">Managing Director</div>
          </div>
          <div className="tome-sig">
            <div className="tome-sig-line" />
            <div className="tome-sig-label">The Subject</div>
          </div>
        </div>
        <div className="tome-closing-rule" />
        <div className="tome-closing-registry">
          Tome registry № <strong>{tome.registry_number}</strong> · generated {tome.generated_at.slice(0, 10)}
        </div>
      </section>
    </main>
  );
}

function Attr({ code, label, v }: { code: string; label: string; v: number | null }) {
  return (
    <div className="tome-attr">
      <span className="tome-attr-code">{code}</span>
      <span className="tome-attr-value">{v ?? "—"}</span>
      <span className="tome-attr-label">{label}</span>
    </div>
  );
}

function FacetGroup({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="tome-facet-group">
      <span className="tome-facet-label">{label}</span>
      <div className="tome-tag-row">
        {values.map((v) => <span key={v} className="tome-tag">{v}</span>)}
      </div>
    </div>
  );
}
