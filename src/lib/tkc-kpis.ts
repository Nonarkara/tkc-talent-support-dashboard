/**
 * TKC Real Department KPIs — 2025
 * Source: TKC internal performance management system
 * Data extracted April 2, 2026
 */

export interface DepartmentKPI {
  deptCode: string;
  deptName: string;
  revenueTarget?: number;     // in millions THB
  gmTarget?: number;          // gross margin % target
  turnoverActual?: number;    // actual turnover rate %
  turnoverTarget?: number;    // target turnover rate %
  checkInPct?: number;        // actual check-in rate %
  avgWorkHours?: number;      // average daily work hours
  engagementTarget: number;   // always 85%
  keyKPIs: string[];          // department-specific KPIs
}

export const TKC_DEPT_KPIS: DepartmentKPI[] = [
  // Operations Division
  {
    deptCode: "NET_DEL",
    deptName: "Network Delivery",
    revenueTarget: 670,
    gmTarget: 17,
    checkInPct: 75,
    avgWorkHours: 15.92,
    engagementTarget: 85,
    keyKPIs: ["Revenue ฿670M", "GM 17%", "100% on-time delivery", "Cost reduction 5%", "Customer satisfaction 90%"],
  },
  {
    deptCode: "ENTERPRISE",
    deptName: "Data Communication (Enterprise)",
    revenueTarget: 300,
    gmTarget: 17,
    turnoverActual: 0,
    turnoverTarget: 10,
    checkInPct: 81,
    avgWorkHours: 13.78,
    engagementTarget: 85,
    keyKPIs: ["Revenue ฿300M", "GM 17%", "100% on-time delivery", "Zero turnover"],
  },
  {
    deptCode: "PUB_SAFETY",
    deptName: "Public Safety (Digital Product)",
    revenueTarget: 300,
    gmTarget: 17,
    turnoverActual: 8.51,
    turnoverTarget: 10,
    checkInPct: 66,
    avgWorkHours: 13.39,
    engagementTarget: 85,
    keyKPIs: ["Revenue ฿300M", "GM 17%", "Turnover 8.51%"],
  },
  {
    deptCode: "DIGITAL",
    deptName: "Digital Services",
    revenueTarget: 1200,
    gmTarget: 17,
    turnoverActual: 22.39,
    turnoverTarget: 10,
    checkInPct: 76,
    avgWorkHours: 14.12,
    engagementTarget: 85,
    keyKPIs: ["Revenue ฿1,200M (LARGEST)", "GM 17%", "⚠️ Turnover elevated"],
  },
  // Sales Division
  {
    deptCode: "SALES",
    deptName: "Sales & Marketing",
    revenueTarget: 3700,
    gmTarget: 17,
    turnoverActual: 0,
    turnoverTarget: 10,
    checkInPct: 66,
    avgWorkHours: 5.44,
    engagementTarget: 85,
    keyKPIs: ["PO ฿4,000M", "Revenue ฿3,700M", "GP 17%", "4+ new customers", "40% pipeline conversion"],
  },
  {
    deptCode: "BIZ_DEV",
    deptName: "Business Development",
    turnoverActual: 13.11,
    turnoverTarget: 20,
    checkInPct: 71,
    avgWorkHours: 23.58,
    engagementTarget: 85,
    keyKPIs: ["6 new solutions", "8 products/services", "PO ฿70M+", "R&D initiatives", "2 new solution demos"],
  },
  // Finance & Admin Division
  {
    deptCode: "ACCT",
    deptName: "Accounting",
    turnoverActual: 26.67,
    turnoverTarget: 35,
    checkInPct: 66,
    avgWorkHours: 17.68,
    engagementTarget: 85,
    keyKPIs: ["Revenue ฿3,700M", "Net Profit 7%", "Close books 45 days", "AP 60 days"],
  },
  {
    deptCode: "FINANCE",
    deptName: "Finance",
    turnoverActual: 0,
    turnoverTarget: 10,
    checkInPct: 68,
    avgWorkHours: 19.48,
    engagementTarget: 85,
    keyKPIs: ["Cost reduction 2%", "AP 30 days", "Quick Ratio >1", "Weekly Financial Dashboard"],
  },
  {
    deptCode: "IT",
    deptName: "IT",
    turnoverActual: 0,
    turnoverTarget: 10,
    checkInPct: 76,
    avgWorkHours: 14.25,
    engagementTarget: 85,
    keyKPIs: ["Cloud migration 20%", "2 new automation projects", "1 digital product", "Downtime <2hr/mo", "IT-Ticket resolve 90%", "Cybersecurity 60%"],
  },
  {
    deptCode: "PROCURE",
    deptName: "Procurement",
    turnoverActual: 87.80,
    turnoverTarget: 75,
    checkInPct: 66,
    avgWorkHours: 18.82,
    engagementTarget: 85,
    keyKPIs: ["Cost reduction 3%", "AP 30 days", "100% on-time procurement", "⚠️ Turnover 87.80% CRITICAL"],
  },
  {
    deptCode: "HR_ADMIN",
    deptName: "HR & GA",
    turnoverActual: 5.50,
    turnoverTarget: 10,
    checkInPct: 69,
    avgWorkHours: 23.58,
    engagementTarget: 85,
    keyKPIs: ["Empeo HRM system", "4 HRD systems (Talent, Career, Promote, Succession)", "80% skill improvement", "Cost reduction 5%", "Hiring <30 days", "Engagement 85%+"],
  },
  {
    deptCode: "CORP_ADM",
    deptName: "Org Management",
    turnoverActual: 0,
    turnoverTarget: 10,
    checkInPct: 71,
    avgWorkHours: 18.65,
    engagementTarget: 85,
    keyKPIs: ["ISO 45001:2018", "CGR 3 stars", "IR events 2+", "Corporate calendar 2025"],
  },
];

// ─── CRITICAL ALERTS from KPI data ───

export interface KPIAlert {
  deptCode: string;
  severity: "critical" | "warning" | "info";
  metric: string;
  actual: string;
  target: string;
  message: string;
  messageTh: string;
}

export function getKPIAlerts(): KPIAlert[] {
  const alerts: KPIAlert[] = [];

  for (const dept of TKC_DEPT_KPIS) {
    // Turnover alerts
    if (dept.turnoverActual !== undefined && dept.turnoverTarget !== undefined) {
      if (dept.turnoverActual > dept.turnoverTarget) {
        const severity = dept.turnoverActual > 50 ? "critical" : dept.turnoverActual > 20 ? "warning" : "info";
        alerts.push({
          deptCode: dept.deptCode,
          severity,
          metric: "Turnover",
          actual: `${dept.turnoverActual}%`,
          target: `<${dept.turnoverTarget}%`,
          message: `${dept.deptName}: turnover ${dept.turnoverActual}% exceeds target ${dept.turnoverTarget}%`,
          messageTh: `${dept.deptName}: อัตราลาออก ${dept.turnoverActual}% เกินเป้า ${dept.turnoverTarget}%`,
        });
      }
    }

    // Check-in alerts (nobody hits 90%)
    if (dept.checkInPct !== undefined && dept.checkInPct < 80) {
      alerts.push({
        deptCode: dept.deptCode,
        severity: dept.checkInPct < 70 ? "warning" : "info",
        metric: "Check-in",
        actual: `${dept.checkInPct}%`,
        target: ">90%",
        message: `${dept.deptName}: check-in rate ${dept.checkInPct}% (target 90%)`,
        messageTh: `${dept.deptName}: อัตราเช็คอิน ${dept.checkInPct}% (เป้า 90%)`,
      });
    }

    // Working hours anomaly
    if (dept.avgWorkHours !== undefined) {
      if (dept.avgWorkHours < 8) {
        alerts.push({
          deptCode: dept.deptCode,
          severity: "warning",
          metric: "Work Hours",
          actual: `${dept.avgWorkHours}h`,
          target: ">8h",
          message: `${dept.deptName}: avg ${dept.avgWorkHours} hours/day — significantly below 8-hour target`,
          messageTh: `${dept.deptName}: เฉลี่ย ${dept.avgWorkHours} ชม./วัน — ต่ำกว่าเป้า 8 ชม. อย่างมาก`,
        });
      }
      if (dept.avgWorkHours > 20) {
        alerts.push({
          deptCode: dept.deptCode,
          severity: "warning",
          metric: "Work Hours",
          actual: `${dept.avgWorkHours}h`,
          target: "8-10h",
          message: `${dept.deptName}: avg ${dept.avgWorkHours} hours/day — possible data issue or extreme overtime`,
          messageTh: `${dept.deptName}: เฉลี่ย ${dept.avgWorkHours} ชม./วัน — ข้อมูลอาจผิดหรือทำงานหนักเกินไป`,
        });
      }
    }
  }

  // Sort by severity
  const sev = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => sev[a.severity] - sev[b.severity]);

  return alerts;
}

// ─── DEPARTMENT HEALTH SCORE ───

export function getDeptHealthFromKPI(deptCode: string): {
  turnoverRisk: "low" | "medium" | "high" | "critical";
  engagementGap: number;
  checkInGap: number;
} {
  const dept = TKC_DEPT_KPIS.find((d) => d.deptCode === deptCode);
  if (!dept) return { turnoverRisk: "low", engagementGap: 0, checkInGap: 0 };

  const turnoverRisk =
    (dept.turnoverActual ?? 0) > 50 ? "critical" :
    (dept.turnoverActual ?? 0) > 20 ? "high" :
    (dept.turnoverActual ?? 0) > 10 ? "medium" : "low";

  const checkInGap = 90 - (dept.checkInPct ?? 90);

  return { turnoverRisk, engagementGap: 0, checkInGap };
}
