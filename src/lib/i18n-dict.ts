/**
 * i18n dictionary — v8.1 scope: shell + nav + Lobby + CassetteBadge +
 * screen titles & decks. Tab bodies (tables, cards, detail copy)
 * stay EN this turn and migrate one tab per turn starting v8.2.
 *
 * Thai copy rules (CLAUDE.md §0):
 *  - Non-looped face only (IBM Plex Sans Thai, Noto Sans Thai, Prompt)
 *  - Modern professional phrasing, not childish or classroom
 *  - First-person instructional copy uses ผม (not ฉัน / เรา / ข้าพเจ้า)
 *    — none of that appears here yet; applies as tab bodies migrate.
 */

import type { Dict } from "./i18n";

/** Top nav buttons. */
export const NAV = {
  home: { en: "Home", th: "หน้าหลัก" } satisfies Dict,
  back: { en: "Back", th: "ย้อนกลับ" } satisfies Dict,
  menu: { en: "Menu", th: "เมนู" } satisfies Dict,
  ledger: { en: "Ledger", th: "บัญชีบริษัท" } satisfies Dict,
};

/** Keyboard shortcut legend at the bottom of the shell. */
export const SHORTCUT = {
  back: { en: "Back", th: "ย้อน" } satisfies Dict,
  home: { en: "Home", th: "หลัก" } satisfies Dict,
  menu: { en: "Menu", th: "เมนู" } satisfies Dict,
  route: { en: "Route", th: "เส้นทาง" } satisfies Dict,
};

/** Screen meta — title + deck per route. Decks stay short (one line). */
export const SCREEN = {
  home: {
    title: { en: "Boss Room", th: "ห้องผู้บริหาร" } satisfies Dict,
    deck: {
      en: "Operate the whole transformation from one board: pick a route, inspect sub-windows, and always return home.",
      th: "ควบคุมการเปลี่ยนแปลงทั้งหมดจากกระดานเดียว เลือกเส้นทาง ดูหน้าต่างย่อย และกลับมาหน้าหลักได้ทุกเมื่อ",
    } satisfies Dict,
  },
  cockpit: {
    kicker: { en: "Line C", th: "สาย C" } satisfies Dict,
    title: { en: "Company Pulse", th: "ชีพจรบริษัท" } satisfies Dict,
    deck: {
      en: "Financial tempo, support load, and active quest health in one scan.",
      th: "จังหวะการเงิน ปริมาณงานสนับสนุน และสถานะภารกิจที่ดำเนินอยู่ในมุมมองเดียว",
    } satisfies Dict,
  },
  fixture: {
    kicker: { en: "Line X", th: "สาย X" } satisfies Dict,
    title: { en: "Fixture List", th: "ตารางการแข่งขัน" } satisfies Dict,
    deck: {
      en: "Open fixtures, active matches, pending reviews, and resolved outcomes. The season never stops.",
      th: "โครงการที่รอจัดทีม ที่กำลังดำเนินอยู่ ที่รอรายงานผล และที่เสร็จสิ้นแล้ว ฤดูกาลไม่มีวันหยุด",
    } satisfies Dict,
  },
  formation: {
    kicker: { en: "Line F", th: "สาย F" } satisfies Dict,
    title: { en: "Formation Board", th: "กระดานจัดทีม" } satisfies Dict,
    deck: {
      en: "Staff live quests by fit, chemistry, morale gates, and support missions.",
      th: "จัดคนเข้าภารกิจตามความเหมาะสม เคมี ขวัญกำลังใจ และงานสนับสนุน",
    } satisfies Dict,
  },
  ninja: {
    kicker: { en: "Line N", th: "สาย N" } satisfies Dict,
    title: { en: "Ninja Squad Builder", th: "หน่วยจู่โจม" } satisfies Dict,
    deck: {
      en: "Toggle mission skills, assemble a compact strike team, and save the squad.",
      th: "เลือกทักษะภารกิจ ประกอบทีมจู่โจมขนาดเล็ก แล้วบันทึกหน่วย",
    } satisfies Dict,
  },
  matrix: {
    kicker: { en: "Line M", th: "สาย M" } satisfies Dict,
    title: { en: "TOM Matrix Lab", th: "ห้องทดสอบโครงสร้างองค์กร" } satisfies Dict,
    deck: {
      en: "Stress-test function and CoE allocations before the operating model hardens.",
      th: "ทดสอบการกระจายฟังก์ชันและ CoE ก่อนปิดโครงสร้างการดำเนินงาน",
    } satisfies Dict,
  },
  roster: {
    kicker: { en: "Line R", th: "สาย R" } satisfies Dict,
    title: { en: "Hero Roster", th: "ทำเนียบพนักงาน" } satisfies Dict,
    deck: {
      en: "Browse the full talent wall by class, department, role, and chronicle signal.",
      th: "ดูรายชื่อพนักงานทั้งหมดจำแนกตามอาชีพ แผนก ตำแหน่ง และสัญญาณจากบันทึก",
    } satisfies Dict,
  },
  signals: {
    kicker: { en: "Line S", th: "สาย S" } satisfies Dict,
    title: { en: "Risk Signals", th: "สัญญาณเตือน" } satisfies Dict,
    deck: {
      en: "Watch at-risk heroes, open support actions, and succession anchors.",
      th: "เฝ้าดูพนักงานที่มีความเสี่ยง งานสนับสนุนที่เปิดอยู่ และผู้สืบทอดหลัก",
    } satisfies Dict,
  },
  lobby: {
    kicker: { en: "Line L", th: "สาย L" } satisfies Dict,
    title: { en: "Company Lobby", th: "ล็อบบี้บริษัท" } satisfies Dict,
    deck: {
      en: "The floor in real time — clock in, clock out, and see who mingles with whom.",
      th: "พื้นที่ออฟฟิศแบบเรียลไทม์ ลงเวลาเข้า-ออก และดูว่าใครพบปะกับใคร",
    } satisfies Dict,
  },
  ledger: {
    kicker: { en: "Line G", th: "สาย G" } satisfies Dict,
    title: { en: "Company Ledger", th: "บัญชีกลางบริษัท" } satisfies Dict,
    deck: {
      en: "Google Sheets mirror status — every save flows through this pipe.",
      th: "สถานะการเชื่อมต่อ Google Sheets ทุกการบันทึกไหลผ่านท่อนี้",
    } satisfies Dict,
  },
  insights: {
    kicker: { en: "Line A", th: "สาย A" } satisfies Dict,
    title: { en: "Insights Lab", th: "ห้องวิเคราะห์ข้อมูล" } satisfies Dict,
    deck: {
      en: "Eight live analytics from the May 2026 dossier — succession map, cert decay, gender ladder, school pedigree, birthday clock, archetype mix, attribute curves, ghost calendar.",
      th: "วิเคราะห์ข้อมูลพนักงาน 320 คนจากเอกสารชุด พฤษภาคม 2569 — แผนผังอายุ-อายุงาน ปฏิทินใบรับรองหมดอายุ บันไดความหลากหลายทางเพศ สถานศึกษา ปฏิทินวันเกิด การกระจาย archetype กราฟ attribute และเดือนที่คนลาออก",
    } satisfies Dict,
  },
};

/** Lobby labels. */
export const LOBBY = {
  check_in: { en: "Check In", th: "ลงเวลาเข้า" } satisfies Dict,
  check_out: { en: "Check Out", th: "ลงเวลาออก" } satisfies Dict,
  on_floor: { en: "On Floor", th: "อยู่ออฟฟิศ" } satisfies Dict,
  off_floor: { en: "Off Floor", th: "ไม่อยู่ออฟฟิศ" } satisfies Dict,
  search: { en: "Search people…", th: "ค้นหาพนักงาน…" } satisfies Dict,
  aside_title: { en: "Attendance", th: "การลงเวลา" } satisfies Dict,
};

/** CassetteBadge state labels. */
export const CASSETTE = {
  idle: { en: "idle", th: "ว่าง" } satisfies Dict,
  dirty: { en: "unsaved…", th: "ยังไม่บันทึก…" } satisfies Dict,
  saving: { en: "saving…", th: "กำลังบันทึก…" } satisfies Dict,
  saved: { en: "saved", th: "บันทึกแล้ว" } satisfies Dict,
  queued: { en: "queued", th: "รอคิว" } satisfies Dict,
  error: { en: "sync error", th: "บันทึกไม่สำเร็จ" } satisfies Dict,
};

/** Ledger tab labels. */
export const LEDGER = {
  setup_heading: { en: "Setup Checklist", th: "รายการเตรียมระบบ" } satisfies Dict,
  coverage_heading: { en: "Mirror Coverage", th: "การสะท้อนข้อมูล" } satisfies Dict,
  bootstrap_heading: { en: "Bootstrap", th: "เริ่มระบบ" } satisfies Dict,
  bootstrap_button: { en: "Create missing tabs", th: "สร้างแท็บที่ขาด" } satisfies Dict,
  health_ok: { en: "Healthy", th: "พร้อมใช้งาน" } satisfies Dict,
  health_error: { en: "Error", th: "ผิดพลาด" } satisfies Dict,
  health_disabled: { en: "Not configured", th: "ยังไม่ได้ตั้งค่า" } satisfies Dict,
  health_probing: { en: "Probing…", th: "กำลังตรวจสอบ…" } satisfies Dict,
  function_col: { en: "Mirror", th: "ฟังก์ชัน" } satisfies Dict,
  tab_col: { en: "Tab", th: "แท็บ" } satisfies Dict,
  trigger_col: { en: "Triggered by", th: "เรียกจาก" } satisfies Dict,
};

/** Ritual vocabulary — the seven canonical ceremonies of the House.
 *  Use these for any user-facing button or status label that
 *  semantically corresponds to a ritual. The Bible (DESIGN_BIBLE_RED_DOT.md)
 *  defines the canon. Add new rituals only by appending. */
export const RITUAL = {
  scribe_chronicle: { en: "Scribe the Chronicle", th: "บันทึกพงศาวดาร" } satisfies Dict,
  ratify_chronicle: { en: "Ratify the Chronicle", th: "รับรองพงศาวดาร" } satisfies Dict,
  lock_the_squad: { en: "Lock the Squad", th: "ปิดทีม" } satisfies Dict,
  seal_the_mission: { en: "Seal the Mission", th: "ผนึกภารกิจ" } satisfies Dict,
  stamp_the_tome: { en: "Stamp the Tome", th: "ประทับตำรา" } satisfies Dict,
  open_the_tome: { en: "Open the Tome", th: "เปิดตำรา" } satisfies Dict,
  close_the_quest: { en: "Close the Quest", th: "ปิดภารกิจ" } satisfies Dict,
  generate_briefing: { en: "Compose the Briefing", th: "เรียบเรียงรายงาน" } satisfies Dict,
};

/** Language toggle pill. */
export const TOGGLE = {
  english: { en: "EN", th: "EN" } satisfies Dict,
  thai: { en: "TH", th: "ไทย" } satisfies Dict,
  label: { en: "Language", th: "ภาษา" } satisfies Dict,
};
