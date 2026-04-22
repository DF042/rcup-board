import { and, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { leagues, playerStats, players } from "@/lib/db/schema";
import { ok, fail } from "@/lib/api/responses";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  search: z.string().optional(),
  position: z.string().optional(),
  season: z.coerce.number().optional(),
  teamId: z.coerce.number().optional(),
  leagueId: z.coerce.number().optional(),
});

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("Unauthorized", 401);

  const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!parsed.success) return fail(parsed.error.message);

  const filters = [
    parsed.data.search ? ilike(players.fullName, `%${parsed.data.search}%`) : undefined,
    parsed.data.position ? sql`${parsed.data.position} = any(${players.positions})` : undefined,
    parsed.data.season ? eq(playerStats.season, parsed.data.season) : undefined,
    parsed.data.teamId ? eq(playerStats.teamId, parsed.data.teamId) : undefined,
    parsed.data.leagueId ? eq(playerStats.leagueId, parsed.data.leagueId) : undefined,
  ].filter(Boolean);

  const data = await db
    .select({
      playerId: players.id,
      playerKey: players.playerKey,
      fullName: players.fullName,
      positions: players.positions,
      stats: playerStats.statValues,
      points: playerStats.points,
      season: playerStats.season,
      leagueSeason: leagues.season,
    })
    .from(players)
    .leftJoin(playerStats, eq(players.id, playerStats.playerId))
    .leftJoin(leagues, eq(playerStats.leagueId, leagues.id))
    .where(filters.length ? and(...filters) : undefined);

  return ok(data);
}
