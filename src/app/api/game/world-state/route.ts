/**
 * GET /api/game/world-state
 *
 * Returns the complete real-time game state:
 *   • projects by status (open / active / completed / resolved)
 *   • employee availability
 *   • unread events / notifications
 *   • pending reviews (completed projects awaiting outcomes)
 *
 * This is the "lazy evaluation" heart: no background jobs,
 * just compute what the world should look like right now.
 */

import { apiJson, apiError } from "@/lib/api";
import { isDbConfigured } from "@/lib/db";
import { computeWorldState } from "@/lib/game-clock";

export async function GET() {
  if (!isDbConfigured()) {
    return apiError("Database not configured", 503);
  }

  try {
    const world = await computeWorldState(new Date());
    return apiJson({
      ok: true,
      world: {
        computedAt: world.computedAt.toISOString(),
        cycle: world.cycle,
        daysIntoCycle: world.daysIntoCycle,
        counts: {
          open: world.openFixtures.length,
          active: world.activeMatches.length,
          pendingReview: world.pendingReviews.length,
          resolved: world.resolvedMatches.length,
          total: world.projects.length,
        },
        pendingReviews: world.pendingReviews,
        openFixtures: world.openFixtures,
        activeMatches: world.activeMatches,
        resolvedMatches: world.resolvedMatches,
        notifications: world.notifications.map((n) => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
        })),
        employees: world.employees,
      },
    });
  } catch (error) {
    console.error("[api/game/world-state] error:", error);
    return apiError("Failed to compute world state", 500);
  }
}
