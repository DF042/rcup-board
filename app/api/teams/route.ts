import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ok, fail } from "@/lib/api/responses";
import { db } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { leagues, managers, teams } from "@/lib/db/schema";

const schema = z.object({
  leagueId: z.coerce.number().optional(),
  season: z.coerce.number().optional(),
  managerId: z.coerce.number().optional(),
});

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("Unauthorized", 401);

  const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!parsed.success) return fail(parsed.error.message, 400);

  const filters = [
    parsed.data.leagueId ? eq(teams.leagueId, parsed.data.leagueId) : undefined,
    parsed.data.managerId ? eq(teams.managerId, parsed.data.managerId) : undefined,
    parsed.data.season ? eq(leagues.season, parsed.data.season) : undefined,
  ].filter(Boolean);

  const data = await db
    .select({
      id: teams.id,
      teamKey: teams.teamKey,
      name: teams.name,
      standings: teams.standings,
      managerName: managers.nickname,
    })
    .from(teams)
    .leftJoin(managers, eq(teams.managerId, managers.id))
    .leftJoin(leagues, eq(teams.leagueId, leagues.id))
    .where(filters.length ? and(...filters) : undefined);

  return ok(data);
}
