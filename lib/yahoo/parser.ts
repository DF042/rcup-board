import type {
  LeagueInsert,
  ManagerInsert,
  MatchupInsert,
  PlayerInsert,
  PlayerStatInsert,
  RosterInsert,
  StatCategoryInsert,
  TeamInsert,
  TransactionInsert,
} from "@/lib/db/schema";

const asRecord = (value: unknown): Record<string, unknown> => (typeof value === "object" && value ? value as Record<string, unknown> : {});
const asString = (value: unknown, fallback = ""): string => (value == null ? fallback : String(value));
const asNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const asNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  return asNumber(value);
};
const asBool = (value: unknown): boolean => value === true || value === "1" || value === 1;

function list(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.map(asRecord);
  const record = asRecord(value);
  return Object.values(record).map(asRecord);
}

export function parseLeague(data: unknown): LeagueInsert {
  const raw = asRecord(data);
  return {
    leagueKey: asString(raw.league_key),
    leagueId: asString(raw.league_id),
    season: asNumber(raw.season),
    name: asString(raw.name, "Yahoo League"),
    sport: asString(raw.sport, "nfl"),
    scoringType: asString(raw.scoring_type),
    numTeams: asNumber(raw.num_teams),
    settings: asRecord(raw.settings),
    rawData: raw,
  };
}

export function parseTeams(data: unknown): { teams: TeamInsert[]; managers: ManagerInsert[] } {
  const rows = list(asRecord(data).teams ?? data);
  const managersByGuid = new Map<string, ManagerInsert>();
  const teams = rows.map((team) => {
    const manager = list(team.managers)[0];
    const guid = asString(manager.guid);
    if (guid) {
      managersByGuid.set(guid, {
        guid,
        nickname: asString(manager.nickname, "Manager"),
        email: asString(manager.email),
        imageUrl: asString(manager.image_url),
      });
    }

    return {
      teamKey: asString(team.team_key),
      teamId: asString(team.team_id),
      leagueId: asNumber(team.league_id),
      name: asString(team.name, "Team"),
      logoUrl: asString(team.logo_url),
      waiverPriority: asNumber(team.waiver_priority),
      faabBalance: asNumber(team.faab_balance),
      numberOfMoves: asNumber(team.number_of_moves),
      numberOfTrades: asNumber(team.number_of_trades),
      standings: asRecord(team.standings),
      draftResults: asRecord(team.draft_results),
      rawData: team,
    };
  });

  return { teams, managers: [...managersByGuid.values()] };
}

export function parsePlayers(data: unknown): PlayerInsert[] {
  const rows = list(asRecord(data).players ?? data);
  return rows.map((player) => ({
    playerKey: asString(player.player_key),
    playerId: asString(player.player_id),
    fullName: asString(player.full_name, "Unknown Player"),
    firstName: asString(player.first_name),
    lastName: asString(player.last_name),
    positions: (player.positions as string[] | undefined) ?? (player.eligible_positions as string[] | undefined) ?? [],
    nflTeam: asString(player.editorial_team_abbr),
    jerseyNumber: asString(player.uniform_number),
    status: asString(player.status),
    headshotUrl: asString(asRecord(player.headshot).url),
    rawData: player,
  }));
}

export function parseMatchups(data: unknown): MatchupInsert[] {
  const rows = list(asRecord(data).matchups ?? data);
  return rows
    .map((matchup) => {
      const teams = list(matchup.teams);
      const team1 = teams[0] ?? {};
      const team2 = teams[1] ?? {};

      return {
        leagueId: asNumber(matchup.league_id),
        week: asNumber(matchup.week),
        team1Id: asNumber(team1.team_id ?? team1.id),
        team2Id: asNumber(team2.team_id ?? team2.id),
        team1Points: asString(asRecord(team1.team_points).total, "0"),
        team2Points: asString(asRecord(team2.team_points).total, "0"),
        winnerTeamId: asNullableNumber(matchup.winner_team_id),
        isPlayoffs: asBool(matchup.is_playoffs),
        isConsolation: asBool(matchup.is_consolation),
        rawData: matchup,
      } satisfies MatchupInsert;
    })
    .filter((m) => m.leagueId && m.team1Id && m.team2Id);
}

export function parseRosters(data: unknown): RosterInsert[] {
  const rows = list(asRecord(data).rosters ?? data);
  return rows.map((roster) => ({
    teamId: asNumber(roster.team_id),
    playerId: asNumber(roster.player_id),
    leagueId: asNumber(roster.league_id),
    week: asNumber(roster.week),
    rosterPosition: asString(roster.roster_position),
    isStarting: asBool(roster.is_starting),
  }));
}

export function parsePlayerStats(data: unknown): PlayerStatInsert[] {
  const rows = list(asRecord(data).player_stats ?? data);
  return rows.map((stat) => ({
    playerId: asNumber(stat.player_id),
    leagueId: asNumber(stat.league_id),
    teamId: asNullableNumber(stat.team_id),
    week: asNullableNumber(stat.week),
    season: asNumber(stat.season),
    statValues: asRecord(stat.stat_values),
    points: asString(stat.points, "0"),
  }));
}

export function parseTransactions(data: unknown): TransactionInsert[] {
  const rows = list(asRecord(data).transactions ?? data);
  return rows.map((tx) => ({
    leagueId: asNumber(tx.league_id),
    transactionKey: asString(tx.transaction_key),
    type: asString(tx.type, "add"),
    status: asString(tx.status),
    transactionTimestamp: asNumber(tx.timestamp),
    players: Array.isArray(tx.players) ? tx.players : [],
    rawData: tx,
  }));
}

export function parseStatCategories(data: unknown): StatCategoryInsert[] {
  const rows = list(asRecord(data).stat_categories ?? data);
  return rows.map((stat) => ({
    leagueId: asNumber(stat.league_id),
    statId: asString(stat.stat_id),
    name: asString(stat.name),
    displayName: asString(stat.display_name),
    sortOrder: asNumber(stat.sort_order),
    isOnlyDisplayStat: asBool(stat.is_only_display_stat),
  }));
}

export function detectDataType(data: unknown) {
  const root = asRecord(data);
  if (root.league_key) return "league" as const;
  if (root.teams) return "teams" as const;
  if (root.players) return "players" as const;
  if (root.matchups) return "matchups" as const;
  if (root.rosters) return "rosters" as const;
  if (root.player_stats) return "stats" as const;
  if (root.transactions) return "transactions" as const;
  return "unknown" as const;
}
