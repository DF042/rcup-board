import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagues, teams, matchups } from "@/lib/db/schema";
import { ok, fail } from "@/lib/api/responses";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("Unauthorized", 401);

  const data = await db
    .select({
      season: leagues.season,
      leagueCount: sql<number>`count(distinct ${leagues.id})`,
      teamCount: sql<number>`count(distinct ${teams.id})`,
      matchupCount: sql<number>`count(distinct ${matchups.id})`,
    })
    .from(leagues)
    .leftJoin(teams, sql`${teams.leagueId} = ${leagues.id}`)
    .leftJoin(matchups, sql`${matchups.leagueId} = ${leagues.id}`)
    .groupBy(leagues.season)
    .orderBy(leagues.season);

  return ok(data);
}
