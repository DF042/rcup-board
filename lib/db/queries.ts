import { and, asc, avg, count, desc, eq, ilike, max, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { leagues, managers, matchups, playerStats, players, rosters, seasonStats, playoffResults, teams, transactions } from "@/lib/db/schema";

export type StandingRow = {
  teamId: number;
  teamKey: string;
  teamName: string;
  logoUrl: string | null;
  managerNickname: string | null;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  rank: number;
  streak?: string;
  expectedWins?: number;
};

export type SeasonSummary = {
  season: number;
  leagueId: number;
  leagueKey: string;
  leagueName: string;
  numTeams: number;
  totalMatchups: number;
  avgScore: number;
  champion?: string;
};

export type TeamWithManager = {
  id: number;
  teamId: string;
  teamKey: string;
  name: string;
  logoUrl: string | null;
  season: number;
  leagueId: number;
  managerId: number | null;
  managerNickname: string | null;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  rank: number;
};

export type TeamDetail = TeamWithManager & {
  standings: Record<string, unknown>;
  leagueKey: string;
  leagueName: string;
  managerGuid: string | null;
};

export type SeasonRecord = {
  season: number;
  leagueId: number;
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  finalRank: number;
  totalTeams: number;
};

export type ManagerSummary = {
  managerId: number;
  guid: string;
  nickname: string;
  imageUrl: string | null;
  totalWins: number;
  totalLosses: number;
  totalTies: number;
  seasonsPlayed: number;
  avgPointsFor: number;
  totalPointsFor: number;
  bestFinish: number | null;
  worstFinish: number | null;
  championships: number;
};

export type ManagerSeasonDetail = {
  season: number;
  leagueId: number;
  teamId: number;
  teamKey: string;
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  rank: number;
};

export type ManagerDetail = {
  managerId: number;
  guid: string;
  nickname: string;
  email: string | null;
  imageUrl: string | null;
  seasons: ManagerSeasonDetail[];
};

export type MatchupSummary = {
  id: number;
  leagueId: number;
  season: number;
  week: number;
  team1Id: number;
  team1Name: string;
  team1ManagerId: number | null;
  team1ManagerName: string | null;
  team1Points: number;
  team2Id: number;
  team2Name: string;
  team2ManagerId: number | null;
  team2ManagerName: string | null;
  team2Points: number;
  winnerTeamId: number | null;
  winnerTeamName: string | null;
  isPlayoffs: boolean;
  isConsolation: boolean;
};

export type HeadToHeadResult = {
  manager1Wins: number;
  manager2Wins: number;
  ties: number;
  matchups: MatchupSummary[];
};

export type PlayerWithStats = {
  playerId: number;
  playerKey: string;
  name: string;
  position: string;
  nflTeam: string | null;
  season: number | null;
  seasonPoints: number;
  weekAvg: number;
  bestWeek: number;
  ownerTeamName: string | null;
};

export type PlayerDetail = {
  playerId: number;
  playerKey: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  nflTeam: string | null;
  status: string | null;
  positions: string[];
  history: Array<{
    season: number;
    week: number | null;
    points: number;
    leagueId: number;
    teamId: number | null;
    teamName: string | null;
  }>;
};

export type PlayerScore = {
  playerId: number;
  playerKey: string;
  name: string;
  position: string;
  nflTeam: string | null;
  points: number;
  week: number | null;
  season: number;
};

export type MatchupWithTeams = MatchupSummary;

export type RosterPlayer = {
  playerId: number;
  playerKey: string;
  fullName: string;
  nflTeam: string | null;
  position: string;
  rosterPosition: string | null;
  isStarting: boolean;
  points: number;
  status: string | null;
};

export type PlayerWithSeasonStats = {
  playerId: number;
  playerKey: string;
  fullName: string;
  nflTeam: string | null;
  seasons: number[];
  totalPoints: number;
};

export type CrossViewResult = {
  viewType: "team" | "manager";
  entityId: string;
  dataType: "record" | "roster" | "matchups" | "stats" | "transactions";
  data: unknown;
};

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  if (Number.isFinite(n)) return n;
  if (process.env.NODE_ENV !== "production") {
    console.warn("Non-numeric value encountered in query mapping");
  }
  return 0;
}

function resolvePath(record: Record<string, unknown>, key: string): unknown {
  const parts = key.split(".");
  let value: unknown = record;
  for (const part of parts) {
    if (typeof value === "object" && value !== null) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return value;
}

function pickNumber(record: Record<string, unknown>, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = resolvePath(record, key);
    if (value !== undefined && value !== null && value !== "") {
      return toNumber(value);
    }
  }
  return fallback;
}

function pickString(record: Record<string, unknown>, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = resolvePath(record, key);
    if (value !== undefined && value !== null && `${value}`.trim()) {
      return String(value);
    }
  }
  return fallback;
}

function parseStandingPayload(value: unknown) {
  const standings = (typeof value === "object" && value ? value : {}) as Record<string, unknown>;
  return {
    wins: pickNumber(standings, ["wins", "win", "outcome_totals.wins", "outcomeTotals.wins"]),
    losses: pickNumber(standings, ["losses", "loss", "outcome_totals.losses", "outcomeTotals.losses"]),
    ties: pickNumber(standings, ["ties", "outcome_totals.ties", "outcomeTotals.ties"]),
    pointsFor: pickNumber(standings, ["points_for", "pointsFor", "points.for"]),
    pointsAgainst: pickNumber(standings, ["points_against", "pointsAgainst", "points.against"]),
    rank: pickNumber(standings, ["rank", "playoff_seed", "playoffSeed"], 999),
    streak: pickString(standings, ["streak", "streak_type", "streakType"]),
  };
}

async function resolveLeagueNumericId(leagueId: string): Promise<number | null> {
  if (/^\d+$/.test(leagueId)) return Number(leagueId);
  const league = await db
    .select({ id: leagues.id })
    .from(leagues)
    .where(or(eq(leagues.leagueKey, leagueId), eq(leagues.leagueId, leagueId)))
    .limit(1);
  return league[0]?.id ?? null;
}

export async function getStandings(leagueId: string, season?: number): Promise<StandingRow[]> {
  const leagueNumericId = await resolveLeagueNumericId(leagueId);
  if (!leagueNumericId) return [];

  const rows = await db
    .select({
      teamId: teams.id,
      teamKey: teams.teamKey,
      teamName: teams.name,
      logoUrl: teams.logoUrl,
      managerNickname: managers.nickname,
      standings: teams.standings,
      ssWins: seasonStats.wins,
      ssLosses: seasonStats.losses,
      ssTies: seasonStats.ties,
      ssPointsFor: seasonStats.pointsFor,
      ssPointsAgainst: seasonStats.pointsAgainst,
      ssRank: seasonStats.rank,
      expectedWins: seasonStats.expectedWins,
    })
    .from(teams)
    .leftJoin(managers, eq(teams.managerId, managers.id))
    .leftJoin(leagues, eq(teams.leagueId, leagues.id))
    .leftJoin(seasonStats, eq(seasonStats.teamId, teams.id))
    .where(
      and(
        eq(teams.leagueId, leagueNumericId),
        season ? eq(leagues.season, season) : undefined,
      ),
    );

  const result = rows.map((row) => {
    const parsed = parseStandingPayload(row.standings);
    const hasSeasonStats = row.ssWins != null;
    return {
      teamId: row.teamId,
      teamKey: row.teamKey,
      teamName: row.teamName,
      logoUrl: row.logoUrl,
      managerNickname: row.managerNickname,
      wins: hasSeasonStats ? toNumber(row.ssWins) : parsed.wins,
      losses: hasSeasonStats ? toNumber(row.ssLosses) : parsed.losses,
      ties: hasSeasonStats ? toNumber(row.ssTies) : parsed.ties,
      pointsFor: hasSeasonStats ? toNumber(row.ssPointsFor) : parsed.pointsFor,
      pointsAgainst: hasSeasonStats ? toNumber(row.ssPointsAgainst) : parsed.pointsAgainst,
      rank: hasSeasonStats ? toNumber(row.ssRank) : parsed.rank,
      streak: parsed.streak || undefined,
      expectedWins: row.expectedWins != null ? toNumber(row.expectedWins) : undefined,
    };
  });
  result.sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor);
  result.forEach((row, i) => { row.rank = i + 1; });
  return result;
}

export async function getAllSeasons(): Promise<SeasonSummary[]> {
  const base = await db
    .select({
      season: leagues.season,
      leagueId: leagues.id,
      leagueKey: leagues.leagueKey,
      leagueName: leagues.name,
      numTeams: sql<number>`coalesce(${leagues.numTeams}, 0)`,
      totalMatchups: count(matchups.id),
      avgScore: avg(sql<number>`(coalesce(${matchups.team1Points}, 0)::numeric + coalesce(${matchups.team2Points}, 0)::numeric) / 2`),
    })
    .from(leagues)
    .leftJoin(matchups, eq(matchups.leagueId, leagues.id))
    .groupBy(leagues.id)
    .orderBy(desc(leagues.season));

  const leagueTeams = await db
    .select({
      leagueId: teams.leagueId,
      teamName: teams.name,
      standings: teams.standings,
    })
    .from(teams);

  const championByLeague = new Map<number, string>();
  for (const row of leagueTeams) {
    const parsed = parseStandingPayload(row.standings);
    if (parsed.rank === 1 && !championByLeague.has(row.leagueId)) {
      championByLeague.set(row.leagueId, row.teamName);
    }
  }

  return base.map((row) => ({
    season: row.season ?? 0,
    leagueId: row.leagueId,
    leagueKey: row.leagueKey ?? "",
    leagueName: row.leagueName ?? "",
    numTeams: toNumber(row.numTeams),
    totalMatchups: toNumber(row.totalMatchups),
    avgScore: Number(toNumber(row.avgScore).toFixed(2)),
    champion: championByLeague.get(row.leagueId),
  }));
}

export async function getLeagueBySeason(season: number) {
  const rows = await db
    .select()
    .from(leagues)
    .where(eq(leagues.season, season))
    .orderBy(desc(leagues.id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getTeams(filters: { season?: number; managerId?: string; leagueId?: string }): Promise<TeamWithManager[]> {
  const managerId = filters.managerId ? Number(filters.managerId) : undefined;
  const leagueNumericId = filters.leagueId ? await resolveLeagueNumericId(filters.leagueId) : undefined;

  const rows = await db
    .select({
      id: teams.id,
      teamId: teams.teamId,
      teamKey: teams.teamKey,
      name: teams.name,
      logoUrl: teams.logoUrl,
      leagueId: teams.leagueId,
      season: leagues.season,
      managerId: teams.managerId,
      managerNickname: managers.nickname,
      standings: teams.standings,
      ssWins: seasonStats.wins,
      ssLosses: seasonStats.losses,
      ssTies: seasonStats.ties,
      ssPointsFor: seasonStats.pointsFor,
      ssPointsAgainst: seasonStats.pointsAgainst,
      ssRank: seasonStats.rank,
    })
    .from(teams)
    .leftJoin(managers, eq(teams.managerId, managers.id))
    .leftJoin(leagues, eq(teams.leagueId, leagues.id))
    .leftJoin(seasonStats, eq(seasonStats.teamId, teams.id))
    .where(
      and(
        filters.season ? eq(leagues.season, filters.season) : undefined,
        managerId ? eq(teams.managerId, managerId) : undefined,
        leagueNumericId ? eq(teams.leagueId, leagueNumericId) : undefined,
      ),
    )
    .orderBy(desc(leagues.season), asc(teams.name));

  return rows.map((row) => {
    const parsed = parseStandingPayload(row.standings);
    const hasSeasonStats = row.ssWins != null;
    return {
      id: row.id,
      teamId: row.teamId,
      teamKey: row.teamKey,
      name: row.name,
      logoUrl: row.logoUrl,
      season: row.season ?? 0,
      leagueId: row.leagueId,
      managerId: row.managerId,
      managerNickname: row.managerNickname,
      wins: hasSeasonStats ? toNumber(row.ssWins) : parsed.wins,
      losses: hasSeasonStats ? toNumber(row.ssLosses) : parsed.losses,
      ties: hasSeasonStats ? toNumber(row.ssTies) : parsed.ties,
      pointsFor: hasSeasonStats ? toNumber(row.ssPointsFor) : parsed.pointsFor,
      pointsAgainst: hasSeasonStats ? toNumber(row.ssPointsAgainst) : parsed.pointsAgainst,
      rank: hasSeasonStats ? toNumber(row.ssRank) : parsed.rank,
    };
  });
}

export async function getTeamByKey(teamKey: string): Promise<TeamDetail | null> {
  const rows = await db
    .select({
      id: teams.id,
      teamId: teams.teamId,
      teamKey: teams.teamKey,
      name: teams.name,
      logoUrl: teams.logoUrl,
      leagueId: teams.leagueId,
      season: leagues.season,
      managerId: teams.managerId,
      managerNickname: managers.nickname,
      managerGuid: managers.guid,
      standings: teams.standings,
      leagueKey: leagues.leagueKey,
      leagueName: leagues.name,
      ssWins: seasonStats.wins,
      ssLosses: seasonStats.losses,
      ssTies: seasonStats.ties,
      ssPointsFor: seasonStats.pointsFor,
      ssPointsAgainst: seasonStats.pointsAgainst,
      ssRank: seasonStats.rank,
    })
    .from(teams)
    .leftJoin(managers, eq(teams.managerId, managers.id))
    .leftJoin(leagues, eq(teams.leagueId, leagues.id))
    .leftJoin(seasonStats, eq(seasonStats.teamId, teams.id))
    .where(eq(teams.teamKey, teamKey))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  const parsed = parseStandingPayload(row.standings);
  const hasSeasonStats = row.ssWins != null;

  return {
    id: row.id,
    teamId: row.teamId,
    teamKey: row.teamKey,
    name: row.name,
    logoUrl: row.logoUrl,
    season: row.season ?? 0,
    leagueId: row.leagueId,
    managerId: row.managerId,
    managerNickname: row.managerNickname,
    managerGuid: row.managerGuid,
    leagueKey: row.leagueKey ?? "",
    leagueName: row.leagueName ?? "",
    standings: (row.standings as Record<string, unknown>) ?? {},
    wins: hasSeasonStats ? toNumber(row.ssWins) : parsed.wins,
    losses: hasSeasonStats ? toNumber(row.ssLosses) : parsed.losses,
    ties: hasSeasonStats ? toNumber(row.ssTies) : parsed.ties,
    pointsFor: hasSeasonStats ? toNumber(row.ssPointsFor) : parsed.pointsFor,
    pointsAgainst: hasSeasonStats ? toNumber(row.ssPointsAgainst) : parsed.pointsAgainst,
    rank: hasSeasonStats ? toNumber(row.ssRank) : parsed.rank,
  };
}

export async function getTeamSeasonHistory(teamKey: string): Promise<SeasonRecord[]> {
  const current = await getTeamByKey(teamKey);
  if (!current?.managerGuid) return [];

  const rows = await db
    .select({
      season: leagues.season,
      leagueId: teams.leagueId,
      teamName: teams.name,
      standings: teams.standings,
      totalTeams: leagues.numTeams,
      ssWins: seasonStats.wins,
      ssLosses: seasonStats.losses,
      ssTies: seasonStats.ties,
      ssPointsFor: seasonStats.pointsFor,
      ssPointsAgainst: seasonStats.pointsAgainst,
      ssRank: seasonStats.rank,
    })
    .from(teams)
    .innerJoin(managers, eq(teams.managerId, managers.id))
    .innerJoin(leagues, eq(teams.leagueId, leagues.id))
    .leftJoin(seasonStats, eq(seasonStats.teamId, teams.id))
    .where(eq(managers.guid, current.managerGuid))
    .orderBy(desc(leagues.season));

  return rows.map((row) => {
    const parsed = parseStandingPayload(row.standings);
    const hasSeasonStats = row.ssWins != null;
    return {
      season: row.season ?? 0,
      leagueId: row.leagueId,
      teamName: row.teamName,
      wins: hasSeasonStats ? toNumber(row.ssWins) : parsed.wins,
      losses: hasSeasonStats ? toNumber(row.ssLosses) : parsed.losses,
      ties: hasSeasonStats ? toNumber(row.ssTies) : parsed.ties,
      pointsFor: hasSeasonStats ? toNumber(row.ssPointsFor) : parsed.pointsFor,
      pointsAgainst: hasSeasonStats ? toNumber(row.ssPointsAgainst) : parsed.pointsAgainst,
      finalRank: hasSeasonStats ? toNumber(row.ssRank) : parsed.rank,
      totalTeams: row.totalTeams ?? 0,
    };
  });
}

export async function getAllManagers(): Promise<ManagerSummary[]> {
  const managerRows = await db.select().from(managers).orderBy(asc(managers.nickname));
  const teamRows = await db
    .select({
      managerId: teams.managerId,
      teamId: teams.id,
      standings: teams.standings,
      season: leagues.season,
    })
    .from(teams)
    .leftJoin(leagues, eq(teams.leagueId, leagues.id));
  const matchupRows = await db
    .select({
      team1Id: matchups.team1Id,
      team2Id: matchups.team2Id,
      winnerTeamId: matchups.winnerTeamId,
      team1Points: matchups.team1Points,
      team2Points: matchups.team2Points,
    })
    .from(matchups);

  // Count championships per manager via playoff_results → teams
  const championshipRows = await db
    .select({ managerId: teams.managerId })
    .from(playoffResults)
    .innerJoin(teams, eq(playoffResults.teamId, teams.id))
    .where(eq(playoffResults.isChampion, true));
  const championshipsByManager = new Map<number, number>();
  for (const row of championshipRows) {
    if (row.managerId == null) continue;
    championshipsByManager.set(row.managerId, (championshipsByManager.get(row.managerId) ?? 0) + 1);
  }

  const teamByManager = new Map<number, number[]>();
  const finishByManager = new Map<number, number[]>();
  const seasonByManager = new Map<number, Set<number>>();

  for (const row of teamRows) {
    if (!row.managerId) continue;
    const list = teamByManager.get(row.managerId) ?? [];
    list.push(row.teamId);
    teamByManager.set(row.managerId, list);

    const parsed = parseStandingPayload(row.standings);
    const finishes = finishByManager.get(row.managerId) ?? [];
    if (parsed.rank < 999) finishes.push(parsed.rank);
    finishByManager.set(row.managerId, finishes);

    const seasons = seasonByManager.get(row.managerId) ?? new Set<number>();
    if (row.season !== null) seasons.add(row.season);
    seasonByManager.set(row.managerId, seasons);
  }

  const stats = new Map<number, { w: number; l: number; t: number; points: number; games: number }>();
  for (const manager of managerRows) {
    stats.set(manager.id, { w: 0, l: 0, t: 0, points: 0, games: 0 });
  }

  const managerByTeam = new Map<number, number>();
  for (const [managerId, teamIds] of teamByManager.entries()) {
    for (const teamId of teamIds) managerByTeam.set(teamId, managerId);
  }

  for (const row of matchupRows) {
    const m1 = managerByTeam.get(row.team1Id);
    const m2 = managerByTeam.get(row.team2Id);
    if (m1) {
      const bucket = stats.get(m1);
      if (bucket) {
        bucket.points += toNumber(row.team1Points);
        bucket.games += 1;
        if (!row.winnerTeamId) bucket.t += 1;
        else if (row.winnerTeamId === row.team1Id) bucket.w += 1;
        else bucket.l += 1;
      }
    }
    if (m2) {
      const bucket = stats.get(m2);
      if (bucket) {
        bucket.points += toNumber(row.team2Points);
        bucket.games += 1;
        if (!row.winnerTeamId) bucket.t += 1;
        else if (row.winnerTeamId === row.team2Id) bucket.w += 1;
        else bucket.l += 1;
      }
    }
  }

  return managerRows.map((row) => {
    const bucket = stats.get(row.id) ?? { w: 0, l: 0, t: 0, points: 0, games: 0 };
    const finishes = finishByManager.get(row.id) ?? [];

    return {
      managerId: row.id,
      guid: row.guid,
      nickname: row.nickname,
      imageUrl: row.imageUrl,
      totalWins: bucket.w,
      totalLosses: bucket.l,
      totalTies: bucket.t,
      seasonsPlayed: seasonByManager.get(row.id)?.size ?? 0,
      avgPointsFor: bucket.games ? Number((bucket.points / bucket.games).toFixed(2)) : 0,
      totalPointsFor: Number(bucket.points.toFixed(2)),
      bestFinish: finishes.length ? Math.min(...finishes) : null,
      worstFinish: finishes.length ? Math.max(...finishes) : null,
      championships: championshipsByManager.get(row.id) ?? 0,
    };
  });
}

export async function getManagerById(managerId: string): Promise<ManagerDetail | null> {
  const id = Number(managerId);
  if (!Number.isFinite(id)) return null;

  const managerRow = await db.select().from(managers).where(eq(managers.id, id)).limit(1);
  if (!managerRow[0]) return null;

  const seasons = await db
    .select({
      season: leagues.season,
      leagueId: teams.leagueId,
      teamId: teams.id,
      teamKey: teams.teamKey,
      teamName: teams.name,
      standings: teams.standings,
      ssWins: seasonStats.wins,
      ssLosses: seasonStats.losses,
      ssTies: seasonStats.ties,
      ssPointsFor: seasonStats.pointsFor,
      ssPointsAgainst: seasonStats.pointsAgainst,
      ssRank: seasonStats.rank,
    })
    .from(teams)
    .innerJoin(leagues, eq(teams.leagueId, leagues.id))
    .leftJoin(seasonStats, eq(seasonStats.teamId, teams.id))
    .where(eq(teams.managerId, id))
    .orderBy(desc(leagues.season));

  return {
    managerId: managerRow[0].id,
    guid: managerRow[0].guid,
    nickname: managerRow[0].nickname,
    email: managerRow[0].email,
    imageUrl: managerRow[0].imageUrl,
    seasons: seasons.map((row) => {
      const parsed = parseStandingPayload(row.standings);
      const hasSeasonStats = row.ssWins != null;
      return {
        season: row.season ?? 0,
        leagueId: row.leagueId,
        teamId: row.teamId,
        teamKey: row.teamKey,
        teamName: row.teamName,
        wins: hasSeasonStats ? toNumber(row.ssWins) : parsed.wins,
        losses: hasSeasonStats ? toNumber(row.ssLosses) : parsed.losses,
        ties: hasSeasonStats ? toNumber(row.ssTies) : parsed.ties,
        pointsFor: hasSeasonStats ? toNumber(row.ssPointsFor) : parsed.pointsFor,
        pointsAgainst: hasSeasonStats ? toNumber(row.ssPointsAgainst) : parsed.pointsAgainst,
        rank: hasSeasonStats ? toNumber(row.ssRank) : parsed.rank,
      };
    }),
  };
}

export async function getMatchups(filters: {
  leagueId?: string;
  season?: number;
  week?: number;
  teamId?: string;
}): Promise<MatchupWithTeams[]> {
  const team1 = alias(teams, "team1");
  const team2 = alias(teams, "team2");
  const manager1 = alias(managers, "manager1");
  const manager2 = alias(managers, "manager2");

  const teamFilterId = filters.teamId ? Number(filters.teamId) : undefined;
  const leagueNumericId = filters.leagueId ? await resolveLeagueNumericId(filters.leagueId) : undefined;

  const rows = await db
    .select({
      id: matchups.id,
      leagueId: matchups.leagueId,
      season: leagues.season,
      week: matchups.week,
      team1Id: matchups.team1Id,
      team1Name: team1.name,
      team1ManagerId: team1.managerId,
      team1ManagerName: manager1.nickname,
      team1Points: matchups.team1Points,
      team2Id: matchups.team2Id,
      team2Name: team2.name,
      team2ManagerId: team2.managerId,
      team2ManagerName: manager2.nickname,
      team2Points: matchups.team2Points,
      winnerTeamId: matchups.winnerTeamId,
      isPlayoffs: matchups.isPlayoffs,
      isConsolation: matchups.isConsolation,
    })
    .from(matchups)
    .innerJoin(leagues, eq(matchups.leagueId, leagues.id))
    .innerJoin(team1, eq(matchups.team1Id, team1.id))
    .innerJoin(team2, eq(matchups.team2Id, team2.id))
    .leftJoin(manager1, eq(team1.managerId, manager1.id))
    .leftJoin(manager2, eq(team2.managerId, manager2.id))
    .where(
      and(
        leagueNumericId ? eq(matchups.leagueId, leagueNumericId) : undefined,
        filters.season ? eq(leagues.season, filters.season) : undefined,
        filters.week ? eq(matchups.week, filters.week) : undefined,
        teamFilterId ? or(eq(matchups.team1Id, teamFilterId), eq(matchups.team2Id, teamFilterId)) : undefined,
      ),
    )
    .orderBy(desc(leagues.season), desc(matchups.week));

  return rows.map((row) => ({
    id: row.id,
    leagueId: row.leagueId,
    season: row.season ?? 0,
    week: row.week,
    team1Id: row.team1Id,
    team1Name: row.team1Name,
    team1ManagerId: row.team1ManagerId,
    team1ManagerName: row.team1ManagerName,
    team1Points: toNumber(row.team1Points),
    team2Id: row.team2Id,
    team2Name: row.team2Name,
    team2ManagerId: row.team2ManagerId,
    team2ManagerName: row.team2ManagerName,
    team2Points: toNumber(row.team2Points),
    winnerTeamId: row.winnerTeamId,
    winnerTeamName: row.winnerTeamId === row.team1Id ? row.team1Name : row.winnerTeamId === row.team2Id ? row.team2Name : null,
    isPlayoffs: row.isPlayoffs ?? false,
    isConsolation: row.isConsolation ?? false,
  }));
}

export async function getTeamMatchupHistory(team1Id: string, team2Id: string): Promise<MatchupWithTeams[]> {
  const one = Number(team1Id);
  const two = Number(team2Id);
  if (!Number.isFinite(one) || !Number.isFinite(two)) return [];

  // Filter in the database instead of loading all matchups and filtering in memory.
  const team1Alias = alias(teams, "team1");
  const team2Alias = alias(teams, "team2");
  const manager1Alias = alias(managers, "manager1");
  const manager2Alias = alias(managers, "manager2");

  const rows = await db
    .select({
      id: matchups.id,
      leagueId: matchups.leagueId,
      season: leagues.season,
      week: matchups.week,
      team1Id: matchups.team1Id,
      team1Name: team1Alias.name,
      team1ManagerId: team1Alias.managerId,
      team1ManagerName: manager1Alias.nickname,
      team1Points: matchups.team1Points,
      team2Id: matchups.team2Id,
      team2Name: team2Alias.name,
      team2ManagerId: team2Alias.managerId,
      team2ManagerName: manager2Alias.nickname,
      team2Points: matchups.team2Points,
      winnerTeamId: matchups.winnerTeamId,
      isPlayoffs: matchups.isPlayoffs,
      isConsolation: matchups.isConsolation,
    })
    .from(matchups)
    .innerJoin(leagues, eq(matchups.leagueId, leagues.id))
    .innerJoin(team1Alias, eq(matchups.team1Id, team1Alias.id))
    .innerJoin(team2Alias, eq(matchups.team2Id, team2Alias.id))
    .leftJoin(manager1Alias, eq(team1Alias.managerId, manager1Alias.id))
    .leftJoin(manager2Alias, eq(team2Alias.managerId, manager2Alias.id))
    .where(
      or(
        and(eq(matchups.team1Id, one), eq(matchups.team2Id, two)),
        and(eq(matchups.team1Id, two), eq(matchups.team2Id, one)),
      ),
    )
    .orderBy(desc(leagues.season), desc(matchups.week));

  return rows.map((row) => ({
    id: row.id,
    leagueId: row.leagueId,
    season: row.season ?? 0,
    week: row.week,
    team1Id: row.team1Id,
    team1Name: row.team1Name,
    team1ManagerId: row.team1ManagerId,
    team1ManagerName: row.team1ManagerName,
    team1Points: toNumber(row.team1Points),
    team2Id: row.team2Id,
    team2Name: row.team2Name,
    team2ManagerId: row.team2ManagerId,
    team2ManagerName: row.team2ManagerName,
    team2Points: toNumber(row.team2Points),
    winnerTeamId: row.winnerTeamId,
    winnerTeamName: row.winnerTeamId === row.team1Id ? row.team1Name : row.winnerTeamId === row.team2Id ? row.team2Name : null,
    isPlayoffs: row.isPlayoffs ?? false,
    isConsolation: row.isConsolation ?? false,
  }));
}

export async function getHeadToHead(manager1Id: string, manager2Id: string): Promise<HeadToHeadResult> {
  const m1 = Number(manager1Id);
  const m2 = Number(manager2Id);
  if (!Number.isFinite(m1) || !Number.isFinite(m2)) return { manager1Wins: 0, manager2Wins: 0, ties: 0, matchups: [] };

  const managerTeams = await db
    .select({ managerId: teams.managerId, teamId: teams.id })
    .from(teams)
    .where(or(eq(teams.managerId, m1), eq(teams.managerId, m2)));

  const m1Teams = new Set(managerTeams.filter((t) => t.managerId === m1).map((t) => t.teamId));
  const m2Teams = new Set(managerTeams.filter((t) => t.managerId === m2).map((t) => t.teamId));
  if (!m1Teams.size || !m2Teams.size) return { manager1Wins: 0, manager2Wins: 0, ties: 0, matchups: [] };

  const m1TeamIds = [...m1Teams];
  const m2TeamIds = [...m2Teams];

  // Build DB-level conditions for every cross-pair of teams so we never load
  // the full matchups table into memory.
  const pairConditions = m1TeamIds.flatMap((t1) =>
    m2TeamIds.map((t2) =>
      or(
        and(eq(matchups.team1Id, t1), eq(matchups.team2Id, t2)),
        and(eq(matchups.team1Id, t2), eq(matchups.team2Id, t1)),
      ),
    ),
  );

  const team1Alias = alias(teams, "team1");
  const team2Alias = alias(teams, "team2");
  const manager1Alias = alias(managers, "manager1");
  const manager2Alias = alias(managers, "manager2");

  const rows = await db
    .select({
      id: matchups.id,
      leagueId: matchups.leagueId,
      season: leagues.season,
      week: matchups.week,
      team1Id: matchups.team1Id,
      team1Name: team1Alias.name,
      team1ManagerId: team1Alias.managerId,
      team1ManagerName: manager1Alias.nickname,
      team1Points: matchups.team1Points,
      team2Id: matchups.team2Id,
      team2Name: team2Alias.name,
      team2ManagerId: team2Alias.managerId,
      team2ManagerName: manager2Alias.nickname,
      team2Points: matchups.team2Points,
      winnerTeamId: matchups.winnerTeamId,
      isPlayoffs: matchups.isPlayoffs,
      isConsolation: matchups.isConsolation,
    })
    .from(matchups)
    .innerJoin(leagues, eq(matchups.leagueId, leagues.id))
    .innerJoin(team1Alias, eq(matchups.team1Id, team1Alias.id))
    .innerJoin(team2Alias, eq(matchups.team2Id, team2Alias.id))
    .leftJoin(manager1Alias, eq(team1Alias.managerId, manager1Alias.id))
    .leftJoin(manager2Alias, eq(team2Alias.managerId, manager2Alias.id))
    .where(pairConditions.length === 1 ? pairConditions[0] : or(...pairConditions))
    .orderBy(desc(leagues.season), desc(matchups.week));

  const filtered: MatchupWithTeams[] = rows.map((row) => ({
    id: row.id,
    leagueId: row.leagueId,
    season: row.season ?? 0,
    week: row.week,
    team1Id: row.team1Id,
    team1Name: row.team1Name,
    team1ManagerId: row.team1ManagerId,
    team1ManagerName: row.team1ManagerName,
    team1Points: toNumber(row.team1Points),
    team2Id: row.team2Id,
    team2Name: row.team2Name,
    team2ManagerId: row.team2ManagerId,
    team2ManagerName: row.team2ManagerName,
    team2Points: toNumber(row.team2Points),
    winnerTeamId: row.winnerTeamId,
    winnerTeamName:
      row.winnerTeamId === row.team1Id ? row.team1Name : row.winnerTeamId === row.team2Id ? row.team2Name : null,
    isPlayoffs: row.isPlayoffs ?? false,
    isConsolation: row.isConsolation ?? false,
  }));

  let manager1Wins = 0;
  let manager2Wins = 0;
  let ties = 0;

  for (const row of filtered) {
    if (!row.winnerTeamId) ties += 1;
    else if (m1Teams.has(row.winnerTeamId)) manager1Wins += 1;
    else if (m2Teams.has(row.winnerTeamId)) manager2Wins += 1;
  }

  return { manager1Wins, manager2Wins, ties, matchups: filtered };
}

export async function getCurrentWeek(leagueId: string): Promise<number> {
  const leagueNumericId = await resolveLeagueNumericId(leagueId);
  if (!leagueNumericId) return 1;

  const rows = await db
    .select({ currentWeek: max(matchups.week) })
    .from(matchups)
    .where(eq(matchups.leagueId, leagueNumericId));

  return rows[0]?.currentWeek ?? 1;
}

export async function getPlayers(filters: {
  search?: string;
  position?: string;
  season?: number;
  teamId?: string;
  leagueId?: string;
  limit?: number;
  offset?: number;
  sortBy?: "name" | "position" | "nflTeam" | "seasonPoints" | "weekAvg" | "bestWeek" | "ownerTeamName" | "season";
  sortDir?: "asc" | "desc";
}): Promise<{ players: PlayerWithStats[]; total: number }> {
  const leagueNumericId = filters.leagueId ? await resolveLeagueNumericId(filters.leagueId) : undefined;
  const teamId = filters.teamId ? Number(filters.teamId) : undefined;
  const limit = filters.limit ?? 25;
  const offset = filters.offset ?? 0;
  const sortDir = filters.sortDir ?? "desc";

  const whereClause = and(
    filters.search ? ilike(players.fullName, `%${filters.search}%`) : undefined,
    filters.position ? sql`${filters.position} = any(${players.positions})` : undefined,
    filters.season ? eq(playerStats.season, filters.season) : undefined,
    teamId ? eq(playerStats.teamId, teamId) : undefined,
    leagueNumericId ? eq(playerStats.leagueId, leagueNumericId) : undefined,
  );

  const seasonPointsExpr = sql`coalesce(sum(${playerStats.points}::numeric), 0)`;
  const weekAvgExpr = avg(sql<number>`${playerStats.points}::numeric`);
  const bestWeekExpr = max(sql<number>`${playerStats.points}::numeric`);
  const ownerTeamExpr = max(teams.name);
  const seasonExpr = max(playerStats.season);

  const orderExpr = (() => {
    const dir = sortDir === "asc" ? asc : desc;
    switch (filters.sortBy) {
      case "name":
        return dir(players.fullName);
      case "position":
        return dir(sql`coalesce(${players.positions}[1], 'N/A')`);
      case "nflTeam":
        return dir(players.nflTeam);
      case "weekAvg":
        return dir(weekAvgExpr);
      case "bestWeek":
        return dir(bestWeekExpr);
      case "ownerTeamName":
        return dir(ownerTeamExpr);
      case "season":
        return dir(seasonExpr);
      case "seasonPoints":
      default:
        return dir(seasonPointsExpr);
    }
  })();

  const rows = await db
    .select({
      playerId: players.id,
      playerKey: players.playerKey,
      name: players.fullName,
      position: sql<string>`coalesce(${players.positions}[1], 'N/A')`,
      nflTeam: players.nflTeam,
      ownerTeamName: ownerTeamExpr,
      season: seasonExpr,
      seasonPoints: seasonPointsExpr,
      weekAvg: weekAvgExpr,
      bestWeek: bestWeekExpr,
    })
    .from(players)
    .leftJoin(playerStats, eq(playerStats.playerId, players.id))
    .leftJoin(teams, eq(playerStats.teamId, teams.id))
    .where(whereClause)
    .groupBy(players.id)
    .orderBy(orderExpr)
    .limit(limit)
    .offset(offset);

  const totalRows = await db
    .select({ total: sql<number>`count(distinct ${players.id})` })
    .from(players)
    .leftJoin(playerStats, eq(playerStats.playerId, players.id))
    .where(whereClause);

  return {
    players: rows.map((row) => ({
      playerId: row.playerId,
      playerKey: row.playerKey,
      name: row.name,
      position: row.position,
      nflTeam: row.nflTeam,
      ownerTeamName: row.ownerTeamName,
      season: row.season ?? null,
      seasonPoints: Number(toNumber(row.seasonPoints).toFixed(2)),
      weekAvg: Number(toNumber(row.weekAvg).toFixed(2)),
      bestWeek: Number(toNumber(row.bestWeek).toFixed(2)),
    })),
    total: toNumber(totalRows[0]?.total),
  };
}

export async function getPlayerByKey(playerKey: string): Promise<PlayerDetail | null> {
  const player = await db.select().from(players).where(eq(players.playerKey, playerKey)).limit(1);
  if (!player[0]) return null;

  const history = await db
    .select({
      season: playerStats.season,
      week: playerStats.week,
      points: playerStats.points,
      leagueId: playerStats.leagueId,
      teamId: playerStats.teamId,
      teamName: teams.name,
    })
    .from(playerStats)
    .leftJoin(teams, eq(playerStats.teamId, teams.id))
    .where(eq(playerStats.playerId, player[0].id))
    .orderBy(desc(playerStats.season), desc(playerStats.week));

  return {
    playerId: player[0].id,
    playerKey: player[0].playerKey,
    fullName: player[0].fullName,
    firstName: player[0].firstName,
    lastName: player[0].lastName,
    nflTeam: player[0].nflTeam,
    status: player[0].status,
    positions: player[0].positions,
    history: history.map((row) => ({
      season: row.season ?? 0,
      week: row.week,
      points: toNumber(row.points),
      leagueId: row.leagueId,
      teamId: row.teamId,
      teamName: row.teamName,
    })),
  };
}

export async function getTopScorers(params: { season: number; week?: number; position?: string; limit?: number }): Promise<PlayerScore[]> {
  const whereClause = and(
    eq(playerStats.season, params.season),
    params.week !== undefined ? eq(playerStats.week, params.week) : undefined,
    params.position ? sql`${params.position} = any(${players.positions})` : undefined,
  );

  if (params.week !== undefined) {
    // Specific week query: group by player + week so we get per-week points.
    const rows = await db
      .select({
        playerId: players.id,
        playerKey: players.playerKey,
        name: players.fullName,
        position: sql<string>`coalesce(${players.positions}[1], 'N/A')`,
        nflTeam: players.nflTeam,
        points: sql<number>`coalesce(sum(${playerStats.points}::numeric), 0)`,
        week: playerStats.week,
        season: playerStats.season,
      })
      .from(playerStats)
      .innerJoin(players, eq(playerStats.playerId, players.id))
      .where(whereClause)
      .groupBy(players.id, playerStats.week, playerStats.season)
      .orderBy(desc(sql`coalesce(sum(${playerStats.points}::numeric), 0)`))
      .limit(params.limit ?? 10);

    return rows.map((row) => ({
      playerId: row.playerId,
      playerKey: row.playerKey,
      name: row.name,
      position: row.position,
      nflTeam: row.nflTeam,
      points: toNumber(row.points),
      week: row.week,
      season: row.season ?? 0,
    }));
  }

  // Season-level query: sum all weeks, group only by player so each player
  // appears once with their total season points.
  const rows = await db
    .select({
      playerId: players.id,
      playerKey: players.playerKey,
      name: players.fullName,
      position: sql<string>`coalesce(${players.positions}[1], 'N/A')`,
      nflTeam: players.nflTeam,
      points: sql<number>`coalesce(sum(${playerStats.points}::numeric), 0)`,
      season: sql<number>`${params.season}`,
    })
    .from(playerStats)
    .innerJoin(players, eq(playerStats.playerId, players.id))
    .where(whereClause)
    .groupBy(players.id)
    .orderBy(desc(sql`coalesce(sum(${playerStats.points}::numeric), 0)`))
    .limit(params.limit ?? 10);

  return rows.map((row) => ({
    playerId: row.playerId,
    playerKey: row.playerKey,
    name: row.name,
    position: row.position,
    nflTeam: row.nflTeam,
    points: toNumber(row.points),
    week: null,
    season: params.season,
  }));
}

export async function getRoster(teamId: string, week: number, season?: number): Promise<RosterPlayer[]> {
  const id = Number(teamId);
  if (!Number.isFinite(id)) return [];

  const rows = await db
    .select({
      playerId: players.id,
      playerKey: players.playerKey,
      fullName: players.fullName,
      nflTeam: players.nflTeam,
      position: sql<string>`coalesce(${players.positions}[1], 'N/A')`,
      rosterPosition: rosters.rosterPosition,
      isStarting: rosters.isStarting,
      points: playerStats.points,
      status: players.status,
    })
    .from(rosters)
    .innerJoin(players, eq(rosters.playerId, players.id))
    .leftJoin(
      playerStats,
      and(
        eq(playerStats.playerId, rosters.playerId),
        eq(playerStats.leagueId, rosters.leagueId),
        eq(playerStats.week, rosters.week),
        season !== undefined ? eq(playerStats.season, season) : undefined,
      ),
    )
    .where(and(eq(rosters.teamId, id), eq(rosters.week, week)))
    .orderBy(desc(rosters.isStarting), asc(rosters.rosterPosition), asc(players.fullName));

  return rows.map((row) => ({
    playerId: row.playerId,
    playerKey: row.playerKey,
    fullName: row.fullName,
    nflTeam: row.nflTeam,
    position: row.position,
    rosterPosition: row.rosterPosition,
    isStarting: row.isStarting,
    points: toNumber(row.points),
    status: row.status,
  }));
}

export async function getManagerRosterHistory(managerId: string): Promise<PlayerWithSeasonStats[]> {
  const id = Number(managerId);
  if (!Number.isFinite(id)) return [];

  const rows = await db
    .select({
      playerId: players.id,
      playerKey: players.playerKey,
      fullName: players.fullName,
      nflTeam: players.nflTeam,
      season: leagues.season,
      points: sql<number>`coalesce(sum(${playerStats.points}::numeric), 0)`,
    })
    .from(teams)
    .innerJoin(rosters, eq(rosters.teamId, teams.id))
    .innerJoin(players, eq(players.id, rosters.playerId))
    .innerJoin(leagues, eq(leagues.id, teams.leagueId))
    .leftJoin(
      playerStats,
      and(
        eq(playerStats.playerId, rosters.playerId),
        eq(playerStats.teamId, teams.id),
        eq(playerStats.leagueId, teams.leagueId),
      ),
    )
    .where(eq(teams.managerId, id))
    .groupBy(players.id, leagues.season)
    .orderBy(desc(sql`coalesce(sum(${playerStats.points}::numeric), 0)`));

  const grouped = new Map<number, PlayerWithSeasonStats>();
  for (const row of rows) {
    const existing = grouped.get(row.playerId) ?? {
      playerId: row.playerId,
      playerKey: row.playerKey,
      fullName: row.fullName,
      nflTeam: row.nflTeam,
      seasons: [],
      totalPoints: 0,
    };
    if (!existing.seasons.includes(row.season) && row.season !== null) existing.seasons.push(row.season);
    existing.totalPoints += toNumber(row.points);
    grouped.set(row.playerId, existing);
  }

  return [...grouped.values()].sort((a, b) => b.totalPoints - a.totalPoints);
}

export async function crossViewQuery(params: {
  viewType: "team" | "manager";
  entityId: string;
  season?: number;
  week?: number;
  dataType: "record" | "roster" | "matchups" | "stats" | "transactions";
  position?: string;
  compareEntityId?: string;
}): Promise<CrossViewResult> {
  if (params.viewType === "team") {
    if (params.dataType === "record") {
      const teams = await getTeams({ season: params.season });
      return { viewType: "team", entityId: params.entityId, dataType: "record", data: teams.find((t) => String(t.id) === params.entityId) ?? null };
    }
    if (params.dataType === "roster") {
      const week = params.week ?? 1;
      return { viewType: "team", entityId: params.entityId, dataType: "roster", data: await getRoster(params.entityId, week, params.season) };
    }
    if (params.dataType === "matchups") {
      if (params.compareEntityId) {
        return { viewType: "team", entityId: params.entityId, dataType: "matchups", data: await getTeamMatchupHistory(params.entityId, params.compareEntityId) };
      }
      return { viewType: "team", entityId: params.entityId, dataType: "matchups", data: await getMatchups({ teamId: params.entityId, season: params.season, week: params.week }) };
    }
    if (params.dataType === "stats") {
      const result = await getPlayers({ teamId: params.entityId, season: params.season, position: params.position, limit: 100, offset: 0 });
      return { viewType: "team", entityId: params.entityId, dataType: "stats", data: result.players };
    }

    // Resolve the team's leagueId directly, then fetch transactions for that league.
    const teamRow = await db
      .select({ leagueId: teams.leagueId })
      .from(teams)
      .where(eq(teams.id, Number(params.entityId)))
      .limit(1);
    const teamLeagueId = teamRow[0]?.leagueId;
    const tx = teamLeagueId
      ? await db
          .select()
          .from(transactions)
          .where(eq(transactions.leagueId, teamLeagueId))
          .orderBy(desc(transactions.transactionTimestamp))
      : [];
    return { viewType: "team", entityId: params.entityId, dataType: "transactions", data: tx };
  }

  if (params.dataType === "record") {
    return { viewType: "manager", entityId: params.entityId, dataType: "record", data: await getManagerById(params.entityId) };
  }
  if (params.dataType === "roster") {
    return { viewType: "manager", entityId: params.entityId, dataType: "roster", data: await getManagerRosterHistory(params.entityId) };
  }
  if (params.dataType === "matchups") {
    if (params.compareEntityId) {
      return { viewType: "manager", entityId: params.entityId, dataType: "matchups", data: await getHeadToHead(params.entityId, params.compareEntityId) };
    }
    const teamsForManager = await getTeams({ managerId: params.entityId, season: params.season });
    const teamIds = new Set(teamsForManager.map((team) => team.id));
    const rows = await getMatchups({ season: params.season, week: params.week });
    return {
      viewType: "manager",
      entityId: params.entityId,
      dataType: "matchups",
      data: rows.filter((row) => teamIds.has(row.team1Id) || teamIds.has(row.team2Id)),
    };
  }
  if (params.dataType === "stats") {
    const teamsForManager = await getTeams({ managerId: params.entityId, season: params.season });
    const firstTeam = teamsForManager[0];
    if (!firstTeam) return { viewType: "manager", entityId: params.entityId, dataType: "stats", data: [] };
    const result = await getPlayers({ season: params.season, position: params.position, teamId: String(firstTeam.id), limit: 100, offset: 0 });
    return { viewType: "manager", entityId: params.entityId, dataType: "stats", data: result.players };
  }

  const managerTeams = await getTeams({ managerId: params.entityId, season: params.season });
  const leagueIds = [...new Set(managerTeams.map((team) => team.leagueId))];
  const tx = leagueIds.length
    ? await db
        .select()
        .from(transactions)
        .where(sql`${transactions.leagueId} = any(${leagueIds})`)
        .orderBy(desc(transactions.transactionTimestamp))
    : [];

  return { viewType: "manager", entityId: params.entityId, dataType: "transactions", data: tx };
}

// ---------------------------------------------------------------------------
// Season stats (pre-computed from matchups, includes expected wins)
// ---------------------------------------------------------------------------

export type SeasonStatRow = {
  teamId: number;
  teamKey: string;
  teamName: string;
  logoUrl: string | null;
  managerNickname: string | null;
  season: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  expectedWins: number;
  rank: number;
};

export async function getSeasonStats(filters: {
  leagueId?: string;
  season?: number;
  managerId?: string;
}): Promise<SeasonStatRow[]> {
  const leagueNumericId = filters.leagueId ? await resolveLeagueNumericId(filters.leagueId) : undefined;
  const managerNumericId = filters.managerId ? Number(filters.managerId) : undefined;

  const rows = await db
    .select({
      teamId: seasonStats.teamId,
      teamKey: teams.teamKey,
      teamName: teams.name,
      logoUrl: teams.logoUrl,
      managerNickname: managers.nickname,
      season: seasonStats.season,
      wins: seasonStats.wins,
      losses: seasonStats.losses,
      ties: seasonStats.ties,
      pointsFor: seasonStats.pointsFor,
      pointsAgainst: seasonStats.pointsAgainst,
      expectedWins: seasonStats.expectedWins,
      rank: seasonStats.rank,
    })
    .from(seasonStats)
    .innerJoin(teams, eq(seasonStats.teamId, teams.id))
    .leftJoin(managers, eq(teams.managerId, managers.id))
    .leftJoin(leagues, eq(seasonStats.leagueId, leagues.id))
    .where(
      and(
        leagueNumericId ? eq(seasonStats.leagueId, leagueNumericId) : undefined,
        filters.season ? eq(seasonStats.season, filters.season) : undefined,
        managerNumericId ? eq(teams.managerId, managerNumericId) : undefined,
      ),
    )
    .orderBy(asc(seasonStats.rank));

  return rows.map((row) => ({
    teamId: row.teamId,
    teamKey: row.teamKey,
    teamName: row.teamName,
    logoUrl: row.logoUrl,
    managerNickname: row.managerNickname,
    season: row.season,
    wins: row.wins,
    losses: row.losses,
    ties: row.ties,
    pointsFor: toNumber(row.pointsFor),
    pointsAgainst: toNumber(row.pointsAgainst),
    expectedWins: toNumber(row.expectedWins),
    rank: row.rank,
  }));
}

// ---------------------------------------------------------------------------
// Playoff results
// ---------------------------------------------------------------------------

export type PlayoffResultRow = {
  teamId: number;
  teamKey: string;
  teamName: string;
  logoUrl: string | null;
  managerNickname: string | null;
  season: number;
  madePlayoffs: boolean;
  playoffWins: number;
  playoffLosses: number;
  isChampion: boolean;
  isConsolationWinner: boolean;
  finalRank: number;
};

export type ChampionHistoryRow = {
  season: number;
  teamName: string;
  managerNickname: string | null;
  logoUrl: string | null;
};

export async function getPlayoffResults(filters: {
  leagueId?: string;
  season?: number;
  managerId?: string;
  championsOnly?: boolean;
}): Promise<PlayoffResultRow[]> {
  const leagueNumericId = filters.leagueId ? await resolveLeagueNumericId(filters.leagueId) : undefined;
  const managerNumericId = filters.managerId ? Number(filters.managerId) : undefined;

  const rows = await db
    .select({
      teamId: playoffResults.teamId,
      teamKey: teams.teamKey,
      teamName: teams.name,
      logoUrl: teams.logoUrl,
      managerNickname: managers.nickname,
      season: playoffResults.season,
      madePlayoffs: playoffResults.madePlayoffs,
      playoffWins: playoffResults.playoffWins,
      playoffLosses: playoffResults.playoffLosses,
      isChampion: playoffResults.isChampion,
      isConsolationWinner: playoffResults.isConsolationWinner,
      finalRank: playoffResults.finalRank,
    })
    .from(playoffResults)
    .innerJoin(teams, eq(playoffResults.teamId, teams.id))
    .leftJoin(managers, eq(teams.managerId, managers.id))
    .where(
      and(
        leagueNumericId ? eq(playoffResults.leagueId, leagueNumericId) : undefined,
        filters.season ? eq(playoffResults.season, filters.season) : undefined,
        managerNumericId ? eq(teams.managerId, managerNumericId) : undefined,
        filters.championsOnly ? eq(playoffResults.isChampion, true) : undefined,
      ),
    )
    .orderBy(desc(playoffResults.season), asc(playoffResults.finalRank));

  return rows.map((row) => ({
    teamId: row.teamId,
    teamKey: row.teamKey,
    teamName: row.teamName,
    logoUrl: row.logoUrl,
    managerNickname: row.managerNickname,
    season: row.season,
    madePlayoffs: row.madePlayoffs,
    playoffWins: row.playoffWins,
    playoffLosses: row.playoffLosses,
    isChampion: row.isChampion,
    isConsolationWinner: row.isConsolationWinner,
    finalRank: row.finalRank,
  }));
}

export async function getChampionHistory(): Promise<ChampionHistoryRow[]> {
  const rows = await db
    .select({
      season: playoffResults.season,
      teamName: teams.name,
      managerNickname: managers.nickname,
      logoUrl: teams.logoUrl,
    })
    .from(playoffResults)
    .innerJoin(teams, eq(playoffResults.teamId, teams.id))
    .leftJoin(managers, eq(teams.managerId, managers.id))
    .where(eq(playoffResults.isChampion, true))
    .orderBy(desc(playoffResults.season));

  return rows.map((row) => ({
    season: row.season,
    teamName: row.teamName,
    managerNickname: row.managerNickname,
    logoUrl: row.logoUrl,
  }));
}
