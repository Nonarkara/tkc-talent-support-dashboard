/**
 * TKC Organization Structure (representative placeholder)
 * Talent Knowledge Collaborative
 *
 * 3 Divisions under MD, each led by a Deputy MD:
 * 1. Sales & Marketing (ขายและการตลาด)
 * 2. Operations (ปฏิบัติการ)
 * 3. Finance & Accounting (การเงินและบัญชี)
 */

// ─── DEPARTMENTS (real TKC) ──────────────────────────────

export interface TKCDepartment {
  code: string;
  nameTh: string;
  nameEn: string;
  divisionCode: string;
  color: string;
}

export interface TKCDivision {
  code: string;
  nameTh: string;
  nameEn: string;
  color: string;
  headTitle: string;
  headTitleTh: string;
}

// ─── ORG CHART (placeholder names) ──────────────────────
// MD: Director Alpha
// DMD (CMO): Director Alpha — Sales & Biz Dev
// DMD: Director Beta — PMO, AI CoE, Digital Services, Digital Product
// DMD (CFO): Director Gamma — Accounting, Financial
// DMD (vacant): HR&GA, Org Mgmt, Procurement, IT

export const TKC_DIVISIONS: TKCDivision[] = [
  {
    code: "CMO",
    nameTh: "สายงานขายและการตลาด",
    nameEn: "Sales & Business Dev",
    color: "#EF4444",
    headTitle: "DMD (CMO)",
    headTitleTh: "รอง กจก. สายงานขายและการตลาด",
  },
  {
    code: "TECH",
    nameTh: "สายงานเทคโนโลยีและปฏิบัติการ",
    nameEn: "Technology & Operations",
    color: "#F97316",
    headTitle: "DMD",
    headTitleTh: "รอง กจก. สายงานเทคโนโลยี",
  },
  {
    code: "CFO",
    nameTh: "สายงานการเงิน",
    nameEn: "Finance",
    color: "#3B82F6",
    headTitle: "DMD (CFO)",
    headTitleTh: "รอง กจก. สายงานการเงิน",
  },
  {
    code: "ADMIN",
    nameTh: "สายงานบริหาร",
    nameEn: "Administration",
    color: "#F59E0B",
    headTitle: "DMD",
    headTitleTh: "รอง กจก. สายงานบริหาร",
  },
];

export const TKC_REAL_DEPARTMENTS: TKCDepartment[] = [
  // CMO Division — Director Alpha
  { code: "SALES",     nameTh: "ฝ่ายขาย",           nameEn: "Sales",                divisionCode: "CMO", color: "#EF4444" },
  { code: "BIZ_DEV",   nameTh: "ฝ่ายพัฒนาธุรกิจ",    nameEn: "Business Development",  divisionCode: "CMO", color: "#F87171" },

  // Tech Division — Director Beta
  { code: "PMO",       nameTh: "สำนักบริหารโครงการ",   nameEn: "Project Management",    divisionCode: "TECH", color: "#F97316" },
  { code: "IMPL",      nameTh: "ฝ่ายติดตั้ง",         nameEn: "Implementation",        divisionCode: "TECH", color: "#FB923C" },
  { code: "ENG",       nameTh: "ฝ่ายวิศวกรรม",       nameEn: "Engineering",           divisionCode: "TECH", color: "#FBBF24" },
  { code: "AI_COE",    nameTh: "ศูนย์ AI",           nameEn: "AI CoE",               divisionCode: "TECH", color: "#A855F7" },
  { code: "DIGITAL",   nameTh: "ฝ่ายบริการดิจิทัล",   nameEn: "Digital Services",      divisionCode: "TECH", color: "#8B5CF6" },
  { code: "DIG_PROD",  nameTh: "ฝ่ายผลิตภัณฑ์ดิจิทัล", nameEn: "Digital Product",      divisionCode: "TECH", color: "#7C3AED" },

  // CFO Division — Director Gamma
  { code: "ACCT",      nameTh: "ฝ่ายบัญชี",          nameEn: "Accounting",            divisionCode: "CFO", color: "#3B82F6" },
  { code: "FINANCE",   nameTh: "ฝ่ายการเงิน",        nameEn: "Financial",             divisionCode: "CFO", color: "#60A5FA" },

  // Admin Division (DMD vacant)
  { code: "HR_GA",     nameTh: "ฝ่ายทรัพยากรบุคคลและธุรการ", nameEn: "HR & General Admin", divisionCode: "ADMIN", color: "#F59E0B" },
  { code: "ORG_MGMT",  nameTh: "ฝ่ายบริหารองค์กร",    nameEn: "Org Management",        divisionCode: "ADMIN", color: "#FBBF24" },
  { code: "PROCURE",   nameTh: "ฝ่ายจัดซื้อจัดจ้าง",  nameEn: "Procurement",           divisionCode: "ADMIN", color: "#D97706" },
  { code: "IT",        nameTh: "ฝ่ายเทคโนโลยีสารสนเทศ", nameEn: "IT",                 divisionCode: "ADMIN", color: "#92400E" },
];

// ─── MOCK ROSTER (realistic for TKC ~200 employees, showing 30 key people) ───

export interface TKCEmployee {
  id: string;
  nickname: string;
  seed: number;
  level: number;
  deptCode: string;
  divisionCode: string;
  role: "md" | "deputy_md" | "director" | "manager" | "senior" | "staff";
  roleTh: string;
  roleEn: string;
  tenure: number; // years at company
}

export const TKC_ROSTER: TKCEmployee[] = [
  // ─── MD ───
  { id: "md1", nickname: "Alpha",     seed: 1,    level: 20, deptCode: "EXEC",    divisionCode: "EXEC", role: "md",        roleTh: "กรรมการผู้จัดการ", roleEn: "MD", tenure: 20 },

  // ─── CMO Division — Alpha (double-hat as CMO) ───
  { id: "dm1", nickname: "Alpha",     seed: 100,  level: 18, deptCode: "SALES",   divisionCode: "CMO",  role: "deputy_md", roleTh: "รอง กจก. (CMO)", roleEn: "DMD (CMO)", tenure: 20 },
  // Sales
  { id: "s1",  nickname: "Tom",       seed: 389,  level: 9,  deptCode: "SALES",   divisionCode: "CMO",  role: "manager",   roleTh: "ผู้จัดการ", roleEn: "Sales Mgr", tenure: 7 },
  { id: "s2",  nickname: "Ryan",      seed: 1511, level: 6,  deptCode: "SALES",   divisionCode: "CMO",  role: "senior",    roleTh: "อาวุโส", roleEn: "Pre-Sales", tenure: 4 },
  { id: "s3",  nickname: "Emma",      seed: 3001, level: 4,  deptCode: "SALES",   divisionCode: "CMO",  role: "staff",     roleTh: "พนักงาน", roleEn: "Sales Rep", tenure: 2 },
  // Business Development
  { id: "bd1", nickname: "Lisa",      seed: 512,  level: 8,  deptCode: "BIZ_DEV", divisionCode: "CMO",  role: "manager",   roleTh: "ผู้จัดการ", roleEn: "BD Mgr", tenure: 6 },
  { id: "bd2", nickname: "Kevin",       seed: 3101, level: 5,  deptCode: "BIZ_DEV", divisionCode: "CMO",  role: "staff",     roleTh: "พนักงาน", roleEn: "R&D", tenure: 3 },

  // ─── TECH Division — Director Beta ───
  { id: "dm2", nickname: "Beta",      seed: 200,  level: 17, deptCode: "PMO",     divisionCode: "TECH", role: "deputy_md", roleTh: "รอง กจก.", roleEn: "DMD (Tech)", tenure: 18 },
  // PMO / Implementation / Engineering
  { id: "pm1", nickname: "David",      seed: 256,  level: 10, deptCode: "PMO",     divisionCode: "TECH", role: "manager",   roleTh: "ผู้จัดการ", roleEn: "PM Lead", tenure: 8 },
  { id: "im1", nickname: "Chris",      seed: 623,  level: 7,  deptCode: "IMPL",    divisionCode: "TECH", role: "senior",    roleTh: "อาวุโส", roleEn: "Project Eng", tenure: 5 },
  { id: "im2", nickname: "Amy",       seed: 1622, level: 6,  deptCode: "IMPL",    divisionCode: "TECH", role: "staff",     roleTh: "พนักงาน", roleEn: "Site Sup", tenure: 3 },
  { id: "en1", nickname: "Mark",      seed: 42,   level: 12, deptCode: "ENG",     divisionCode: "TECH", role: "director",  roleTh: "ผู้อำนวยการ", roleEn: "Dir. Engineering", tenure: 10 },
  { id: "en2", nickname: "Jake",      seed: 1289, level: 7,  deptCode: "ENG",     divisionCode: "TECH", role: "senior",    roleTh: "อาวุโส", roleEn: "Network Spec", tenure: 4 },
  // AI CoE
  { id: "ai1", nickname: "Diana",      seed: 137,  level: 11, deptCode: "AI_COE",  divisionCode: "TECH", role: "manager",   roleTh: "ผู้จัดการ", roleEn: "AI Lead", tenure: 9 },
  { id: "ai2", nickname: "Brian",      seed: 1178, level: 8,  deptCode: "AI_COE",  divisionCode: "TECH", role: "senior",    roleTh: "อาวุโส", roleEn: "ML Engineer", tenure: 6 },
  // Digital Services (Cloud, ERP, Cyber, Call Center/NOC/MA)
  { id: "ds1", nickname: "Nicole",       seed: 2066, level: 11, deptCode: "DIGITAL", divisionCode: "TECH", role: "manager",   roleTh: "ผู้จัดการ", roleEn: "Digital Svc Mgr", tenure: 8 },
  { id: "ds2", nickname: "Rachel",      seed: 734,  level: 6,  deptCode: "DIGITAL", divisionCode: "TECH", role: "staff",     roleTh: "พนักงาน", roleEn: "Cloud Eng", tenure: 3 },
  { id: "ds3", nickname: "Alex",       seed: 1400, level: 5,  deptCode: "DIGITAL", divisionCode: "TECH", role: "staff",     roleTh: "พนักงาน", roleEn: "Cyber Analyst", tenure: 2 },
  { id: "ds4", nickname: "Eric",       seed: 1955, level: 9,  deptCode: "DIGITAL", divisionCode: "TECH", role: "senior",    roleTh: "อาวุโส", roleEn: "ERP Specialist", tenure: 7 },
  // Digital Product
  { id: "dp1", nickname: "Nut",       seed: 4001, level: 7,  deptCode: "DIG_PROD",divisionCode: "TECH", role: "manager",   roleTh: "ผู้จัดการ", roleEn: "Product Mgr", tenure: 4 },

  // ─── CFO Division — Director Gamma ───
  { id: "dm3", nickname: "Gamma",  seed: 300,  level: 15, deptCode: "FINANCE", divisionCode: "CFO",  role: "deputy_md", roleTh: "รอง กจก. (CFO)", roleEn: "DMD (CFO)", tenure: 14 },
  { id: "f1",  nickname: "Helen",      seed: 1067, level: 8,  deptCode: "ACCT",    divisionCode: "CFO",  role: "manager",   roleTh: "ผู้จัดการ", roleEn: "Acct Mgr", tenure: 6 },
  { id: "f2",  nickname: "Frank",      seed: 956,  level: 5,  deptCode: "FINANCE", divisionCode: "CFO",  role: "staff",     roleTh: "พนักงาน", roleEn: "Financial Analyst", tenure: 3 },

  // ─── ADMIN Division (DMD vacant) ───
  { id: "hr1", nickname: "Grace",       seed: 845,  level: 7,  deptCode: "HR_GA",   divisionCode: "ADMIN", role: "manager",  roleTh: "ผู้จัดการ", roleEn: "HR Mgr", tenure: 5 },
  { id: "hr2", nickname: "Julia",      seed: 1733, level: 5,  deptCode: "HR_GA",   divisionCode: "ADMIN", role: "staff",    roleTh: "พนักงาน", roleEn: "HR Staff", tenure: 2 },
  { id: "om1", nickname: "Leo",       seed: 3301, level: 4,  deptCode: "ORG_MGMT",divisionCode: "ADMIN", role: "staff",    roleTh: "พนักงาน", roleEn: "Org Analyst", tenure: 1 },
  { id: "pc1", nickname: "Peter",      seed: 1844, level: 4,  deptCode: "PROCURE", divisionCode: "ADMIN", role: "staff",    roleTh: "พนักงาน", roleEn: "Procurement", tenure: 2 },
  { id: "it1", nickname: "Sam",       seed: 2177, level: 6,  deptCode: "IT",      divisionCode: "ADMIN", role: "senior",   roleTh: "อาวุโส", roleEn: "IT Senior", tenure: 4 },
  { id: "it2", nickname: "Daniel",       seed: 3201, level: 4,  deptCode: "IT",      divisionCode: "ADMIN", role: "staff",    roleTh: "พนักงาน", roleEn: "IT Support", tenure: 1 },
];

// ─── PROJECTS (mapped to real divisions) ───

export interface TKCProject {
  id: string;
  name: string;
  client: string;
  divisionCode: string;
  deptCode: string;
  priority: "critical" | "high" | "medium" | "low";
  progressPct: number;
  // Financial (from meeting: "18% GM minimum")
  budgetThb?: number;        // project budget in THB
  monthlyCeiling?: number;   // monthly salary cap for team (THB)
  grossMarginPct?: number;   // target/actual gross margin
  // Required skills for Moneyball team composition
  requiredSkills?: string[]; // e.g. ["NET_DEL", "CYBER", "PM"]
  teamSize?: number;         // recommended team size
}

export const TKC_REAL_PROJECTS: TKCProject[] = [
  // 5G Ambulance ภาคใต้: heavy tech, some outsource to vendors
  { id: "p1", name: "5G Ambulance ภาคใต้", client: "NT",     divisionCode: "TECH", deptCode: "ENG",      priority: "critical", progressPct: 42, budgetThb: 2_000_000, grossMarginPct: 15, requiredSkills: ["ENG", "PMO", "DIGITAL"], teamSize: 5 },
  // IoT สนามบิน: sensors + vendor coordination
  { id: "p7", name: "IoT สนามบิน",       client: "AOT",      divisionCode: "TECH", deptCode: "IMPL",     priority: "medium",   progressPct: 30, budgetThb: 4_500_000, grossMarginPct: 22, requiredSkills: ["IMPL", "DIGITAL", "ENG"], teamSize: 4 },
  // Cyber มหาดไทย: deep tech + government presentations
  { id: "p4", name: "Cyber มหาดไทย",     client: "MOI",      divisionCode: "TECH", deptCode: "DIGITAL",  priority: "critical", progressPct: 0, budgetThb: 32_000_000, grossMarginPct: 12, requiredSkills: ["DIGITAL", "AI_COE", "PMO"], teamSize: 6 },
  // DC Phase 2: all in-house execution
  { id: "p6", name: "DC Phase 2",        client: "TKC",      divisionCode: "TECH", deptCode: "DIGITAL",  priority: "medium",   progressPct: 70, budgetThb: 8_500_000, grossMarginPct: 25, requiredSkills: ["DIGITAL", "ENG"], teamSize: 4 },
  // Cloud Migration: tech + client hand-holding
  { id: "p8", name: "Cloud Migration",   client: "SCB",      divisionCode: "TECH", deptCode: "DIGITAL",  priority: "high",     progressPct: 60, budgetThb: 12_000_000, grossMarginPct: 20, requiredSkills: ["DIGITAL", "PMO"], teamSize: 5 },
  // Smart City PKT: presentation-heavy, multi-dept
  { id: "p2", name: "Smart City PKT",    client: "ภูเก็ต",   divisionCode: "CMO",  deptCode: "BIZ_DEV",  priority: "high",     progressPct: 25, budgetThb: 25_000_000, grossMarginPct: 18, requiredSkills: ["BIZ_DEV", "DIGITAL", "SALES"], teamSize: 5 },
  // Smart Hospital: integration project
  { id: "p3", name: "Smart Hospital",    client: "BRH",      divisionCode: "CMO",  deptCode: "BIZ_DEV",  priority: "high",     progressPct: 10, budgetThb: 15_000_000, grossMarginPct: 19, requiredSkills: ["BIZ_DEV", "DIGITAL"], teamSize: 4 },
  // EduTech: soft-skill heavy, light tech
  { id: "p5", name: "EduTech",           client: "Intl Sch", divisionCode: "CMO",  deptCode: "SALES",    priority: "medium",   progressPct: 55, budgetThb: 3_500_000, grossMarginPct: 28, requiredSkills: ["SALES", "DIG_PROD"], teamSize: 3 },
];

// ─── HELPERS ───

export function getDivision(code: string): TKCDivision | undefined {
  return TKC_DIVISIONS.find((d) => d.code === code);
}

export function getDepartment(code: string): TKCDepartment | undefined {
  return TKC_REAL_DEPARTMENTS.find((d) => d.code === code);
}

export function getDivisionMembers(roster: TKCEmployee[], divisionCode: string): TKCEmployee[] {
  return roster.filter((e) => e.divisionCode === divisionCode && e.role !== "md");
}

export function getDeptColor(code: string): string {
  return TKC_REAL_DEPARTMENTS.find((d) => d.code === code)?.color ?? TKC_DIVISIONS.find((d) => d.code === code)?.color ?? "#888";
}
