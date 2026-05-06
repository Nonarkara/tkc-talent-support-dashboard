"use client";

import { useEffect } from "react";

export default function PrintReportPage() {
  // Auto-trigger print dialog when the tab opens
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        html, body {
          background: #ffffff;
          color: #1a1209;
          font-family: 'IBM Plex Sans Thai', 'Noto Sans Thai', sans-serif;
        }

        /* ── Print layout ── */
        @page {
          size: A4;
          margin: 2.2cm 2cm 2cm 2cm;
        }

        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .page-break { page-break-before: always; }
        }

        /* ── Typography scale ── */
        .t-title    { font-size: 17pt; font-weight: 700; line-height: 1.3; }
        .t-subtitle { font-size: 13pt; font-weight: 600; line-height: 1.4; }
        .t-section  { font-size: 11pt; font-weight: 600; line-height: 1.5; }
        .t-body     { font-size: 10pt; font-weight: 400; line-height: 1.7; }
        .t-caption  { font-size: 9pt;  font-weight: 400; line-height: 1.5; color: #5a4530; }
        .t-mono     { font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 9pt; }

        /* ── Layout ── */
        .page { max-width: 680px; margin: 0 auto; padding: 28px 0; }
        .section-block { margin-bottom: 24px; }

        /* ── Header bar ── */
        .doc-header {
          border-bottom: 2.5px solid #1a1209;
          padding-bottom: 16px;
          margin-bottom: 20px;
          text-align: center;
        }
        .org-name {
          font-size: 10pt;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: #3d2e1e;
          margin-bottom: 12px;
        }

        /* ── Info table ── */
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .info-table td {
          padding: 5px 8px;
          font-size: 10pt;
          vertical-align: top;
          border: 1px solid #d4c8b8;
        }
        .info-table td:first-child {
          font-weight: 600;
          width: 38%;
          background: #f5f0e8;
          white-space: nowrap;
        }

        /* ── Section header ── */
        .section-header {
          font-size: 11pt;
          font-weight: 700;
          border-left: 4px solid #1a1209;
          padding-left: 10px;
          margin: 20px 0 10px;
          line-height: 1.4;
        }

        /* ── Numbered list ── */
        .deliverable-list { margin: 0; padding-left: 0; list-style: none; }
        .deliverable-list li {
          display: flex;
          gap: 12px;
          padding: 6px 0;
          border-bottom: 1px solid #e8e0d4;
          font-size: 10pt;
          align-items: flex-start;
        }
        .deliverable-list li:last-child { border-bottom: none; }
        .deliverable-no {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9pt;
          color: #7a6b54;
          min-width: 28px;
          padding-top: 1px;
        }

        /* ── Screen table ── */
        .screen-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9.5pt;
          margin-bottom: 16px;
        }
        .screen-table th {
          background: #1a1209;
          color: #f5f0e8;
          padding: 7px 10px;
          text-align: left;
          font-weight: 600;
        }
        .screen-table td {
          padding: 6px 10px;
          border: 1px solid #d4c8b8;
          vertical-align: top;
          line-height: 1.5;
        }
        .screen-table tr:nth-child(even) td { background: #faf7f2; }
        .screen-key {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9pt;
          font-weight: 700;
          color: #3d2e1e;
        }

        /* ── Accept checklist ── */
        .accept-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9.5pt;
          margin-bottom: 16px;
        }
        .accept-table th {
          background: #1a1209;
          color: #f5f0e8;
          padding: 7px 10px;
          text-align: left;
          font-weight: 600;
        }
        .accept-table td {
          padding: 6px 10px;
          border: 1px solid #d4c8b8;
          vertical-align: middle;
          line-height: 1.5;
        }
        .accept-table tr:nth-child(even) td { background: #faf7f2; }
        .check-cell {
          text-align: center;
          font-size: 13pt;
          color: #1a1209;
        }

        /* ── Architecture table ── */
        .arch-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9.5pt;
          margin-bottom: 16px;
        }
        .arch-table th {
          background: #3d2e1e;
          color: #f5f0e8;
          padding: 7px 10px;
          text-align: left;
          font-weight: 600;
        }
        .arch-table td {
          padding: 6px 10px;
          border: 1px solid #d4c8b8;
          vertical-align: top;
          line-height: 1.5;
        }
        .arch-table tr:nth-child(even) td { background: #faf7f2; }

        /* ── Signature blocks ── */
        .sig-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-top: 12px;
        }
        .sig-block {
          border-top: 1px solid #1a1209;
          padding-top: 8px;
        }
        .sig-line {
          border-bottom: 1px solid #7a6b54;
          margin: 32px 0 6px;
          height: 1px;
        }
        .sig-label { font-size: 9pt; color: #5a4530; }
        .sig-title { font-size: 9.5pt; font-weight: 600; margin-top: 4px; }
        .sig-date { font-size: 9pt; color: #5a4530; margin-top: 4px; }

        /* ── URL reference ── */
        .url-box {
          border: 1.5px solid #1a1209;
          padding: 10px 16px;
          background: #f5f0e8;
          margin: 12px 0;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9.5pt;
        }

        /* ── No-print hint ── */
        .print-hint {
          position: fixed;
          top: 16px;
          right: 16px;
          background: #1a1209;
          color: #f5f0e8;
          padding: 12px 20px;
          font-size: 11px;
          font-family: monospace;
          z-index: 100;
          border: 1px solid #D4A843;
        }
      `}</style>

      {/* Screen-only print hint */}
      <div className="no-print print-hint">
        กำลังเปิด Print dialog…<br />
        <span style={{ opacity: 0.7, fontSize: 10 }}>Save as PDF → A4</span>
      </div>

      <div className="page">

        {/* ══ DOCUMENT HEADER ══ */}
        <div className="doc-header">
          <div className="org-name">
            Talent Knowledge Collaborative
          </div>
          <h1 className="t-title" style={{ marginBottom: 4 }}>
            รายงานสรุปขอบเขตงานและการตรวจรับงาน
          </h1>
          <h2 className="t-subtitle" style={{ fontWeight: 400, fontSize: "11pt" }}>
            ที่จ้างเรียบร้อยแล้ว
          </h2>
        </div>

        {/* ══ CONTRACT DETAILS TABLE ══ */}
        <div className="section-block">
          <table className="info-table">
            <tbody>
              <tr>
                <td>ผู้ว่าจ้าง</td>
                <td>Talent Knowledge Collaborative</td>
              </tr>
              <tr>
                <td>ผู้รับจ้าง</td>
                <td>นน อัครประเสริฐกุล</td>
              </tr>
              <tr>
                <td>ชื่อโครงการ</td>
                <td>
                  ระบบสนับสนุนและพัฒนาทรัพยากรมนุษย์ TKC Digital Twin
                  (Talent Transformation Engine)
                </td>
              </tr>
              <tr>
                <td>วันที่เริ่มสัญญา</td>
                <td>17 เมษายน 2569</td>
              </tr>
              <tr>
                <td>วันที่ส่งมอบงาน</td>
                <td>6 พฤษภาคม 2569</td>
              </tr>
              <tr>
                <td>มูลค่างาน</td>
                <td>
                  <span
                    style={{
                      display: "inline-block",
                      minWidth: 200,
                      borderBottom: "1px solid #7a6b54",
                    }}
                  >
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                  </span>{" "}
                  บาท
                </td>
              </tr>
              <tr>
                <td>ลิงก์ระบบ (Live URL)</td>
                <td>
                  <span className="t-mono">
                    https://tkc-digital-twin.fly.dev/command-center
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ══ 1. วัตถุประสงค์ ══ */}
        <div className="section-block">
          <div className="section-header">1. วัตถุประสงค์</div>
          <p className="t-body">
            รายงานฉบับนี้จัดทำขึ้นเพื่อสรุปขอบเขตงานที่ผู้รับจ้างได้ดำเนินการพัฒนา
            ระบบสนับสนุนและพัฒนาทรัพยากรมนุษย์ของTalent Knowledge Collaborative
            (TKC Digital Twin) ให้แล้วเสร็จตามขอบเขตที่ตกลงไว้
            โดยระบบที่พัฒนาขึ้นเป็นแพลตฟอร์มดิจิทัลสำหรับการบริหารและพัฒนาบุคลากร
            ผ่านกลไกการจัดการทีมแบบ Gamification เพื่อให้ผู้บริหารสามารถมองเห็น
            ศักยภาพ การจัดสรรทรัพยากรบุคคล และสุขภาพขององค์กรได้ในมุมมองเดียว
            บนระบบที่ทำงานแบบออนไลน์ตลอดเวลา
          </p>
        </div>

        {/* ══ 2. ขอบเขตการดำเนินงาน ══ */}
        <div className="section-block">
          <div className="section-header">2. ขอบเขตการดำเนินงานที่ส่งมอบ</div>
          <ul className="deliverable-list">
            {[
              {
                no: "01",
                text: "ระบบ Command Center ออนไลน์ (8 หน้าจอ) — เข้าถึงได้ที่ tkc-digital-twin.fly.dev",
              },
              {
                no: "02",
                text: "ฐานข้อมูล PostgreSQL บน Cloud (Singapore) — 28 ตาราง ข้อมูลพนักงาน 348 คน",
              },
              {
                no: "03",
                text: "ระบบ Google Sheets Shadow Mirror — 20 แท็บ sync อัตโนมัติ",
              },
              {
                no: "04",
                text: "Game Engine — ระบบคะแนน ICA Index, Credo Score, HP/MP/XP",
              },
              {
                no: "05",
                text: "Formation Engine — ระบบจัดทีมพร้อมทำนายคะแนนทีมและ Budget Cap (Moneyball)",
              },
              {
                no: "06",
                text: "Ninja Squad Engine — ระบบประเมินความพร้อม Squad สำหรับโปรเจกต์",
              },
              {
                no: "07",
                text: "Capability Matrix — Heatmap ทักษะเทียบกับความต้องการโปรเจกต์แบบ real-time",
              },
              {
                no: "08",
                text: "The Tome Printer — ระบบพิมพ์ประวัติการทำงานพนักงานเมื่อครบวาระ (Retirement Ritual)",
              },
              {
                no: "09",
                text: "Obsidian Export Engine — ส่งออกข้อมูลทีมและพนักงานไปยัง Knowledge Base โดยอัตโนมัติ (348 dossiers)",
              },
              {
                no: "10",
                text: "Daily Briefing System — รายงานสรุปอัจฉริยะรายวันสร้างขึ้นโดยอัตโนมัติ",
              },
            ].map((item) => (
              <li key={item.no}>
                <span className="deliverable-no">{item.no}</span>
                <span className="t-body">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ══ 3. รายละเอียดระบบ — 8 หน้าจอ ══ */}
        <div className="section-block">
          <div className="section-header">3. รายละเอียดระบบที่พัฒนา — หน้าจอ Command Center</div>
          <table className="screen-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>KEY</th>
                <th style={{ width: "28%" }}>ชื่อหน้าจอ</th>
                <th>หน้าที่</th>
              </tr>
            </thead>
            <tbody>
              {[
                { key: "C", th: "ห้องควบคุม (Cockpit)", desc: "KPI ภาพรวมองค์กร, Four Pillars, GitHub Pulse, Flow Distribution" },
                { key: "F", th: "จัดทีม (Formation)", desc: "Drag-and-drop จัดทีมบน felt mat, Budget Cap, คะแนนเคมีทีม, ทำนายความพร้อม" },
                { key: "N", th: "สกวอด (Ninja)", desc: "Candidate matching, skill-gap analysis, mission configuration" },
                { key: "M", th: "แมทริกซ์ (Matrix)", desc: "Heatmap ทักษะองค์กรเทียบกับความต้องการโปรเจกต์" },
                { key: "R", th: "รายชื่อฮีโร่ (Roster)", desc: "บัตรพนักงาน 348 คน พร้อม pixel avatar และ stat sheet" },
                { key: "S", th: "สัญญาณ (Signals)", desc: "ประวัติการส่ง deployment, เปรียบ prediction vs ผลจริง (feedback loop)" },
                { key: "L", th: "โลบบี้ (Lobby)", desc: "โลก check-in real-time — pixel characters เดินในแผนที่องค์กร" },
                { key: "G", th: "บัญชีระบบ (Ledger)", desc: "Admin console — Sheets health, Game Balance, Obsidian export, audit log" },
              ].map((row) => (
                <tr key={row.key}>
                  <td><span className="screen-key">[{row.key}]</span></td>
                  <td>{row.th}</td>
                  <td>{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ══ 4. สถาปัตยกรรมระบบ ══ */}
        <div className="section-block">
          <div className="section-header">4. สถาปัตยกรรมระบบ</div>
          <table className="arch-table">
            <thead>
              <tr>
                <th style={{ width: "30%" }}>ชั้น</th>
                <th style={{ width: "35%" }}>เทคโนโลยี</th>
                <th>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {[
                { layer: "Frontend Framework", tech: "Next.js 16 + React 19", note: "TypeScript 5, Tailwind v4" },
                { layer: "Application Server", tech: "Fly.io (Singapore region)", note: "Auto-sleep on idle, always-on URL" },
                { layer: "Primary Database", tech: "Neon PostgreSQL (serverless)", note: "28 tables, Singapore region" },
                { layer: "Shadow Mirror", tech: "Google Sheets (20 tabs)", note: "fire-and-forget sync architecture" },
                { layer: "Knowledge Export", tech: "Obsidian Vault", note: "348 hero dossiers + daily briefing" },
                { layer: "Commit Intelligence", tech: "GitHub API", note: "7d/28d pulse, 5-min cache" },
                { layer: "Pixel Art Engine", tech: "HTML5 Canvas (procedural)", note: "32×32 sprites, 260k combinations" },
              ].map((row) => (
                <tr key={row.layer}>
                  <td>{row.layer}</td>
                  <td className="t-mono">{row.tech}</td>
                  <td>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ══ 5. ผลการตรวจรับงาน ══ */}
        <div className="section-block">
          <div className="section-header">5. ผลการตรวจรับงาน</div>
          <table className="accept-table">
            <thead>
              <tr>
                <th style={{ width: "5%" }}>#</th>
                <th style={{ width: "55%" }}>รายการตรวจรับ</th>
                <th style={{ width: "15%", textAlign: "center" }}>ตรวจรับ</th>
                <th>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {[
                { item: "ระบบ Command Center เข้าถึงได้ผ่าน URL จริง (live URL)", note: "ทดสอบได้ที่ tkc-digital-twin.fly.dev" },
                { item: "ฐานข้อมูลทำงานได้ปกติ — บันทึกและเรียกข้อมูลพนักงาน 348 คน", note: "" },
                { item: "Google Sheets Mirror แสดงข้อมูลถูกต้อง — 20 แท็บ sync", note: "" },
                { item: "Game Engine คำนวณคะแนน ICA, Credo, HP/MP/XP ได้ถูกต้อง", note: "" },
                { item: "Formation Engine จัดทีมได้ พร้อม Budget Cap และ chemistry score", note: "" },
                { item: "Capability Matrix แสดง heatmap ทักษะ vs ความต้องการ", note: "" },
                { item: "The Tome Printer พิมพ์ประวัติพนักงานได้ครบถ้วน", note: "" },
                { item: "Obsidian Export ส่งออก dossier พนักงานได้ครบ 348 คน", note: "" },
                { item: "Daily Briefing System สร้างรายงานรายวันอัตโนมัติได้", note: "" },
                { item: "ระบบรองรับการใช้งานบน smartphone (mobile-responsive)", note: "" },
              ].map((row, i) => (
                <tr key={i}>
                  <td style={{ textAlign: "center" }} className="t-mono">
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <td>{row.item}</td>
                  <td className="check-cell">✓</td>
                  <td className="t-caption">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ══ 6. การยืนยัน ══ */}
        <div className="section-block">
          <div className="section-header">6. การยืนยันการส่งมอบงาน</div>
          <p className="t-body">
            ผู้รับจ้างขอรับรองว่าได้ดำเนินการพัฒนาและส่งมอบระบบสนับสนุนและพัฒนาทรัพยากรมนุษย์
            TKC Digital Twin ครบถ้วนตามขอบเขตงานที่ระบุไว้ในรายงานฉบับนี้
            โดยระบบสามารถเข้าถึงและใช้งานได้จริงผ่านลิงก์ที่ระบุ
            ณ วันที่ 6 พฤษภาคม 2569 และพร้อมส่งมอบให้แก่ผู้ว่าจ้างเพื่อการตรวจรับและนำไปใช้งานต่อไป
          </p>
        </div>

        {/* ══ PAGE BREAK ══ */}
        <div className="page-break" />

        {/* ══ 7. ลายเซ็นต์ ══ */}
        <div className="section-block" style={{ marginTop: 40 }}>
          <div className="section-header">7. ลายเซ็นต์และการอนุมัติ</div>

          <div className="sig-grid">
            {/* Contractor */}
            <div className="sig-block">
              <div className="t-section" style={{ marginBottom: 6 }}>
                ผู้ส่งมอบงาน (ผู้รับจ้าง)
              </div>
              <div className="sig-line" />
              <div className="sig-title">นน อัครประเสริฐกุล</div>
              <div className="sig-label" style={{ marginTop: 4 }}>
                ตำแหน่ง: ที่ปรึกษา
              </div>
              <div className="sig-date">
                วันที่: ________________
              </div>
            </div>

            {/* TKC receiver */}
            <div className="sig-block">
              <div className="t-section" style={{ marginBottom: 6 }}>
                ผู้รับมอบงาน (ผู้ว่าจ้าง)
              </div>
              <div className="sig-line" />
              <div className="sig-title">________________________________</div>
              <div className="sig-label" style={{ marginTop: 4 }}>
                ตำแหน่ง: ________________________________
              </div>
              <div className="sig-date">
                วันที่: ________________
              </div>
            </div>
          </div>

          {/* Witness */}
          <div style={{ marginTop: 36 }}>
            <div className="t-section" style={{ marginBottom: 20 }}>
              พยาน
            </div>
            <div className="sig-grid">
              <div className="sig-block">
                <div className="sig-line" />
                <div className="sig-title">________________________________</div>
                <div className="sig-label" style={{ marginTop: 4 }}>ตำแหน่ง: ________________________________</div>
                <div className="sig-date">วันที่: ________________</div>
              </div>
              <div className="sig-block">
                <div className="sig-line" />
                <div className="sig-title">________________________________</div>
                <div className="sig-label" style={{ marginTop: 4 }}>ตำแหน่ง: ________________________________</div>
                <div className="sig-date">วันที่: ________________</div>
              </div>
            </div>
          </div>
        </div>

        {/* ══ Appendix ══ */}
        <div className="section-block" style={{ marginTop: 40 }}>
          <div className="section-header">ภาคผนวก — ข้อมูลอ้างอิง</div>
          <p className="t-body" style={{ marginBottom: 8 }}>
            ลิงก์ระบบ (Live URL):
          </p>
          <div className="url-box">
            https://tkc-digital-twin.fly.dev/command-center
          </div>
          <p className="t-body" style={{ marginTop: 12, marginBottom: 8 }}>
            รายงาน e-Report ฉบับอิเล็กทรอนิกส์ (พร้อมข้อมูล live):
          </p>
          <div className="url-box">
            https://tkc-digital-twin.fly.dev/report
          </div>
          <p className="t-caption" style={{ marginTop: 16 }}>
            เอกสารนี้จัดทำโดย นน อัครประเสริฐกุล · 6 พฤษภาคม 2569
          </p>
        </div>

      </div>

      {/* ══ Back cover ══ */}
      <div
        className="page-break"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#ffffff",
          padding: "40px 20px",
        }}
      >
        <picture>
          <source srcSet="/badges/tkc-heroes-badge.webp" type="image/webp" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/badges/tkc-heroes-badge.png"
            alt="TKCx — Heroes of Alefgard"
            style={{
              width: "min(480px, 90vw)",
              height: "auto",
              imageRendering: "pixelated",
              display: "block",
            }}
          />
        </picture>
        <p
          style={{
            marginTop: 28,
            fontFamily: "'IBM Plex Sans Thai', 'Noto Sans Thai', sans-serif",
            fontSize: "8.5pt",
            color: "#8a7a60",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            textAlign: "center",
          }}
        >
          TKCx · Knowledge Collaborative v4.2 · Fluid Legend
        </p>
      </div>

    </>
  );
}
