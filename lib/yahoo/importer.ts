import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
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
  }

  if (type === "teams") {
    const parsed = parseTeams(payload);
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
    if (parsed.teams.length) {
      await db.insert(teams).values(parsed.teams).onConflictDoUpdate({
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
      await db.insert(matchups).values(parsed).onConflictDoUpdate({
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
      summary.matchups = parsed.length;
    }
  }

  if (type === "rosters") {
    const parsed = parseRosters(payload);
    if (parsed.length) {
      await db.insert(rosters).values(parsed).onConflictDoUpdate({
        target: [rosters.teamId, rosters.playerId, rosters.leagueId, rosters.week],
        set: {
          rosterPosition: sql`excluded.roster_position`,
          isStarting: sql`excluded.is_starting`,
          updatedAt: new Date(),
        },
      });
      summary.rosters = parsed.length;
    }
  }

  if (type === "stats") {
    const parsed = parsePlayerStats(payload);
    if (parsed.length) {
      await db.insert(playerStats).values(parsed).onConflictDoUpdate({
        target: [playerStats.playerId, playerStats.leagueId, playerStats.week, playerStats.season],
        set: {
          statValues: sql`excluded.stat_values`,
          points: sql`excluded.points`,
          updatedAt: new Date(),
        },
      });
      summary.stats = parsed.length;
    }
  }

  if (type === "transactions") {
    const parsed = parseTransactions(payload);
    if (parsed.length) {
      await db.insert(transactions).values(parsed).onConflictDoUpdate({
        target: transactions.transactionKey,
        set: {
          status: sql`excluded.status`,
          players: sql`excluded.players`,
          rawData: sql`excluded.raw_data`,
        },
      });
      summary.transactions = parsed.length;
    }
  }

  const categories = parseStatCategories(payload);
  if (categories.length) {
    await db.insert(statCategories).values(categories).onConflictDoUpdate({
      target: [statCategories.leagueId, statCategories.statId],
      set: {
        name: sql`excluded.name`,
        displayName: sql`excluded.display_name`,
        sortOrder: sql`excluded.sort_order`,
        isOnlyDisplayStat: sql`excluded.is_only_display_stat`,
      },
    });
    summary.statCategories = categories.length;
  }

  return { type, summary };
}
