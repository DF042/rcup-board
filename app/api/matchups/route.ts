import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { leagues, matchups, teams } from "@/lib/db/schema";
import { ok, fail } from "@/lib/api/responses";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  leagueId: z.coerce.number().optional(),
  week: z.coerce.number().optional(),
  teamId: z.coerce.number().optional(),
  season: z.coerce.number().optional(),
});

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("Unauthorized", 401);

  const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!parsed.success) return fail(parsed.error.message, 400);

  const filters = [
    parsed.data.leagueId ? eq(matchups.leagueId, parsed.data.leagueId) : undefined,
    parsed.data.week ? eq(matchups.week, parsed.data.week) : undefined,
    parsed.data.teamId ? or(eq(matchups.team1Id, parsed.data.teamId), eq(matchups.team2Id, parsed.data.teamId)) : undefined,
    parsed.data.season ? eq(leagues.season, parsed.data.season) : undefined,
  ].filter(Boolean);

  const data = await db
    .select({
      id: matchups.id,
      week: matchups.week,
      team1Id: matchups.team1Id,
      team2Id: matchups.team2Id,
      team1Points: matchups.team1Points,
      team2Points: matchups.team2Points,
      winnerTeamId: matchups.winnerTeamId,
      leagueId: matchups.leagueId,
    })
    .from(matchups)
    .leftJoin(leagues, eq(matchups.leagueId, leagues.id))
    .where(filters.length ? and(...filters) : undefined);

  const teamMap = new Map((await db.select({ id: teams.id, name: teams.name }).from(teams)).map((t) => [t.id, t.name]));

  return ok(
    data.map((row) => ({
      ...row,
      team1Name: teamMap.get(row.team1Id) ?? "Unknown",
      team2Name: teamMap.get(row.team2Id) ?? "Unknown",
    })),
  );
}
