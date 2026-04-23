import { db } from "@/lib/db";
import { eq, inArray, sql } from "drizzle-orm";
import {
  leagues,
  managers,
  teams,
  players,
  matchups,
  rosters,
  playerStats,
  transactions,
  statCategories,
} from "@/lib/db/schema";
import {
  detectDataType,
  parseLeague,
  parseMatchups,
  parsePlayerStats,
  parsePlayers,
  parseRosters,
  parseStatCategories,
  parseTeams,
  parseTransactions,
} from "./parser";

/** Look up the DB serial `id` for a league given its Yahoo `league_id` string. */
async function resolveLeagueDbId(yahooLeagueId: string): Promise<number | null> {
  if (!yahooLeagueId) return null;
  const [row] = await db
    .select({ id: leagues.id })
    .from(leagues)
    .where(eq(leagues.leagueId, yahooLeagueId))
    .limit(1);
  return row?.id ?? null;
}

export async function importYahooPayload(payload: unknown) {
  const type = detectDataType(payload);
  const summary: Record<string, number> = {
    league: 0,
    teams: 0,
    managers: 0,
    players: 0,
    matchups: 0,
    rosters: 0,
    stats: 0,
    transactions: 0,
    statCategories: 0,
  };

  if (type === "unknown") {
    console.warn(
      "Warning: could not detect data type from payload. No data was imported. " +
        "Expected payload keys like league_key, teams, players, matchups, rosters, player_stats, or transactions.",
    );
  }

  if (type === "league") {
    const value = parseLeague(payload);
    await db.insert(leagues).values(value).onConflictDoUpdate({
      target: leagues.leagueKey,
      set: {
        leagueId: sql`excluded.league_id`,
        season: sql`excluded.season`,
        name: sql`excluded.name`,
        sport: sql`excluded.sport`,
        scoringType: sql`excluded.scoring_type`,
        numTeams: sql`excluded.num_teams`,
        settings: sql`excluded.settings`,
        rawData: sql`excluded.raw_data`,
        updatedAt: new Date(),
      },
    });
    summary.league = 1;

    // Query back the real DB serial id for this league
    const [leagueRow] = await db
      .select({ id: leagues.id })
      .from(leagues)
      .where(eq(leagues.leagueKey, value.leagueKey))
      .limit(1);
    const dbLeagueId = leagueRow?.id;

    if (dbLeagueId != null) {
      const rawCategories = parseStatCategories(payload);
      // Override each category's leagueId with the DB serial id
      const categories = rawCategories.map((cat) => ({ ...cat, leagueId: dbLeagueId }));
      if (categories.length) {
        await db.insert(statCategories).values(categories).onConflictDoUpdate({
          target: [statCategories.leagueId, statCategories.statId],
          set: {
            name: sql`excluded.name`,
            displayName: sql`excluded.display_name`,
            sortOrder: sql`excluded.sort_order`,
            isOnlyDisplayStat: sql`excluded.is_only_display_stat`,
            updatedAt: new Date(),
          },
        });
        summary.statCategories = categories.length;
      }
    }
  }

  if (type === "teams") {
    const parsed = parseTeams(payload);

    if (!parsed.teams.length) {
      return { type, summary };
    }

    // Determine the Yahoo league_id from the parsed teams, then look up the DB serial id
    const yahooLeagueId = String(parsed.teams[0].leagueId ?? "");
    const dbLeagueId = await resolveLeagueDbId(yahooLeagueId);
    if (dbLeagueId == null) {
      console.warn(`League with Yahoo ID "${yahooLeagueId}" not found in DB. Import the league first.`);
      return { type, summary };
    }

    // Insert managers first
    if (parsed.managers.length) {
      await db
        .insert(managers)
        .values(parsed.managers)
        .onConflictDoUpdate({
          target: managers.guid,
          set: {
            nickname: sql`excluded.nickname`,
            email: sql`excluded.email`,
            imageUrl: sql`excluded.image_url`,
            updatedAt: new Date(),
          },
        });
      summary.managers = parsed.managers.length;
    }

    // Build guid → DB managers.id map
    const managerMap = new Map<string, number>();
    if (parsed.managers.length) {
      const guids = parsed.managers.map((m) => m.guid).filter((g): g is string => g != null);
      if (guids.length) {
        const managerRows = await db
          .select({ id: managers.id, guid: managers.guid })
          .from(managers)
          .where(inArray(managers.guid, guids));
        for (const row of managerRows) {
          managerMap.set(row.guid, row.id);
        }
      }
    }

    if (parsed.teams.length) {
      const teamsToInsert = parsed.teams.map((team) => {
        const managerGuid = parsed.teamKeyToManagerGuid.get(team.teamKey ?? "");
        const dbManagerId = managerGuid ? (managerMap.get(managerGuid) ?? null) : null;
        return { ...team, leagueId: dbLeagueId, managerId: dbManagerId };
      });
      await db.insert(teams).values(teamsToInsert).onConflictDoUpdate({
        target: teams.teamKey,
        set: {
          name: sql`excluded.name`,
          managerId: sql`excluded.manager_id`,
          standings: sql`excluded.standings`,
          draftResults: sql`excluded.draft_results`,
          updatedAt: new Date(),
        },
      });
      summary.teams = parsed.teams.length;
    }
  }

  if (type === "players") {
    const parsed = parsePlayers(payload);
    if (parsed.length) {
      await db.insert(players).values(parsed).onConflictDoUpdate({
        target: players.playerKey,
        set: {
          fullName: sql`excluded.full_name`,
          positions: sql`excluded.positions`,
          status: sql`excluded.status`,
          updatedAt: new Date(),
        },
      });
      summary.players = parsed.length;
    }
  }

  if (type === "matchups") {
    const parsed = parseMatchups(payload);
    if (parsed.length) {
      const yahooLeagueId = String(parsed[0]?.leagueId ?? "");
      const dbLeagueId = await resolveLeagueDbId(yahooLeagueId);
      if (dbLeagueId == null) {
        console.warn(`League with Yahoo ID "${yahooLeagueId}" not found in DB. Import the league first.`);
        return { type, summary };
      }

      // Build Yahoo team_id → DB teams.id map for this league
      const teamRows = await db
        .select({ id: teams.id, teamId: teams.teamId })
        .from(teams)
        .where(eq(teams.leagueId, dbLeagueId));
      const teamMap = new Map(teamRows.map((r) => [r.teamId, r.id]));

      const resolvedMatchups = parsed
        .map((m) => {
          const team1DbId = teamMap.get(String(m.team1Id));
          const team2DbId = teamMap.get(String(m.team2Id));
          if (!team1DbId || !team2DbId) {
            console.warn(`Skipping matchup: team not found (team1Id=${m.team1Id}, team2Id=${m.team2Id})`);
            return null;
          }
          const winnerDbId = m.winnerTeamId != null ? (teamMap.get(String(m.winnerTeamId)) ?? null) : null;
          return { ...m, leagueId: dbLeagueId, team1Id: team1DbId, team2Id: team2DbId, winnerTeamId: winnerDbId };
        })
        .filter((m): m is NonNullable<typeof m> => m !== null);

      if (resolvedMatchups.length) {
        await db.insert(matchups).values(resolvedMatchups).onConflictDoUpdate({
          target: [matchups.leagueId, matchups.week, matchups.team1Id, matchups.team2Id],
          set: {
            team1Points: sql`excluded.team1_points`,
            team2Points: sql`excluded.team2_points`,
            winnerTeamId: sql`excluded.winner_team_id`,
            isPlayoffs: sql`excluded.is_playoffs`,
            isConsolation: sql`excluded.is_consolation`,
            rawData: sql`excluded.raw_data`,
            updatedAt: new Date(),
          },
        });
        summary.matchups = resolvedMatchups.length;
      }
    }
  }

  if (type === "rosters") {
    const parsed = parseRosters(payload);
    if (parsed.length) {
      const yahooLeagueId = String(parsed[0]?.leagueId ?? "");
      const dbLeagueId = await resolveLeagueDbId(yahooLeagueId);
      if (dbLeagueId == null) {
        console.warn(`League with Yahoo ID "${yahooLeagueId}" not found in DB. Import the league first.`);
        return { type, summary };
      }

      // Build Yahoo team_id → DB teams.id map
      const teamRows = await db
        .select({ id: teams.id, teamId: teams.teamId })
        .from(teams)
        .where(eq(teams.leagueId, dbLeagueId));
      const teamMap = new Map(teamRows.map((r) => [r.teamId, r.id]));

      // Build Yahoo player_id → DB players.id map for players referenced in this roster
      const yahooPlayerIds = [...new Set(parsed.map((r) => String(r.playerId)))];
      const playerMap = new Map<string, number>();
      if (yahooPlayerIds.length) {
        const playerRows = await db
          .select({ id: players.id, playerId: players.playerId })
          .from(players)
          .where(inArray(players.playerId, yahooPlayerIds));
        for (const row of playerRows) {
          playerMap.set(row.playerId, row.id);
        }
      }

      const resolvedRosters = parsed
        .map((r) => {
          const teamDbId = teamMap.get(String(r.teamId));
          const playerDbId = playerMap.get(String(r.playerId));
          if (!teamDbId) {
            console.warn(`Skipping roster row: team not found (Yahoo teamId=${r.teamId})`);
            return null;
          }
          if (!playerDbId) {
            console.warn(`Skipping roster row: player not found (Yahoo playerId=${r.playerId})`);
            return null;
          }
          return { ...r, leagueId: dbLeagueId, teamId: teamDbId, playerId: playerDbId };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (resolvedRosters.length) {
        await db.insert(rosters).values(resolvedRosters).onConflictDoUpdate({
          target: [rosters.teamId, rosters.playerId, rosters.leagueId, rosters.week],
          set: {
            rosterPosition: sql`excluded.roster_position`,
            isStarting: sql`excluded.is_starting`,
            updatedAt: new Date(),
          },
        });
        summary.rosters = resolvedRosters.length;
      }
    }
  }

  if (type === "stats") {
    const parsed = parsePlayerStats(payload);
    if (parsed.length) {
      const yahooLeagueId = String(parsed[0]?.leagueId ?? "");
      const dbLeagueId = await resolveLeagueDbId(yahooLeagueId);
      if (dbLeagueId == null) {
        console.warn(`League with Yahoo ID "${yahooLeagueId}" not found in DB. Import the league first.`);
        return { type, summary };
      }

      // Build Yahoo team_id → DB teams.id map
      const teamRows = await db
        .select({ id: teams.id, teamId: teams.teamId })
        .from(teams)
        .where(eq(teams.leagueId, dbLeagueId));
      const teamMap = new Map(teamRows.map((r) => [r.teamId, r.id]));

      // Build Yahoo player_id → DB players.id map
      const yahooPlayerIds = [...new Set(parsed.map((s) => String(s.playerId)))];
      const playerMap = new Map<string, number>();
      if (yahooPlayerIds.length) {
        const playerRows = await db
          .select({ id: players.id, playerId: players.playerId })
          .from(players)
          .where(inArray(players.playerId, yahooPlayerIds));
        for (const row of playerRows) {
          playerMap.set(row.playerId, row.id);
        }
      }

      const resolvedStats = parsed
        .map((s) => {
          const playerDbId = playerMap.get(String(s.playerId));
          if (!playerDbId) {
            console.warn(`Skipping stat row: player not found (Yahoo playerId=${s.playerId})`);
            return null;
          }
          const teamDbId = s.teamId != null ? (teamMap.get(String(s.teamId)) ?? null) : null;
          return { ...s, leagueId: dbLeagueId, playerId: playerDbId, teamId: teamDbId };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);

      if (resolvedStats.length) {
        await db.insert(playerStats).values(resolvedStats).onConflictDoUpdate({
          target: [playerStats.playerId, playerStats.leagueId, playerStats.week, playerStats.season],
          set: {
            statValues: sql`excluded.stat_values`,
            points: sql`excluded.points`,
            updatedAt: new Date(),
          },
        });
        summary.stats = resolvedStats.length;
      }
    }
  }

  if (type === "transactions") {
    const parsed = parseTransactions(payload);
    if (parsed.length) {
      const yahooLeagueId = String(parsed[0]?.leagueId ?? "");
      const dbLeagueId = await resolveLeagueDbId(yahooLeagueId);
      if (dbLeagueId == null) {
        console.warn(`League with Yahoo ID "${yahooLeagueId}" not found in DB. Import the league first.`);
        return { type, summary };
      }

      const resolvedTransactions = parsed.map((tx) => ({ ...tx, leagueId: dbLeagueId }));
      await db.insert(transactions).values(resolvedTransactions).onConflictDoUpdate({
        target: transactions.transactionKey,
        set: {
          status: sql`excluded.status`,
          players: sql`excluded.players`,
          rawData: sql`excluded.raw_data`,
          updatedAt: new Date(),
        },
      });
      summary.transactions = resolvedTransactions.length;
    }
  }

  return { type, summary };
}
