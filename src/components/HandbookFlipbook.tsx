"use client";

/**
 * HandbookFlipbook — the cassette's Player's Handbook, paginated.
 *
 * Page-flipping web reincarnation of the bilingual TKC X Player's
 * Handbook (docs/TKC_HANDBOOK.md, v2.0). Styled after:
 *
 *   • Championship Manager Italia '95 (Domark, 1995)
 *     — red section banners, two-column instructional voice,
 *       score-bleed margin running down the page edges.
 *   • Dragon Warrior III "Explorer's Handbook" (Enix America, 1991)
 *     — parchment cream stock, painted vignettes, "Picture N — caption"
 *       framing, status-icon colour key.
 *   • Championship Manager 01/02 hex-watermark cover-tag.
 *
 * Twelve spreads cover the manual's spine: covers, contents, story,
 * archetypes, attributes, lobby, task filing, team assembly, the cycle,
 * tactics, Alltrades, the PMO watcher, the endless game. Each spread
 * shows the EN and ไทย paragraphs paired (bilingual edition — read
 * either column; both say the same thing).
 *
 * Navigation:
 *   • Prev / Next buttons (always visible, plainly labelled)
 *   • Keyboard ← → arrows
 *   • Page indicator "p N / 12" in bottom-right corner
 *   • Click on a TOC row to jump (page 2)
 *
 * House style enforced — no rounded corners, no gradients, no
 * decorative shadows. The parchment is solid colour. The score-bleed
 * margin is just text in a column.
 */

import { useCallback, useEffect, useState } from "react";

// ─── STYLE CONSTANTS (declared first so SPREADS JSX can reference) ─

const PARCHMENT = "#f5ead0"; // cream cardstock
const INK_DARK = "#231a0f";
const BANNER_RED = "#9f2e2e"; // CM-95 banner colour

const thStyle: React.CSSProperties = {
  textAlign: "left",
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  padding: "6px 8px",
  fontWeight: 700,
};

// ─── PAGE CONTENT ───────────────────────────────────────────────
//
// Each spread is one entry. Content is hard-typed JSX so it ships
// in the bundle (no markdown parser dep, no fs read).

type Spread = {
  kicker: string;      // "§3 · Line of the manual"
  title_en: string;
  title_th: string;
  body: React.ReactNode;
};

const SPREADS: Spread[] = [
  // ── PAGE 0 · COVER ────────────────────────────────────────────
  {
    kicker: "Manual ed. v2.0 · for ROM v4.6 \"Pulse\"",
    title_en: "TKC X · Player's Handbook",
    title_th: "คู่มือผู้เล่น ฉบับสมบูรณ์",
    body: (
      <div style={{ display: "grid", gap: 18, justifyItems: "center", padding: "24px 12px 0" }}>
        <div style={{ textAlign: "center", color: "var(--text-secondary)", lineHeight: 1.7 }}>
          <p style={{ fontSize: 14, color: "var(--accent-gold)", fontWeight: 700, letterSpacing: "0.06em" }}>
            &ldquo;It&rsquo;s the most important game of your career.&rdquo;
          </p>
          <p style={{ fontSize: 12, marginTop: 8 }}>
            &ldquo;เกมที่สำคัญที่สุดในอาชีพของผม&rdquo;
          </p>
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.16em", textTransform: "uppercase", textAlign: "center" }}>
          Bilingual · สองภาษา
          <br />May 2026 · พ.ค. 2569
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-secondary)", textAlign: "center", maxWidth: 360, lineHeight: 1.6 }}>
          <p>The cassette in your hand is a working operating system for a 320-hero kingdom. Read this before you spend a single Capacity Point.</p>
          <p style={{ marginTop: 8 }}>cassette ในมือของผม คือระบบปฏิบัติการของอาณาจักรที่มีวีรบุรุษ ๓๒๐ คน อ่านก่อนใช้แต้ม</p>
        </div>
      </div>
    ),
  },

  // ── PAGE 1 · CONTENTS ─────────────────────────────────────────
  {
    kicker: "Contents · สารบัญ",
    title_en: "What's in this handbook",
    title_th: "เนื้อหาภายในเล่ม",
    body: (
      <div style={{ padding: "0 6px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, color: "var(--text-primary)" }}>
          <thead>
            <tr style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-subtle)" }}>
              <th style={thStyle}>§</th>
              <th style={thStyle}>English</th>
              <th style={thStyle}>ไทย</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Spread</th>
            </tr>
          </thead>
          <tbody>
            <TocRow n="0" en="A note before play" th="หมายเหตุก่อนเริ่ม" spread="2" />
            <TocRow n="1" en="The kingdom of TKCX" th="อาณาจักร TKCX" spread="3" />
            <TocRow n="2" en="The seven heroes" th="เจ็ดวีรบุรุษ" spread="4" />
            <TocRow n="3" en="Six attributes" th="หกค่าพลัง" spread="5" />
            <TocRow n="4" en="The buildings & lobby" th="อาคาร & ล็อบบี้" spread="6" />
            <TocRow n="5" en="Filing a task" th="ลงทะเบียนภารกิจ" spread="7" />
            <TocRow n="6" en="Assembling a team" th="จัดทีม" spread="8" />
            <TocRow n="7" en="The cycle" th="หนึ่งรอบ" spread="9" />
            <TocRow n="8" en="Tactics & traps" th="กลยุทธ์และกับดัก" spread="10" />
            <TocRow n="9" en="The PMO watcher" th="ผู้สังเกตการณ์ PMO" spread="11" />
            <TocRow n="10" en="The endless game" th="เกมที่ไม่มีจบ" spread="12" />
          </tbody>
        </table>
        <div style={{ marginTop: 18, padding: 12, border: "1px solid var(--accent-gold)", background: "rgba(212,168,67,0.06)" }}>
          <div style={{ fontSize: 10, color: "var(--accent-gold)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>
            How to enjoy · วิธีอ่าน
          </div>
          <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.65 }}>
            Read §1 through §4 in order before you sit at the cassette. They are the rules. Save §5 onward for when you have heroes on the floor.
          </p>
          <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.7 }}>
            อ่าน §1–§4 ตามลำดับ ก่อนนั่งหน้า cassette เพราะนี่คือกติกาของเกม ส่วน §5 เป็นต้นไป ค่อยอ่านตอนที่ผมมีวีรบุรุษอยู่หน้าจอแล้ว
          </p>
        </div>
      </div>
    ),
  },

  // ── PAGE 2 · NOTE BEFORE PLAY ─────────────────────────────────
  {
    kicker: "§0 · Note before play",
    title_en: "Five things to accept",
    title_th: "ห้าข้อที่ต้องยอมรับ",
    body: (
      <BilingualList items={[
        { en: "The numbers are a compass, not a verdict.", th: "ตัวเลขเป็นเข็มทิศ ไม่ใช่คำพิพากษา" },
        { en: "Every action writes twice — Postgres + Sheets.", th: "ทุกการกระทำเขียนสองชั้น — Postgres + Sheets" },
        { en: "Speed of play matters. Most loops resolve in seconds.", th: "ความเร็วของเกมสำคัญ loop ส่วนใหญ่จบในไม่กี่วินาที" },
        { en: "There is no win screen. Like Sim City, like Animal Crossing.", th: "ไม่มีหน้าจอชัยชนะ เหมือน Sim City เหมือน Animal Crossing" },
        { en: "You are not playing alone. Other directors are picking too.", th: "ผมไม่ได้เล่นคนเดียว director คนอื่นก็เลือกอยู่" },
      ]} />
    ),
  },

  // ── PAGE 3 · KINGDOM OF TKCX ──────────────────────────────────
  {
    kicker: "§1 · The kingdom",
    title_en: "TKCX is publicly listed",
    title_th: "TKCX อยู่ในตลาดหลักทรัพย์",
    body: (
      <>
        <Para
          en="TKCX is a publicly listed kingdom of 320 heroes in Bangkok. The kingdom earns gold (THB) by accepting quests from other kingdoms — engineering work, network builds, integration services. Each quest pays per month. Every completed quest moves the kingdom's chair a little higher."
          th="TKCX คืออาณาจักรจดทะเบียนในตลาดหลักทรัพย์ มีวีรบุรุษ ๓๒๐ คน ตั้งอยู่ในกรุงเทพฯ อาณาจักรหาเงินทอง (บาท) ด้วยการรับภารกิจจากอาณาจักรอื่นๆ — งานวิศวกรรม งานเครือข่าย งานเชื่อมต่อระบบ ภารกิจแต่ละชิ้นจ่ายเป็นรายเดือน ทุกภารกิจที่ทำสำเร็จจะดันเก้าอี้ของอาณาจักรให้สูงขึ้นนิดหนึ่ง"
        />
        <Caption text="Picture 1 — Six buildings, six functions. · ภาพ ๑ — หกอาคาร หกหน้าที่" />
        <PixelArt lines={[
          "TKCX TOWER (HQ) — most heroes work here · อาคารใหญ่",
          "SITE / DC RACK — Ops + Tech on rotation · ไซต์",
          "CLIENT-EMBEDDED DESK — Scout + Sales · โต๊ะลูกค้า",
          "REMOTE WFH — clocked in, off-floor · ทำงานทางไกล",
          "ALLTRADES ABBEY — vocation change · วิหาร",
          "PMO WATCHTOWER — the four tiles · หอ PMO",
        ]} />
        <Subhead en="The five tensions" th="ห้าความตึงเครียด" />
        <BilingualList items={[
          { en: "Business is matrix, structure is silo.", th: "ธุรกิจแบบ matrix แต่โครงสร้างเป็น silo" },
          { en: "Revenue is project-based, knowledge doesn't compound.", th: "รายได้แบบโครงการ ความรู้ไม่สะสม" },
          { en: "Talent exists, no capability engine.", th: "มีคนเก่ง แต่ไม่มีเครื่องจักร" },
          { en: "Speed collides with governance.", th: "ความเร็วชนกับธรรมาภิบาล" },
          { en: "Innovation is initiative, not engine.", th: "นวัตกรรมเป็นกิจกรรม ไม่ใช่เครื่องจักร" },
        ]} />
      </>
    ),
  },

  // ── PAGE 4 · SEVEN HEROES ─────────────────────────────────────
  {
    kicker: "§2 · Class description",
    title_en: "The seven heroes",
    title_th: "เจ็ดวีรบุรุษ",
    body: (
      <>
        <Para
          en="Every hero belongs to one of seven archetypes. Names follow Famicom Dragon Quest III canon. The first five are the canonical party; Fighter and Goof-Off are intentionally rare on the floor."
          th="วีรบุรุษทุกคนอยู่ใน archetype หนึ่งจากเจ็ดแบบ ชื่อตาม Famicom Dragon Quest III ต้นฉบับ ห้าแบบแรกคือทีมประจำ Fighter และ Goof-Off ใช้น้อยกว่า"
        />
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginTop: 10 }}>
          <thead>
            <tr style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-subtle)" }}>
              <th style={thStyle}>Class</th>
              <th style={thStyle}>DQ3 name</th>
              <th style={thStyle}>HR-facing</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Native slot</th>
            </tr>
          </thead>
          <tbody>
            <HeroRow cls="Captain" dq="Hero" hr="Strategic Generalist" slot="Sales / Marketing" />
            <HeroRow cls="Tech" dq="Wizard" hr="Technical Specialist" slot="Technical" />
            <HeroRow cls="Sales" dq="Merchant" hr="Commercial Lead" slot="Sales / Marketing" />
            <HeroRow cls="Ops" dq="Soldier" hr="Delivery Specialist" slot="Outsourcing / Paperwork" />
            <HeroRow cls="Scout" dq="Pilgrim" hr="Cross-functional Analyst" slot="balanced 0.6–0.7" />
            <HeroRow cls="Fighter" dq="Fighter" hr="Junior IC (agile)" slot="Technical" />
            <HeroRow cls="Goof-Off" dq="Goof-Off" hr="Wildcard Personality" slot="none cleanly" />
          </tbody>
        </table>
        <Callout
          en="The class names above are the cassette's playful internal labels. Payroll, KPIs, and performance reviews use the HR-facing column."
          th="ชื่อคลาสด้านบนเป็นชื่อเล่นภายในของ cassette เงินเดือน KPI และการประเมินผลใช้คอลัมน์ HR"
        />
      </>
    ),
  },

  // ── PAGE 5 · SIX ATTRIBUTES ───────────────────────────────────
  {
    kicker: "§3 · Character attributes",
    title_en: "Six attributes",
    title_th: "หกค่าพลัง",
    body: (
      <>
        <Para
          en="Every hero carries six base attributes (1–20). Read them on the Tome. The HR-facing names sit beside the DQ3 letters."
          th="วีรบุรุษทุกคนมีค่าพลังพื้นฐานหกตัว (1–20) ดูได้ใน Tome ชื่อสำหรับ HR วางคู่กับตัวอักษร DQ3"
        />
        <AttrRow tag="STR" hr="Execution" en="Throughput, getting things done." th="กำลัง การส่งมอบ" />
        <AttrRow tag="INT" hr="Analysis" en="Reasoning, depth." th="สติปัญญา การคิดวิเคราะห์" />
        <AttrRow tag="WIS" hr="Judgment" en="Long experience, knowing when to slow down." th="ปัญญา รู้ว่าควรช้าลงเมื่อใด" />
        <AttrRow tag="CHA" hr="Influence" en="Client-charmer, not the architect." th="เสน่ห์ คนที่ลูกค้าชอบ" />
        <AttrRow tag="DEX" hr="Adaptability" en="Speed under change." th="คล่องตัว ความเร็วเมื่อสิ่งต่างๆ เปลี่ยน" />
        <AttrRow tag="CON" hr="Stamina" en="The attribute that keeps a hero standing through a three-day cutover." th="ความอึด ที่ทำให้ยืนได้สามวันคืน" />
        <Subhead en="Derived signals" th="สัญญาณรอง" />
        <PixelArt lines={[
          "HP = 30 + CON × 4         (max 100)",
          "MP = 30 + WIS × 4         (max 100)",
          "Form = 30-day momentum    (0.0 — 10.0)",
        ]} />
      </>
    ),
  },

  // ── PAGE 6 · BUILDINGS & LOBBY ────────────────────────────────
  {
    kicker: "§4 · The lobby",
    title_en: "Read the floor, not the org chart",
    title_th: "อ่านพื้น ไม่ใช่อ่าน org chart",
    body: (
      <>
        <Para
          en="The Lobby is the social atom of the game. Open it before assembling a team. Open it again after the cycle ends. Every checked-in hero walks around as a 16×16 sprite, pulled toward others by five invisible lines."
          th="Lobby คือหน่วยทางสังคมพื้นฐานที่สุดของเกม เปิดดูก่อนจัดทีม เปิดดูอีกครั้งหลังจบรอบ วีรบุรุษทุกคนที่เช็คอินจะเดินไปมาเป็นสไปรท์ขนาด 16×16 ดึงเข้าหากันด้วยเส้นที่มองไม่เห็นห้าแบบ"
        />
        <Caption text="Picture 5 — Read the floor, not the org chart. · ภาพ ๕ — อ่านพื้น ไม่ใช่ org chart" />
        <Subhead en="Five invisible lines (strongest first)" th="ห้าเส้นเชื่อม (แรงที่สุดก่อน)" />
        <BilingualList items={[
          { en: "1. Profession — same archetype", th: "๑. อาชีพ — archetype เดียวกัน" },
          { en: "2. Workplace team — same active project", th: "๒. ทีมโครงการ — โครงการเดียวกัน" },
          { en: "3. Org group — same department", th: "๓. แผนก — แผนกเดียวกัน" },
          { en: "4. Friendship — high interaction frequency", th: "๔. มิตรภาพ — เจอกันบ่อย" },
          { en: "5. Personal — opt-in, HR-recorded only", th: "๕. ส่วนตัว — HR บันทึก ต้องยินยอม" },
        ]} />
        <Callout
          en="Lobby physics never infers a personal relationship from interaction frequency alone. Data sources: badge taps, calendar, bot punches. Not used: webcam, GPS, keystroke, email content. PDPA · Singapore region."
          th="Lobby ไม่อนุมาน 'ความสัมพันธ์ส่วนตัว' จากความถี่ของการพบเจอเพียงอย่างเดียว แหล่งข้อมูล: บัตรเข้าออก ปฏิทิน บอท ไม่ใช้: เว็บแคม GPS keystroke เนื้อหาอีเมล PDPA · เซิร์ฟเวอร์สิงคโปร์"
        />
      </>
    ),
  },

  // ── PAGE 7 · FILING A TASK ────────────────────────────────────
  {
    kicker: "§5 · Filing a task",
    title_en: "Six fields, then lock",
    title_th: "หกฟิลด์ แล้วล็อค",
    body: (
      <>
        <Para
          en="Before a team plays, a task must be filed. In TKCX, tasks are projects — quests the kingdom has accepted for baht. A filed project carries six fields. Once Saved, all six lock."
          th="ก่อนทีมเล่นได้ ต้องมีภารกิจที่ลงทะเบียนแล้ว ใน TKCX ภารกิจคือโครงการ — งานที่อาณาจักรรับมา โครงการที่ลงทะเบียนแล้วมีฟิลด์หกตัว เมื่อ Save แล้ว ทั้งหกล็อค"
        />
        <PixelArt lines={[
          "1. NAME           5G IoT Pilot — Phase 1",
          "2. SLOT BOM       tech × 3, sales × 1, mkt × 1, paper × 1",
          "3. PRIORITY WTS   {tech:5, sales:2, mkt:1, paper:2}  sum=10",
          "4. DURATION       3 months  (drives the Gantt)",
          "5. REVENUE        ฿6M total, ฿2M/month",
          "6. MARGIN TARGET  25%  (default)",
        ]} />
        <Subhead en="The 10× rule" th="กฎ ๑๐ เท่า" />
        <Para
          en="Project annual revenue must be ≥ 10 × the team's annual cost. A team at the full ฿200k/month cap costs ฿2.4M/year — the project must generate ≥ ฿24M/year. Below that, the math doesn't work."
          th="รายได้ต่อปีของโครงการต้องเป็นอย่างน้อย ๑๐ เท่าของต้นทุนทีมต่อปี ทีมที่ใช้ cap เต็ม ฿200k/เดือน จะมีต้นทุน ฿2.4M/ปี โครงการต้องสร้างรายได้ ≥ ฿24M/ปี ต่ำกว่านั้น math ไม่ผ่าน"
        />
      </>
    ),
  },

  // ── PAGE 8 · ASSEMBLING A TEAM ────────────────────────────────
  {
    kicker: "§6 · Assembling a team",
    title_en: "The two-sided puzzle",
    title_th: "ปริศนาสองด้าน",
    body: (
      <>
        <Para
          en="A team is a set of assignments — pairings of (employee, slot dimension, party row, FTE). The Fit Matrix scores each pairing; readiness scores the whole set."
          th="ทีมคือชุดของ assignment — คู่ (พนักงาน, มิติช่อง, แถวการจัดวาง, FTE) Fit Matrix ให้คะแนนแต่ละคู่ readiness ให้คะแนนทั้งทีม"
        />
        <Subhead en="The salary cap" th="เพดานค่าจ้าง" />
        <Callout
          en="Project monthly billing ÷ 10 = monthly team salary cap. 1 CP = ฿1,000/month. A ฿200k cap is 200 CP of team payroll."
          th="ค่ารายเดือนของโครงการ ÷ ๑๐ = เพดานเงินเดือนทีม 1 CP = ฿1,000/เดือน เพดาน ฿200k คือ ๒๐๐ CP"
        />
        <Subhead en="Party order — front, mid, back" th="แถวการจัดวาง — หน้า กลาง หลัง" />
        <Para
          en="Captain in row 1 + Scout in row 3 = +5 chemistry bonus. Cheapest five points in the game."
          th="กัปตันแถวที่ ๑ + นักสำรวจแถวที่ ๓ = โบนัส chemistry +๕ ห้าคะแนนถูกที่สุดในเกม"
        />
        <Subhead en="Readiness formula" th="สูตรความพร้อม" />
        <PixelArt lines={[
          "readiness = coverage    × 0.40",
          "          + quality     × 0.25",
          "          + party_split × 0.05",
          "          + chemistry   × 0.15",
          "          + morale      × 0.15",
        ]} />
      </>
    ),
  },

  // ── PAGE 9 · THE CYCLE ────────────────────────────────────────
  {
    kicker: "§7 · The cycle",
    title_en: "One week, five fixed events",
    title_th: "หนึ่งสัปดาห์ ห้าเหตุการณ์",
    body: (
      <>
        <PixelArt lines={[
          "MON 09:00  ▶ SPRINT LOCK    Formation closes for the cycle.",
          "                            ผังทีมถูกล็อคสำหรับรอบนี้",
          "",
          "TUE–THU    Work executes; Lobby + Chronicle keep humming.",
          "           ทำงานจริง Lobby กับบันทึกส่งเสียงอยู่ตลอด",
          "",
          "FRI 16:00  ▶ SPRINT REVIEW  Outcomes recorded.",
          "                            บันทึกผลลัพธ์",
        ]} />
        <Subhead en="The feedback loop — the killer feature" th="วงจรป้อนกลับ — ฟีเจอร์ฆ่า" />
        <PixelArt lines={[
          "  1. PREDICT  →  2. DEPLOY  →  3. RECORD ACTUALS",
          "                                       ↓",
          "  5. UPDATE PRIORS  ←  4. COMPARE (gap = actual − predicted)",
        ]} />
        <Para
          en="The gap is where learning lives. A team deployed without an outcome is a dead card on the table."
          th="ช่องว่างคือที่ที่การเรียนรู้เกิดขึ้น ทีมที่ส่งออกแล้วแต่ไม่มีผลลัพธ์ คือไพ่ที่ตายอยู่บนโต๊ะ"
        />
      </>
    ),
  },

  // ── PAGE 10 · TACTICS & TRAPS ─────────────────────────────────
  {
    kicker: "§8 · Tactics",
    title_en: "Five traps that cost real points",
    title_th: "ห้ากับดักที่เสียคะแนนจริง",
    body: (
      <>
        <BilingualList items={[
          { en: "1. Groupthink — same archetype + similar OCEAN = brittle under stress.", th: "๑. groupthink — archetype เดียวกัน เปราะใต้ความเครียด" },
          { en: "2. Under-tasked stars — Captain at 50% on low priority is rotting.", th: "๒. ดาวเด่นถูกใช้ต่ำ — กัปตัน ๕๐% บนงานไม่สำคัญ คือดาวกำลังเหี่ยว" },
          { en: "3. Hidden flight risk — low Compensation + high Career = 6 months from quitting.", th: "๓. ความเสี่ยงลาออกที่ซ่อน — ๖ เดือนถึงจะลาออก" },
          { en: "4. Captain-only optimisation — pick the 2nd-best Captain sometimes.", th: "๔. optimise แต่กัปตัน — ลองคนที่สอง" },
          { en: "5. Storming-stage panic — week-1 friction is normal (Tuckman).", th: "๕. ตื่นตระหนกช่วง storming — friction สัปดาห์แรกปกติ" },
        ]} />
        <Subhead en="The 80% rule" th="กฎ ๘๐%" />
        <Callout
          en="A fleet at 100% utilisation skipping maintenance destroys the fleet in two years. People are no different. Aim every team for ~80%. Slack is what lets you say *yes* to next month's surprise project."
          th="กองรถบรรทุกที่ใช้ ๑๐๐% และข้ามการซ่อมบำรุง พังภายในสองปี คนก็เหมือนกัน เล็งที่ ~๘๐% เผื่อช่องว่างไว้ ช่องว่างทำให้ผมตอบ 'ได้' กับโครงการเซอร์ไพรส์เดือนหน้า"
        />
      </>
    ),
  },

  // ── PAGE 11 · THE PMO WATCHER ─────────────────────────────────
  {
    kicker: "§9 · The PMO",
    title_en: "What the watcher sees",
    title_th: "สิ่งที่ผู้สังเกตการณ์มอง",
    body: (
      <>
        <Para
          en="Every kingdom has a watcher. In TKCX the watcher is the Project Management Office — the PMO. Picture a figure at the top of the Watchtower with a notebook. She sees the Lobby clusters before the directors can, and she sees every project bar on the Gantt go red the day before the email does."
          th="อาณาจักรทุกแห่งมีผู้สังเกตการณ์ ใน TKCX คือ PMO ภาพหญิงคนหนึ่งอยู่บนยอดหอ ถือสมุดบันทึก เธอเห็นการรวมกลุ่มใน Lobby ก่อน director ทุกคน และเห็นแถบทุกโครงการบน Gantt กลายเป็นสีแดงก่อนอีเมลของ director"
        />
        <Callout
          en="The watcher's rule: she writes nothing the directors don't already see. The PMO's job is not to surprise — it's to surface the signal directors already half-saw, before they convince themselves they imagined it."
          th="กฎของผู้สังเกตการณ์: เธอไม่บันทึกสิ่งที่ director ยังไม่เห็น หน้าที่ของ PMO ไม่ใช่ทำให้ตกใจ แต่คือปูเสื่อสัญญาณที่พวกเขาเห็นแล้วครึ่งหนึ่ง ก่อนที่จะหลอกตัวเองว่าเห็นผิด"
        />
        <Subhead en="The four tiles" th="สี่กล่อง" />
        <BilingualList items={[
          { en: "Total Projects · Active/All in 2026", th: "โครงการทั้งหมด · ทำงาน/ทั้งหมดปี 2569" },
          { en: "Project Value vs Target — ฿4.0B Base Case", th: "มูลค่าโครงการ vs เป้า — ฿4.0B Base Case" },
          { en: "Billed vs Project Value", th: "ที่เรียกเก็บ vs มูลค่าโครงการ" },
          { en: "Budget Burn Rate", th: "อัตราการใช้งบประมาณ" },
        ]} />
      </>
    ),
  },

  // ── PAGE 12 · THE ENDLESS GAME ────────────────────────────────
  {
    kicker: "§10 · The endless game",
    title_en: "There is no win condition",
    title_th: "ไม่มีเงื่อนไขชนะ",
    body: (
      <>
        <Para
          en="The cassette has no credits. There is no 'you won.' There is no 'you lost.' There is the kingdom now, the kingdom next season, and the kingdom the season after that."
          th="cassette ไม่มี ending ไม่มี 'ชนะแล้ว' ไม่มี 'แพ้แล้ว' มีแค่อาณาจักรตอนนี้ อาณาจักรฤดูกาลหน้า และอาณาจักรฤดูกาลถัดไป"
        />
        <Subhead en="The four-trend cascade" th="สี่แนวโน้มแบบน้ำตก" />
        <PixelArt lines={[
          "1. CHAIR    →  Org Grade S/A/B/C/D/F",
          "2. REVENUE  →  Project Value / Target",
          "3. BUZZ     →  Mentions, press, candidate pipeline",
          "4. SHARE    →  Slow derivative — lags by quarters",
        ]} />
        <Para
          en="Each trend leads the next by weeks or months. When all four rise in the same quarter, the kingdom is in a flywheel. Most of the time, two are up and two are down — the question is *which two*."
          th="แต่ละแนวโน้มนำหน้าตัวถัดไปเป็นสัปดาห์หรือเดือน เมื่อทั้งสี่ขึ้นพร้อมกันในไตรมาสเดียวกัน อาณาจักรอยู่ใน flywheel ส่วนใหญ่ขึ้นสอง ลงสอง คำถามคือสองอันไหน"
        />
        <Callout
          en="In Dragon Quest III, after you beat Zoma the credits roll — then you keep playing. TKCX does not even pretend to have a Zoma. Each year a new set of quests arrives. The game doesn't pause to ask 'how do you feel about that?' — it just keeps running. Stop looking for the win condition. There is none. There are only trends."
          th="ใน Dragon Quest III หลังเอาชนะ Zoma แล้ว credit ขึ้น แต่ผู้เล่นยังเล่นต่อได้ TKCX ไม่เสแสร้งว่ามี Zoma ด้วยซ้ำ แต่ละปีมีภารกิจชุดใหม่มา เกมไม่หยุดถามว่า 'รู้สึกอย่างไร' — มันแค่ทำงานต่อไป หยุดหาเงื่อนไขชนะ มันไม่มี มีแค่แนวโน้ม"
        />
      </>
    ),
  },
];

// ─── FLIPBOOK COMPONENT ──────────────────────────────────────────

export function HandbookFlipbook() {
  const [page, setPage] = useState(0);
  const total = SPREADS.length;

  const next = useCallback(() => setPage((p) => Math.min(total - 1, p + 1)), [total]);
  const prev = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);
  const goto = useCallback((p: number) => setPage(Math.max(0, Math.min(total - 1, p))), [total]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") { next(); e.preventDefault(); }
      else if (e.key === "ArrowLeft") { prev(); e.preventDefault(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // TOC page clickable — listen for custom event from the TocRow
  useEffect(() => {
    function onJump(e: Event) {
      const ce = e as CustomEvent<{ to: number }>;
      if (typeof ce.detail?.to === "number") goto(ce.detail.to);
    }
    window.addEventListener("handbook-jump", onJump as EventListener);
    return () => window.removeEventListener("handbook-jump", onJump as EventListener);
  }, [goto]);

  const spread = SPREADS[page];

  return (
    <article
      style={{
        border: "1px solid var(--border-strong, #5a4530)",
        background: PARCHMENT,
        color: INK_DARK,
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        minHeight: 540,
        position: "relative",
      }}
      aria-label="TKC Player's Handbook"
    >
      {/* Header — section banner CM-95 style */}
      <header
        style={{
          background: BANNER_RED,
          color: "#f5e6d3",
          padding: "10px 18px",
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          gap: 18,
          alignItems: "baseline",
        }}
      >
        <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#f3b61f" }}>
          {spread.kicker}
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-mono, JetBrains Mono, monospace)", color: "#fffaf0", margin: 0 }}>
          {spread.title_en}
        </h2>
        <div style={{ fontSize: 13, color: "#f3b61f", justifySelf: "end", maxWidth: 220, textAlign: "right" }}>
          {spread.title_th}
        </div>
      </header>

      {/* Body — bounded width, parchment, with score-bleed sidebars */}
      <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 32px", minHeight: 0 }}>
        <ScoreBleed side="left" />
        <div
          style={{
            padding: "20px 24px 12px",
            fontSize: 12,
            lineHeight: 1.7,
            color: INK_DARK,
            overflowY: "auto",
            maxHeight: 460,
            minHeight: 0,
            scrollbarWidth: "thin",
          }}
        >
          {spread.body}
        </div>
        <ScoreBleed side="right" />
      </div>

      {/* Footer — nav + page counter */}
      <footer
        style={{
          padding: "10px 18px",
          background: "rgba(40,28,16,0.08)",
          borderTop: "1px solid var(--border-subtle, #c9b896)",
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          gap: 12,
          alignItems: "center",
          fontSize: 11,
          color: INK_DARK,
        }}
      >
        <button
          type="button"
          onClick={prev}
          disabled={page === 0}
          aria-label="Previous page"
          style={btnStyle(page === 0)}
        >
          ◀  PREV
        </button>
        <div style={{ textAlign: "center", color: "#5a4530", letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 10 }}>
          Player&rsquo;s Handbook · คู่มือผู้เล่น · spread {page + 1} / {total}
        </div>
        <button
          type="button"
          onClick={next}
          disabled={page === total - 1}
          aria-label="Next page"
          style={btnStyle(page === total - 1)}
        >
          NEXT  ▶
        </button>
      </footer>
    </article>
  );
}

// ─── HELPERS ─────────────────────────────────────────────────────

function btnStyle(disabled: boolean): React.CSSProperties {
  return {
    border: `1px solid ${disabled ? "#b9a886" : INK_DARK}`,
    background: disabled ? "rgba(0,0,0,0.04)" : "rgba(40,28,16,0.06)",
    color: disabled ? "#a99878" : INK_DARK,
    cursor: disabled ? "default" : "pointer",
    fontFamily: "inherit",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.1em",
    padding: "6px 14px",
    textTransform: "uppercase",
  };
}

function ScoreBleed({ side }: { side: "left" | "right" }) {
  // CM-95-style score column down the page edge — fake fixture results
  // just for the visual rhythm. Same line both sides for now.
  const lines = ["4-2", "1-1", "0-3", "2-2", "5-1", "3-0", "1-2", "0-0", "2-1", "4-4", "1-3", "3-3"];
  return (
    <div
      aria-hidden="true"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "16px 0",
        background: side === "left" ? "linear-gradient(90deg, rgba(159,46,46,0.18), transparent)" : "linear-gradient(90deg, transparent, rgba(159,46,46,0.18))",
        fontFamily: "var(--font-mono, JetBrains Mono, monospace)",
        fontSize: 8,
        color: "#7a4848",
        textAlign: "center",
        letterSpacing: "0.06em",
      }}
    >
      {lines.map((l, i) => <span key={i}>{l}</span>)}
    </div>
  );
}

function TocRow({ n, en, th: thai, spread }: { n: string; en: string; th: string; spread: string }) {
  const targetIdx = Number(spread) - 1; // spread is 1-indexed in label
  return (
    <tr
      style={{ borderBottom: "1px solid rgba(40,28,16,0.10)", cursor: "pointer" }}
      onClick={() => window.dispatchEvent(new CustomEvent("handbook-jump", { detail: { to: targetIdx } }))}
    >
      <td style={{ padding: "5px 6px", color: "#9f2e2e", fontWeight: 700 }}>§{n}</td>
      <td style={{ padding: "5px 6px" }}>{en}</td>
      <td style={{ padding: "5px 6px", color: "#5a4530" }}>{thai}</td>
      <td style={{ padding: "5px 6px", textAlign: "right", fontFamily: "var(--font-mono, JetBrains Mono, monospace)", color: "#9f2e2e" }}>{spread}</td>
    </tr>
  );
}

function Para({ en, th }: { en: string; th: string }) {
  return (
    <div style={{ marginBottom: 14, lineHeight: 1.7 }}>
      <p style={{ marginBottom: 4 }}>{en}</p>
      <p style={{ fontSize: 11, color: "#5a4530" }}>{th}</p>
    </div>
  );
}

function Subhead({ en, th }: { en: string; th: string }) {
  return (
    <div style={{ marginTop: 12, marginBottom: 6, borderBottom: "1px solid rgba(40,28,16,0.18)", paddingBottom: 3 }}>
      <span style={{ fontWeight: 700, fontSize: 12, color: "#9f2e2e", textTransform: "uppercase", letterSpacing: "0.06em" }}>{en}</span>
      <span style={{ marginLeft: 10, fontSize: 11, color: "#5a4530" }}>· {th}</span>
    </div>
  );
}

function Caption({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 9, fontStyle: "italic", color: "#7a6b54", textAlign: "center", margin: "6px 0 10px", letterSpacing: "0.04em" }}>
      {text}
    </div>
  );
}

function Callout({ en, th }: { en: string; th: string }) {
  return (
    <div style={{ border: "1px solid #9f2e2e", background: "rgba(159,46,46,0.06)", padding: "10px 12px", marginTop: 10, marginBottom: 6 }}>
      <p style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.55 }}>{en}</p>
      <p style={{ fontSize: 10, color: "#5a4530", marginTop: 4, lineHeight: 1.6 }}>{th}</p>
    </div>
  );
}

function BilingualList({ items }: { items: Array<{ en: string; th: string }> }) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: "8px 0" }}>
      {items.map((it, i) => (
        <li key={i} style={{ marginBottom: 8, lineHeight: 1.6, paddingLeft: 14, position: "relative" }}>
          <span style={{ position: "absolute", left: 0, color: "#9f2e2e", fontWeight: 700 }}>▸</span>
          <div>{it.en}</div>
          <div style={{ fontSize: 10, color: "#5a4530" }}>{it.th}</div>
        </li>
      ))}
    </ul>
  );
}

function PixelArt({ lines }: { lines: string[] }) {
  return (
    <pre
      style={{
        fontFamily: "var(--font-mono, JetBrains Mono, monospace)",
        fontSize: 10,
        lineHeight: 1.5,
        color: "#3a2818",
        background: "rgba(40,28,16,0.05)",
        border: "1px solid rgba(40,28,16,0.18)",
        padding: "10px 12px",
        marginTop: 8,
        marginBottom: 10,
        whiteSpace: "pre-wrap",
        overflowX: "auto",
      }}
    >
      {lines.join("\n")}
    </pre>
  );
}

function HeroRow({ cls, dq, hr, slot }: { cls: string; dq: string; hr: string; slot: string }) {
  return (
    <tr style={{ borderBottom: "1px solid rgba(40,28,16,0.10)" }}>
      <td style={{ padding: "5px 8px", fontWeight: 700, color: "#9f2e2e" }}>{cls}</td>
      <td style={{ padding: "5px 8px", fontStyle: "italic" }}>{dq}</td>
      <td style={{ padding: "5px 8px", color: "#5a4530" }}>{hr}</td>
      <td style={{ padding: "5px 8px", textAlign: "right", fontFamily: "var(--font-mono, JetBrains Mono, monospace)", fontSize: 10 }}>{slot}</td>
    </tr>
  );
}

function AttrRow({ tag, hr, en, th }: { tag: string; hr: string; en: string; th: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "60px 100px 1fr", gap: 8, marginBottom: 6, paddingBottom: 6, borderBottom: "1px solid rgba(40,28,16,0.06)" }}>
      <div style={{ fontFamily: "var(--font-mono, JetBrains Mono, monospace)", fontWeight: 800, color: "#9f2e2e" }}>{tag}</div>
      <div style={{ fontSize: 11, color: "#5a4530" }}>{hr}</div>
      <div>
        <div style={{ fontSize: 11 }}>{en}</div>
        <div style={{ fontSize: 10, color: "#5a4530" }}>{th}</div>
      </div>
    </div>
  );
}
