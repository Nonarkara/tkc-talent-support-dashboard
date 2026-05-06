import { createAdminClient } from "@/lib/supabase/admin";
import type { BadgeDefinition } from "@/types/database";

/**
 * Check badge eligibility for a user after a contribution is verified.
 * Awards any badges the user has newly qualified for.
 */
export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  const supabase = createAdminClient();
  const awardedBadges: string[] = [];

  // Get all active badge definitions
  const { data: badges } = await supabase
    .from("badge_definitions")
    .select("*")
    .eq("is_active", true);

  if (!badges) return [];

  // Get user's existing badge awards
  const { data: existingAwards } = await supabase
    .from("badge_awards")
    .select("badge_id")
    .eq("user_id", userId);

  const earnedBadgeIds = new Set(existingAwards?.map((a) => a.badge_id) ?? []);

  // Get user data
  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (!user) return [];

  // Get user's verified contributions with type info
  const { data: contributions } = await supabase
    .from("contributions")
    .select("*, contribution_types(code, category_id, contribution_categories(code))")
    .eq("user_id", userId)
    .eq("status", "verified");

  if (!contributions) return [];

  for (const badge of badges) {
    // Skip already earned badges
    if (earnedBadgeIds.has(badge.id)) continue;

    const eligible = await checkBadgeCriteria(
      badge,
      user,
      contributions
    );

    if (eligible) {
      const { error } = await supabase.from("badge_awards").insert({
        user_id: userId,
        badge_id: badge.id,
      });

      if (!error) {
        awardedBadges.push(badge.code);
      }
    }
  }

  return awardedBadges;
}

async function checkBadgeCriteria(
  badge: BadgeDefinition,
  user: { level: number; streak_days: number },
  contributions: Array<{
    contribution_types: {
      code: string;
      category_id: string;
      contribution_categories: { code: string } | null;
    } | null;
  }>
): Promise<boolean> {
  const criteria = badge.criteria_json as Record<string, unknown> | null;

  switch (badge.criteria_type) {
    case "count": {
      // Count contributions matching a specific type
      const targetCode = criteria?.contribution_code as string | undefined;
      if (targetCode === undefined && criteria?.contribution_type === "any") {
        return contributions.length >= (badge.criteria_value ?? 1);
      }
      const matching = contributions.filter(
        (c) => c.contribution_types?.code === targetCode
      );
      return matching.length >= (badge.criteria_value ?? 1);
    }

    case "streak": {
      return user.streak_days >= (badge.criteria_value ?? 1);
    }

    case "points": {
      // Level-based badges
      if (criteria?.type === "level_reached") {
        return user.level >= (badge.criteria_value ?? 1);
      }
      return false;
    }

    case "custom": {
      const customType = criteria?.type as string;

      if (customType === "all_categories") {
        // Check if user has verified contributions in all 4C categories
        const categories = new Set(
          contributions
            .map((c) => c.contribution_types?.contribution_categories?.code)
            .filter(Boolean)
        );
        return categories.size >= 4;
      }

      if (customType === "distinct_departments") {
        // This would need cross-department contribution data
        // For now, check count of cross_team_collab contributions
        const targetCode = criteria?.contribution_code as string;
        const matching = contributions.filter(
          (c) => c.contribution_types?.code === targetCode
        );
        return matching.length >= (badge.criteria_value ?? 1);
      }

      return false;
    }

    default:
      return false;
  }
}
