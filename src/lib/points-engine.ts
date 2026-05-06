import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Award points for a verified contribution.
 * Called from the API route when a manager verifies a contribution.
 */
export async function awardContributionPoints(
  contributionId: string,
  pointsOverride?: number
) {
  const supabase = createAdminClient();

  // Get contribution with type info
  const { data: contribution, error: contribError } = await supabase
    .from("contributions")
    .select("*, contribution_types(*)")
    .eq("id", contributionId)
    .single();

  if (contribError || !contribution) {
    throw new Error(`Contribution not found: ${contributionId}`);
  }

  const points =
    pointsOverride ?? contribution.contribution_types?.base_points ?? 10;

  // Insert points transaction
  const { error: pointsError } = await supabase
    .from("points_transactions")
    .insert({
      user_id: contribution.user_id,
      amount: points,
      type: "contribution",
      reference_id: contributionId,
      description_th: `ได้รับแต้มจากผลงาน: ${contribution.title}`,
      description_en: `Points from contribution: ${contribution.title}`,
    });

  if (pointsError) {
    throw new Error(`Failed to award points: ${pointsError.message}`);
  }

  return { points, userId: contribution.user_id };
}

/**
 * Award manual points from a manager to an employee.
 */
export async function awardManagerPoints(
  userId: string,
  amount: number,
  description: string,
  managerId: string
) {
  const supabase = createAdminClient();

  const { error } = await supabase.from("points_transactions").insert({
    user_id: userId,
    amount,
    type: "manager_award",
    description_th: description,
    description_en: description,
  });

  if (error) {
    throw new Error(`Failed to award manager points: ${error.message}`);
  }

  // Log activity
  await supabase.from("activity_log").insert({
    user_id: userId,
    action: "manager_award",
    entity_type: "points",
    metadata: { amount, description, awarded_by: managerId },
  });

  return { success: true };
}

/**
 * Get leaderboard data with aggregated points for a time period.
 */
export async function getLeaderboard(params: {
  timeRange: "week" | "month" | "quarter" | "all";
  departmentId?: string;
  limit?: number;
}) {
  const supabase = createAdminClient();
  const { timeRange, departmentId, limit = 20 } = params;

  // Calculate date range
  const now = new Date();
  let startDate: Date | null = null;

  switch (timeRange) {
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "quarter":
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), quarterMonth, 1);
      break;
    case "all":
      startDate = null;
      break;
  }

  // Build query for period points
  const query = supabase.rpc("fn_get_leaderboard", {
    start_date: startDate?.toISOString() ?? null,
    dept_id: departmentId ?? null,
    row_limit: limit,
  });

  const { data, error } = await query;

  if (error) {
    // Fallback: manual query if RPC doesn't exist yet
    console.warn("Leaderboard RPC failed, using fallback query:", error.message);
    return getLeaderboardFallback(startDate, departmentId, limit);
  }

  return data;
}

async function getLeaderboardFallback(
  startDate: Date | null,
  departmentId: string | undefined,
  limit: number
) {
  const supabase = createAdminClient();

  // Get users with their departments
  let usersQuery = supabase
    .from("users")
    .select("id, full_name_th, full_name_en, nickname, avatar_url, level, total_points, department_id, departments(code, name_th)")
    .eq("is_active", true)
    .order("total_points", { ascending: false })
    .limit(limit);

  if (departmentId) {
    usersQuery = usersQuery.eq("department_id", departmentId);
  }

  const { data: users } = await usersQuery;

  if (!users) return [];

  // If time range is "all", just use total_points
  if (!startDate) {
    return users.map((u, i) => ({
      user_id: u.id,
      full_name_th: u.full_name_th,
      full_name_en: u.full_name_en,
      nickname: u.nickname,
      avatar_url: u.avatar_url,
      department_code: (u.departments as unknown as { code: string })?.code ?? "",
      department_name_th: (u.departments as unknown as { name_th: string })?.name_th ?? "",
      level: u.level,
      total_points: u.total_points,
      period_points: u.total_points,
      rank: i + 1,
    }));
  }

  // For time ranges, aggregate from points_transactions
  const { data: periodPoints } = await supabase
    .from("points_transactions")
    .select("user_id, amount")
    .gte("created_at", startDate.toISOString());

  const pointsByUser = new Map<string, number>();
  periodPoints?.forEach((pt) => {
    pointsByUser.set(pt.user_id, (pointsByUser.get(pt.user_id) ?? 0) + pt.amount);
  });

  return users
    .map((u) => ({
      user_id: u.id,
      full_name_th: u.full_name_th,
      full_name_en: u.full_name_en,
      nickname: u.nickname,
      avatar_url: u.avatar_url,
      department_code: (u.departments as unknown as { code: string })?.code ?? "",
      department_name_th: (u.departments as unknown as { name_th: string })?.name_th ?? "",
      level: u.level,
      total_points: u.total_points,
      period_points: pointsByUser.get(u.id) ?? 0,
      rank: 0,
    }))
    .sort((a, b) => b.period_points - a.period_points)
    .map((entry, i) => ({ ...entry, rank: i + 1 }))
    .slice(0, limit);
}
