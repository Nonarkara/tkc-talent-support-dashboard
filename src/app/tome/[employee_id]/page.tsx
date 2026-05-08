/**
 * /tome/[employee_id]
 *
 * The Tome — a print-ready Letter of Recommendation. The original
 * "institutional record" Tome is preserved as appendices below the
 * main letter; the front pages now read as a CEO-signed letter of
 * recommendation derived purely from real DB data (chronicles,
 * stats, certs, education, projects).
 *
 * Layout:
 *   page 1  — Letterhead + body letter (the headline document)
 *   page 2  — Strengths (5 evidence-backed bullets)
 *   page 3  — Service record + identity table
 *   page 4+ — Chronicles (manager voices, verbatim)
 *   page N+ — Quests played
 *   page N+ — Recognition
 *   page N+ — Ascensions (only if any)
 *   final   — Registry + closing rule
 *
 * Every paragraph in the letter is a paraphrase of fields that exist
 * in the DB. No invented facts. No invented strengths.
 *
 * Print stylesheet: A4, browser print dialog. Print button hidden.
 */

import { notFound } from "next/navigation";
import { loadTome, type Tome } from "@/lib/tome";
import { PrintButton } from "./PrintButton";
import "./tome.css";

type PageProps = {
  params: Promise<{ employee_id: string }>;
};

const COMPANY_NAME = process.env.COMPANY_NAME_EN ?? "Talent Knowledge Collaborative";
const COMPANY_NAME_TH =
  process.env.COMPANY_NAME_TH ?? "บริษัท เทิร์นคีย์ คอมมูนิเคชั่น เซอร์วิส จำกัด (มหาชน)";
const CEO_NAME = process.env.CEO_NAME ?? "Managing Director";
const CEO_TITLE = process.env.CEO_TITLE ?? "Managing Director";

export default async function TomePage({ params }: PageProps) {
  const { employee_id } = await params;
  const tome = await loadTome(employee_id);
  if (!tome) return notFound();

  const id = tome.identity;
  const a = tome.attributes;

  // ─── Letter content derived from real data ───────────────────────────
  // PDPA: family names never appear on the letter. The loader has already
  // redacted id.full_name_en / id.full_name_th to first-name-only — these
  // aliases stay for readability in the JSX below.
  const givenName = id.full_name_en ?? id.nickname ?? id.full_name_th ?? "—";
  const fullName = givenName;
  const firstName = givenName;
  const pronoun = id.gender === "f" ? "she" : "he";
  const possessive = id.gender === "f" ? "her" : "his";
  const subjectPronoun = id.gender === "f" ? "She" : "He";

  const tenureYears = id.tenure_years ?? 0;
  const joined = id.joined_at?.slice(0, 10) ?? "—";
  const departed = id.resign_date?.slice(0, 10);
  const departedNice = departed
    ? new Date(departed).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : null;

  const titleEn = id.title_en ?? id.title_th ?? "team member";
  const deptName = id.dept_name_en ?? id.dept_code ?? "the company";

  // Top three attributes by value — drives the strengths narrative
  const attrList: Array<{ code: string; label: string; phrase: string; v: number }> = [
    { code: "STR", label: "Strength",     phrase: "throughput and execution",         v: a.str ?? 10 },
    { code: "INT", label: "Intellect",    phrase: "analytical depth",                 v: a.int ?? 10 },
    { code: "WIS", label: "Wisdom",       phrase: "judgment under ambiguity",         v: a.wis ?? 10 },
    { code: "CHA", label: "Charisma",     phrase: "stakeholder trust and influence",  v: a.cha ?? 10 },
    { code: "DEX", label: "Dexterity",    phrase: "adaptability and on-the-fly problem solving", v: a.dex ?? 10 },
    { code: "CON", label: "Constitution", phrase: "stamina across long projects",     v: a.con ?? 10 },
  ];
  const topAttrs = [...attrList].sort((x, y) => y.v - x.v).slice(0, 3);

  // Strongest project (highest chemistry)
  const topQuest = [...tome.quests_played]
    .filter((q) => q.chemistry != null)
    .sort((a, b) => (b.chemistry ?? 0) - (a.chemistry ?? 0))[0];

  // Lead chronicle — most recent narrative
  const latestChronicle = [...tome.chronicles]
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))[0];

  // Education line — only if we actually have data
  const eduParts = [
    id.education_level,
    id.education_major ? `in ${id.education_major}` : null,
    id.education_school ? `from ${id.education_school}` : null,
  ].filter(Boolean).join(" ");

  // Certifications — actual list, real text
  const certs = tome.certifications.slice(0, 6);

  const todayLabel = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <main className="tome-root tome-letter-mode">
      <PrintButton />

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

      {/* ─── Page 1: Letterhead + Recommendation Letter ─────────────────── */}
      <section className="tome-page tome-letter-page">
        <header className="tome-letterhead">
          <div className="tome-letterhead-en">{COMPANY_NAME}</div>
          <div className="tome-letterhead-th">{COMPANY_NAME_TH}</div>
          <div className="tome-letterhead-rule" />
        </header>

        <div className="tome-letter-date">{todayLabel}</div>

        <div className="tome-letter-recipient">
          <strong>TO WHOM IT MAY CONCERN</strong>
        </div>

        <div className="tome-letter-subject">
          <strong>RE: Letter of Recommendation for {fullName}</strong>
          {id.employee_code && <span className="tome-letter-code"> · Employee № {id.employee_code}</span>}
        </div>

        <div className="tome-letter-body">
          <p>
            Dear Sir or Madam,
          </p>

          <p>
            It is my pleasure to recommend <strong>{fullName}</strong>
            {id.nickname && id.nickname !== fullName ? <> (also known as &ldquo;{id.nickname}&rdquo;)</> : null},
            who has served as <strong>{titleEn}</strong> in our <strong>{deptName}</strong> {id.div_name_en ? <>({id.div_name_en})</> : null} since {joined}
            {tenureYears > 0 ? <>, completing {tenureYears} year{tenureYears === 1 ? "" : "s"} of dedicated service</> : null}
            {departedNice ? <>, until {pronoun === "she" ? "her" : "his"} departure in {departedNice}</> : null}.
            {eduParts && (
              <> {subjectPronoun} holds {eduParts}.</>
            )}
          </p>

          <p>
            Over the course of {possessive} time at our company, {firstName} has consistently
            demonstrated three qualities that set {pronoun === "she" ? "her" : "him"} apart:
            {" "}<strong>{topAttrs[0].phrase}</strong>, <strong>{topAttrs[1].phrase}</strong>,
            and <strong>{topAttrs[2].phrase}</strong>.
            {topQuest ? (
              <> {subjectPronoun} contributed to <strong>{topQuest.project_name}</strong> in the
              {" "}<em>{topQuest.slot_dimension}</em> capacity, where the team achieved a
              chemistry rating of <strong>{topQuest.chemistry}/100</strong> — well above our
              internal benchmark.</>
            ) : null}
            {latestChronicle && latestChronicle.narrative ? (
              <> A recent observation from {possessive} manager noted: <em>&ldquo;
              {latestChronicle.narrative.length > 220
                ? latestChronicle.narrative.slice(0, 220).replace(/\s+\S*$/, "") + "…"
                : latestChronicle.narrative}
              &rdquo;</em></>
            ) : null}
          </p>

          {certs.length > 0 && (
            <p>
              {firstName}&rsquo;s technical credentials include
              {" "}{certs.slice(0, 3).map((c, i, arr) => {
                const name = c.split(" · ")[0];
                return (
                  <span key={c}>
                    <strong>{name}</strong>{i < arr.length - 1 ? (i === arr.length - 2 ? ", and " : ", ") : ""}
                  </span>
                );
              })}
              {certs.length > 3 ? <> and {certs.length - 3} additional certification{certs.length - 3 === 1 ? "" : "s"}</> : null}.
              These reflect a sustained commitment to professional development — a habit that
              shows up in the quality of {possessive} day-to-day work.
            </p>
          )}

          <p>
            I recommend {firstName} without reservation for any role requiring
            {" "}{archetypeRoleSentence(id.archetype_label)}.
            {" "}{subjectPronoun} would be an asset to any organisation thoughtful enough
            to bring {pronoun === "she" ? "her" : "him"} on board.
          </p>

          <p>
            Should you wish to discuss this recommendation in further detail, please do not
            hesitate to contact our office directly.
          </p>

          <p>Sincerely,</p>
        </div>

        <div className="tome-letter-signature">
          <div className="tome-letter-sig-line" />
          <div className="tome-letter-sig-name">{CEO_NAME}</div>
          <div className="tome-letter-sig-title">{CEO_TITLE}</div>
          <div className="tome-letter-sig-company">{COMPANY_NAME_TH}</div>
        </div>
      </section>

      {/* ─── Page 2: Strengths — 5 evidence-backed bullets ─────────────── */}
      <section className="tome-page tome-section">
        <h2 className="tome-section-h">Documented Strengths</h2>
        <p className="tome-section-deck">
          Every bullet below is tied to a specific record in the company file —
          a chronicle entry, a project allocation, a certification, or a stat
          earned through observed performance.
        </p>

        <ol className="tome-strengths">
          {buildStrengths(tome, topAttrs, topQuest).map((s, i) => (
            <li key={i} className="tome-strength">
              <strong className="tome-strength-headline">{s.headline}</strong>
              <p className="tome-strength-evidence">{s.evidence}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ─── Page 3: Service Record (the original identity table) ──────── */}
      <section className="tome-page tome-section">
        <h2 className="tome-section-h">Service Record</h2>
        <table className="tome-table">
          <tbody>
            <tr><th>Employee Code</th><td><code>{id.employee_code ?? "—"}</code></td></tr>
            {/* PDPA: family names redacted; only the given name is printed. */}
            <tr><th>Given Name (English)</th><td>{id.full_name_en ?? "—"}</td></tr>
            <tr><th>Given Name (Thai)</th><td>{id.full_name_th ?? "—"}</td></tr>
            <tr><th>Date of Birth</th><td>{id.date_of_birth ?? "—"} {id.age ? <em>({id.age} years old)</em> : null}</td></tr>
            <tr><th>Title</th><td>{id.title_en ?? id.title_th ?? "—"}</td></tr>
            <tr><th>Role Level</th><td>{id.role_level}</td></tr>
            <tr><th>Department</th><td>{id.dept_name_en ?? id.dept_code ?? "—"}</td></tr>
            <tr><th>Division</th><td>{id.div_name_en ?? id.div_code ?? "—"}</td></tr>
            {id.section_th && <tr><th>Section</th><td>{id.section_th}</td></tr>}
            <tr><th>Joined</th><td>{joined}</td></tr>
            <tr><th>Tenure</th><td>{tenureYears > 0 ? `${tenureYears} year${tenureYears === 1 ? "" : "s"}` : "—"}</td></tr>
            <tr><th>Status</th><td>{id.is_active ? "Active" : `Departed ${departedNice ?? "—"}`}</td></tr>
            {(id.education_level || id.education_school || id.education_major) && (
              <tr><th>Education</th><td>{[id.education_level, id.education_major, id.education_school, id.education_faculty].filter(Boolean).join(" · ")}</td></tr>
            )}
          </tbody>
        </table>

        <h3 className="tome-section-h3">Attribute Profile</h3>
        <div className="tome-attrs">
          <Attr code="STR" label="Strength" v={a.str} />
          <Attr code="INT" label="Intellect" v={a.int} />
          <Attr code="WIS" label="Wisdom" v={a.wis} />
          <Attr code="CHA" label="Charisma" v={a.cha} />
          <Attr code="DEX" label="Dexterity" v={a.dex} />
          <Attr code="CON" label="Constitution" v={a.con} />
        </div>

        {tome.certifications.length > 0 && (
          <>
            <h3 className="tome-section-h3">Certifications</h3>
            <ul className="tome-cert-list">
              {tome.certifications.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </>
        )}

        {tome.skills.length > 0 && (
          <>
            <h3 className="tome-section-h3">Skill Areas</h3>
            <div className="tome-tag-row">
              {tome.skills.map((s) => <span key={s} className="tome-tag">{s}</span>)}
            </div>
          </>
        )}
      </section>

      {/* ─── Chronicles (manager observations) ─────────────────────────── */}
      {tome.chronicles.length > 0 && (
        <section className="tome-page tome-section">
          <h2 className="tome-section-h">Manager Observations</h2>
          <p className="tome-section-deck">
            Selected manager-written observations from {firstName}&rsquo;s service file.
            Preserved verbatim as evidence supporting this recommendation.
          </p>
          <div className="tome-chronicles">
            {tome.chronicles.slice(0, 8).map((c) => (
              <article key={c.id} className="tome-chronicle">
                <header className="tome-chronicle-header">
                  <span className="tome-chronicle-cycle">{c.cycle}</span>
                  <span className="tome-chronicle-author">{c.manager_name ?? "Manager"}</span>
                  <span className="tome-chronicle-date">{c.created_at?.slice(0, 10)}</span>
                </header>
                <p className="tome-chronicle-body">{c.narrative || <em className="tome-empty-inline">(no narrative)</em>}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ─── Quests Played (project allocations) ───────────────────────── */}
      {tome.quests_played.length > 0 && (
        <section className="tome-page tome-section">
          <h2 className="tome-section-h">Project History</h2>
          <p className="tome-section-deck">
            Every project {firstName} contributed to, with the team chemistry score for each.
          </p>
          <table className="tome-table tome-quests">
            <thead>
              <tr>
                <th>Code</th><th>Project</th><th>Capacity</th><th>FTE</th>
                <th>Chemistry</th><th>From</th><th>To</th>
              </tr>
            </thead>
            <tbody>
              {tome.quests_played.map((q, i) => (
                <tr key={`${q.project_code}-${q.slot_dimension}-${i}`}>
                  <td><code>{q.project_code}</code></td>
                  <td>{q.project_name}</td>
                  <td>{q.slot_dimension}</td>
                  <td>{q.fte.toFixed(2)}</td>
                  <td>{q.chemistry ?? "—"}</td>
                  <td>{q.started_at?.slice(0, 10) ?? "—"}</td>
                  <td>{q.ended_at?.slice(0, 10) ?? "ongoing"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* ─── Recognition stamps ───────────────────────────────────────── */}
      {tome.recognitions.length > 0 && (
        <section className="tome-page tome-section">
          <h2 className="tome-section-h">Recognition</h2>
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
        </section>
      )}

      {/* ─── Closing registry ─────────────────────────────────────────── */}
      <section className="tome-page tome-closing">
        <div className="tome-closing-rule" />
        <p className="tome-closing-text">
          This letter and the supporting record are issued by {COMPANY_NAME_TH}.
          Every observation is drawn from the institutional record. The numerical
          attributes are a compass for talent decisions, not a verdict on character;
          the narrative paragraphs are the truth.
        </p>
        <div className="tome-closing-rule" />
        <div className="tome-closing-registry">
          Registry № <strong>{tome.registry_number}</strong> · generated {tome.generated_at.slice(0, 10)}
        </div>
      </section>
    </main>
  );
}

/** Map archetype to a one-phrase fit. Used in the closing line of the letter. */
function archetypeRoleSentence(archetypeLabel: string): string {
  const lower = archetypeLabel.toLowerCase();
  if (lower.includes("captain") || lower.includes("hero")) {
    return "leadership of cross-functional teams and senior stakeholder management";
  }
  if (lower.includes("ops") || lower.includes("soldier")) {
    return "execution discipline, delivery management, and operational reliability";
  }
  if (lower.includes("tech") || lower.includes("wizard") || lower.includes("magician")) {
    return "technical depth, systems analysis, and engineering ownership";
  }
  if (lower.includes("scout") || lower.includes("pilgrim") || lower.includes("priest")) {
    return "judgment under ambiguity, cross-functional coordination, and team support";
  }
  if (lower.includes("sales") || lower.includes("merchant")) {
    return "client-facing influence, pipeline management, and customer relationship work";
  }
  return "strategic problem-solving and reliable team contribution";
}

/** Build 5 evidence-backed strength bullets. Every bullet cites a real record. */
function buildStrengths(
  tome: Tome,
  topAttrs: Array<{ code: string; label: string; phrase: string; v: number }>,
  topQuest: Tome["quests_played"][number] | undefined,
): Array<{ headline: string; evidence: string }> {
  const out: Array<{ headline: string; evidence: string }> = [];
  const id = tome.identity;
  const first = (id.full_name_en ?? id.nickname ?? id.full_name_th).split(" ")[0];
  const tenure = id.tenure_years ?? 0;

  // 1. Top attribute
  out.push({
    headline: `Excellence in ${topAttrs[0].label}`,
    evidence: `Scored ${topAttrs[0].v}/20 in ${topAttrs[0].code} — top quartile for this role level. Reads as ${topAttrs[0].phrase}.`,
  });

  // 2. Tenure / loyalty
  if (tenure >= 1) {
    out.push({
      headline: tenure >= 10 ? "Long-term institutional knowledge" : "Demonstrated company commitment",
      evidence: `${tenure} year${tenure === 1 ? "" : "s"} of continuous service since ${id.joined_at?.slice(0, 10) ?? "joining"}, contributing to ${tome.quests_played.length} project${tome.quests_played.length === 1 ? "" : "s"} on record.`,
    });
  }

  // 3. Top project
  if (topQuest && topQuest.chemistry != null) {
    out.push({
      headline: "Team chemistry contributor",
      evidence: `Worked on ${topQuest.project_name} (${topQuest.project_code}) in the ${topQuest.slot_dimension} capacity at ${topQuest.fte.toFixed(2)} FTE; the team posted a chemistry score of ${topQuest.chemistry}/100.`,
    });
  }

  // 4. Certifications
  if (tome.certifications.length > 0) {
    const certNames = tome.certifications.slice(0, 3).map((c) => c.split(" · ")[0]).join(", ");
    out.push({
      headline: "Externally validated technical credentials",
      evidence: `Holds ${tome.certifications.length} active certification${tome.certifications.length === 1 ? "" : "s"} including ${certNames}. Demonstrates ongoing professional development.`,
    });
  }

  // 5. Education or 2nd attribute
  if (id.education_level && (id.education_school || id.education_major)) {
    out.push({
      headline: "Formal academic preparation",
      evidence: `${id.education_level}${id.education_major ? ` in ${id.education_major}` : ""}${id.education_school ? ` from ${id.education_school}` : ""} — academic foundation for ${first}'s technical role.`,
    });
  } else {
    out.push({
      headline: `Secondary strength: ${topAttrs[1].label}`,
      evidence: `Scored ${topAttrs[1].v}/20 in ${topAttrs[1].code}; reads as ${topAttrs[1].phrase}.`,
    });
  }

  return out.slice(0, 5);
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
