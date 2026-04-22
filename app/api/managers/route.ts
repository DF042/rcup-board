import { eq, sql } from "drizzle-orm";
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
  if (!parsed.success) return fail(parsed.error.message);

  const managerRecords = await db.select().from(managers);

  const records = await Promise.all(
    managerRecords.map(async (manager) => {
      const aggregate = await db
        .select({
          wins: sql<number>`coalesce(sum(case when ${matchups.winnerTeamId} = ${teams.id} then 1 else 0 end),0)`,
          losses: sql<number>`coalesce(sum(case when ${matchups.winnerTeamId} is not null and ${matchups.winnerTeamId} <> ${teams.id} then 1 else 0 end),0)`,
        })
        .from(teams)
        .leftJoin(matchups, sql`${teams.id} = ${matchups.team1Id} or ${teams.id} = ${matchups.team2Id}`)
        .leftJoin(leagues, eq(teams.leagueId, leagues.id))
        .where(
          sql`${teams.managerId} = ${manager.id} ${
            parsed.data.season ? sql`and ${leagues.season} = ${parsed.data.season}` : sql``
          }`,
        );

      return {
        id: manager.id,
        guid: manager.guid,
        nickname: manager.nickname,
        email: manager.email,
        wins: aggregate[0]?.wins ?? 0,
        losses: aggregate[0]?.losses ?? 0,
      };
    }),
  );

  return ok(records);
}
