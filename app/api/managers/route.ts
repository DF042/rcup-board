import { eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { leagues, managers, matchups, teams } from "@/lib/db/schema";
import { ok, fail } from "@/lib/api/responses";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({ season: z.coerce.number().optional() });

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("Unauthorized", 401);

  const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!parsed.success) return fail(parsed.error.message, 400);

  const records = await db
    .select({
      id: managers.id,
      guid: managers.guid,
      nickname: managers.nickname,
      email: managers.email,
      wins: sql<number>`coalesce(sum(case when ${matchups.winnerTeamId} = ${teams.id} then 1 else 0 end),0)`,
      losses: sql<number>`coalesce(sum(case when ${matchups.winnerTeamId} is not null and ${matchups.winnerTeamId} <> ${teams.id} then 1 else 0 end),0)`,
    })
    .from(managers)
    .leftJoin(teams, eq(teams.managerId, managers.id))
    .leftJoin(leagues, eq(teams.leagueId, leagues.id))
    .leftJoin(
      matchups,
      or(eq(matchups.team1Id, teams.id), eq(matchups.team2Id, teams.id)),
    )
    .where(parsed.data.season ? eq(leagues.season, parsed.data.season) : undefined)
    .groupBy(managers.id);

  return ok(records);
}
