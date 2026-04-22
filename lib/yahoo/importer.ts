import { db } from "@/lib/db";
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
    await db.insert(leagues).values(value).onConflictDoUpdate({ target: leagues.leagueKey, set: value });
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
          set: { nickname: managers.nickname, email: managers.email, imageUrl: managers.imageUrl, updatedAt: new Date() },
        });
      summary.managers = parsed.managers.length;
    }
    if (parsed.teams.length) {
      await db.insert(teams).values(parsed.teams).onConflictDoUpdate({
        target: teams.teamKey,
        set: {
          name: teams.name,
          managerId: teams.managerId,
          standings: teams.standings,
          draftResults: teams.draftResults,
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
        set: { fullName: players.fullName, positions: players.positions, status: players.status, updatedAt: new Date() },
      });
      summary.players = parsed.length;
    }
  }

  if (type === "matchups") {
    const parsed = parseMatchups(payload);
    if (parsed.length) {
      await db.insert(matchups).values(parsed);
      summary.matchups = parsed.length;
    }
  }

  if (type === "rosters") {
    const parsed = parseRosters(payload);
    if (parsed.length) {
      await db.insert(rosters).values(parsed);
      summary.rosters = parsed.length;
    }
  }

  if (type === "stats") {
    const parsed = parsePlayerStats(payload);
    if (parsed.length) {
      await db.insert(playerStats).values(parsed).onConflictDoUpdate({
        target: [playerStats.playerId, playerStats.leagueId, playerStats.week, playerStats.season],
        set: { statValues: playerStats.statValues, points: playerStats.points, updatedAt: new Date() },
      });
      summary.stats = parsed.length;
    }
  }

  if (type === "transactions") {
    const parsed = parseTransactions(payload);
    if (parsed.length) {
      await db.insert(transactions).values(parsed).onConflictDoUpdate({
        target: transactions.transactionKey,
        set: { status: transactions.status, players: transactions.players, rawData: transactions.rawData },
      });
      summary.transactions = parsed.length;
    }
  }

  const categories = parseStatCategories(payload);
  if (categories.length) {
    await db.insert(statCategories).values(categories).onConflictDoUpdate({
      target: [statCategories.leagueId, statCategories.statId],
      set: {
        name: statCategories.name,
        displayName: statCategories.displayName,
        sortOrder: statCategories.sortOrder,
        isOnlyDisplayStat: statCategories.isOnlyDisplayStat,
      },
    });
    summary.statCategories = categories.length;
  }

  return { type, summary };
}
