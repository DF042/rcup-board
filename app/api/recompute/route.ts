import { eq } from "drizzle-orm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fail, ok } from "@/lib/api/responses";
import { db } from "@/lib/db";
import { leagues } from "@/lib/db/schema";
import { recomputeLeagueStats } from "@/lib/db/compute";

/**
 * POST /api/recompute
 * Recompute season_stats and playoff_results for all leagues (or a specific
 * league if `leagueId` is passed in the JSON body).
 */
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Unauthorized", 401);

  let leagueId: number | undefined;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    if (typeof body.leagueId === "number") leagueId = body.leagueId;
  } catch {
    // body is optional
  }

  const leagueRows = leagueId
    ? await db.select({ id: leagues.id }).from(leagues).where(eq(leagues.id, leagueId))
    : await db.select({ id: leagues.id }).from(leagues);

  await Promise.all(leagueRows.map((row) => recomputeLeagueStats(row.id)));

  return ok({ recomputed: leagueRows.length }, 200);
}
