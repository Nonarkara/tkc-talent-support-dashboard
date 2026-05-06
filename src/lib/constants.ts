// 4C Framework — Why People Work (Dr. Non's framework)
//
// 1. 💰 Compensation → Money / Survival (hygiene — must be above threshold)
// 2. 📖 Cause → Story / Dignity (morality, meaningful challenges)
// 3. ✨ Career → Flow / Fun (growth, being in the zone)
// 4. 👥 Community → Community (belonging, support, social connection)
//
// The numbers are not truth. They are a compass.
export const CATEGORIES = {
  cause: {
    code: "cause",
    nameTh: "เรื่องราวและศักดิ์ศรี",
    nameEn: "Story & Dignity",
    color: "var(--cause)",
    colorHex: "#EF4444",
    icon: "Heart",
    description: "คนที่อยากทำสิ่งที่มีความหมายมากกว่าอยู่บ้าน — สิ่งที่เงินซื้อไม่ได้",
    descriptionEn: "People who would rather do something meaningful — what money cannot buy.",
    question: "Does this person find dignity and meaning in their work?",
    questionTh: "คนนี้พบศักดิ์ศรีและความหมายในงานไหม?",
  },
  compensation: {
    code: "compensation",
    nameTh: "เงินและความอยู่รอด",
    nameEn: "Money & Survival",
    color: "var(--compensation)",
    colorHex: "#10B981",
    icon: "Coins",
    description: "คนมีความต้องการ — ส่วนใหญ่ซื้อได้ด้วยเงิน ต้องมีเงินเพื่อความอยู่รอด",
    descriptionEn: "People have needs. Most can be fulfilled by money. The baseline for survival.",
    question: "Is compensation above the survival threshold? Is it market-competitive?",
    questionTh: "ค่าตอบแทนเกินขั้นต่ำที่จำเป็นไหม? แข่งขันกับตลาดไหม?",
  },
  career: {
    code: "career",
    nameTh: "โฟลว์และความสนุก",
    nameEn: "Flow & Fun",
    color: "var(--career)",
    colorHex: "#3B82F6",
    icon: "TrendingUp",
    description: "เมื่อคนทำสิ่งที่ชอบ มันไม่ใช่งานอีกต่อไป — Flow ทำให้งานคุ้มค่า",
    descriptionEn: "When people find what they enjoy, it's no longer work. Flow makes work worthwhile.",
    question: "Is this person in flow? Do they enjoy what they do? Would they do it for less pay?",
    questionTh: "คนนี้อยู่ใน flow ไหม? สนุกกับงานไหม?",
  },
  community: {
    code: "community",
    nameTh: "ชุมชน",
    nameEn: "Community",
    color: "var(--community)",
    colorHex: "#F59E0B",
    icon: "Users",
    description: "คนทำงานเพราะต้องการชุมชน — สุขภาพจิต ความเป็นตัวตน สัตว์สังคม",
    descriptionEn: "People work for community — mental health, personhood, social connection. We are social beings.",
    question: "Does this person feel they belong? Is their community supporting their growth?",
    questionTh: "คนนี้รู้สึกเป็นส่วนหนึ่งไหม? ชุมชนสนับสนุนการเติบโตไหม?",
  },
} as const;

export type CategoryCode = keyof typeof CATEGORIES;

// Contribution types with base points
export const CONTRIBUTION_TYPES = [
  // Career
  { code: "task_completion", categoryCode: "career", nameTh: "งานสำเร็จ", nameEn: "Task Completion", basePoints: 10 },
  { code: "skill_acquisition", categoryCode: "career", nameTh: "เรียนรู้ทักษะใหม่", nameEn: "Skill Acquisition", basePoints: 25 },
  { code: "innovation_proposal", categoryCode: "career", nameTh: "เสนอไอเดียนวัตกรรม", nameEn: "Innovation Proposal", basePoints: 50 },
  { code: "certification", categoryCode: "career", nameTh: "ได้รับใบรับรอง", nameEn: "Certification Earned", basePoints: 40 },
  // Community
  { code: "knowledge_sharing", categoryCode: "community", nameTh: "แบ่งปันความรู้", nameEn: "Knowledge Sharing", basePoints: 20 },
  { code: "cross_team_collab", categoryCode: "community", nameTh: "ทำงานข้ามทีม", nameEn: "Cross-Team Collaboration", basePoints: 30 },
  { code: "mentoring", categoryCode: "community", nameTh: "เป็นพี่เลี้ยง", nameEn: "Mentoring", basePoints: 25 },
  { code: "social_event", categoryCode: "community", nameTh: "จัดกิจกรรม", nameEn: "Social Event Organization", basePoints: 15 },
  // Cause
  { code: "process_improvement", categoryCode: "cause", nameTh: "ปรับปรุงกระบวนการ", nameEn: "Process Improvement", basePoints: 35 },
  { code: "client_impact", categoryCode: "cause", nameTh: "สร้างคุณค่าให้ลูกค้า", nameEn: "Client Impact", basePoints: 40 },
  { code: "quality_initiative", categoryCode: "cause", nameTh: "ริเริ่มด้านคุณภาพ", nameEn: "Quality Initiative", basePoints: 30 },
  // Compensation
  { code: "revenue_contribution", categoryCode: "compensation", nameTh: "สร้างรายได้", nameEn: "Revenue Contribution", basePoints: 50 },
  { code: "cost_saving", categoryCode: "compensation", nameTh: "ลดต้นทุน", nameEn: "Cost Saving", basePoints: 30 },
  { code: "reusable_component", categoryCode: "compensation", nameTh: "สร้าง Component ใช้ซ้ำ", nameEn: "Reusable Component", basePoints: 35 },
] as const;

// Level thresholds: pointsForLevel(n) = 100 * n * 1.5
export function pointsForLevel(level: number): number {
  return Math.floor(100 * level * 1.5);
}

export function getLevelFromPoints(totalPoints: number): number {
  let level = 1;
  let accumulated = 0;
  while (accumulated + pointsForLevel(level) <= totalPoints) {
    accumulated += pointsForLevel(level);
    level++;
  }
  return level;
}

export function getProgressToNextLevel(totalPoints: number): {
  currentLevel: number;
  pointsInCurrentLevel: number;
  pointsNeededForNext: number;
  progressPercent: number;
} {
  let level = 1;
  let accumulated = 0;
  while (accumulated + pointsForLevel(level) <= totalPoints) {
    accumulated += pointsForLevel(level);
    level++;
  }
  const pointsInCurrentLevel = totalPoints - accumulated;
  const pointsNeededForNext = pointsForLevel(level);
  return {
    currentLevel: level,
    pointsInCurrentLevel,
    pointsNeededForNext,
    progressPercent: Math.floor(
      (pointsInCurrentLevel / pointsNeededForNext) * 100
    ),
  };
}

// Role hierarchy
export const ROLES = ["employee", "manager", "admin"] as const;
export type UserRole = (typeof ROLES)[number];

// Badge tiers
export const BADGE_TIERS = ["bronze", "silver", "gold", "platinum"] as const;
export type BadgeTier = (typeof BADGE_TIERS)[number];

export const BADGE_TIER_COLORS: Record<BadgeTier, string> = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",
  platinum: "#E5E4E2",
};

// TKC Departments
export const TKC_DEPARTMENTS = [
  { code: "NET_ENG", nameTh: "วิศวกรรมโครงข่าย", nameEn: "Network Engineering", color: "#3B82F6" },
  { code: "SW_DEV", nameTh: "พัฒนาซอฟต์แวร์", nameEn: "Software Development", color: "#8B5CF6" },
  { code: "CYBER", nameTh: "ไซเบอร์ซีเคียวริตี้", nameEn: "Cybersecurity", color: "#EF4444" },
  { code: "SALES", nameTh: "ฝ่ายขาย", nameEn: "Sales", color: "#10B981" },
  { code: "UX", nameTh: "ออกแบบ UX/UI", nameEn: "UX/UI Design", color: "#EC4899" },
  { code: "TALENT", nameTh: "สนับสนุนบุคลากร", nameEn: "Talent Support", color: "#F59E0B" },
  { code: "PM", nameTh: "บริหารโครงการ", nameEn: "Project Management", color: "#06B6D4" },
  { code: "ADMIN_FIN", nameTh: "ธุรการและการเงิน", nameEn: "Admin & Finance", color: "#6B7280" },
] as const;
