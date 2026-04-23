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

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
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

// --- Raw Yahoo API (fantasy_content) format helpers ---
// Yahoo returns object-maps with numeric string keys and a "count" key, e.g. {0:{...},1:{...},count:2}

function yahooToArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.map(asRecord);
  const record = asRecord(value);
  return Object.entries(record)
    .filter(([key]) => key !== "count")
    .map(([, item]) => asRecord(item));
}

function yahooNormalize(value: unknown, key: string): Record<string, unknown>[] {
  return yahooToArray(value)
    .map((item) => (key in item ? asRecord(item[key]) : item))
    .filter((item) => Object.keys(item).length > 0);
}

function yahooFlatten(node: unknown): Record<string, unknown> {
  if (Array.isArray(node)) {
    const merged: Record<string, unknown> = {};
    for (const entry of node) {
      for (const [k, v] of Object.entries(yahooFlatten(entry))) {
        if (!(k in merged)) {
          merged[k] = v;
        } else if (Array.isArray(merged[k])) {
          (merged[k] as unknown[]).push(v);
        } else {
          merged[k] = [merged[k], v];
        }
      }
    }
    return merged;
  }
  return asRecord(node);
}

function getYahooLeagueSections(data: unknown): Record<string, unknown>[] {
  const fc = asRecord(asRecord(data).fantasy_content);
  const league = fc.league;
  if (Array.isArray(league)) return league.map(asRecord);
  if (league && typeof league === "object") return [asRecord(league)];
  return [];
}

const NON_STARTING_POSITIONS = new Set(["BN", "IR"]);

function normalizePositions(player: Record<string, unknown>): string[] {
  if (Array.isArray(player.positions)) return player.positions.map((value) => asString(value)).filter(Boolean);
  if (Array.isArray(player.eligible_positions)) {
    return player.eligible_positions.map((value) => asString(value)).filter(Boolean);
  }
  return [];
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
  const teams = rows
    .map((team) => {
      const manager = list(team.managers)[0] ?? {};
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
        // TODO: leagueId currently stores Yahoo league_id, but teams.leagueId FK points to leagues.id.
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
    })
    .filter((team) => Boolean(team.teamKey) && team.leagueId !== 0);

  return { teams, managers: [...managersByGuid.values()] };
}

export function parsePlayers(data: unknown): PlayerInsert[] {
  const rows = list(asRecord(data).players ?? data);
  return rows
    .map((player) => ({
      playerKey: asString(player.player_key),
      playerId: asString(player.player_id),
      fullName: asString(player.full_name, "Unknown Player"),
      firstName: asString(player.first_name),
      lastName: asString(player.last_name),
      positions: normalizePositions(player),
      nflTeam: asString(player.editorial_team_abbr),
      jerseyNumber: asString(player.uniform_number),
      status: asString(player.status),
      headshotUrl: asString(asRecord(player.headshot).url),
      rawData: player,
    }))
    .filter((player) => Boolean(player.playerKey));
}

export function parseMatchups(data: unknown): MatchupInsert[] {
  const root = asRecord(data);

  if (root.fantasy_content) {
    const sections = getYahooLeagueSections(data);
    const leagueRoot = sections.find((s) => s.league_key || s.league_id) ?? {};
    // TODO: leagueId currently stores Yahoo league_id, but matchups.leagueId FK points to leagues.id.
    const leagueId = asNumber(leagueRoot.league_id);
    const scoreboardSection = sections.find((s) => s.scoreboard);
    if (!scoreboardSection) return [];

    const matchupsBlock = asRecord(asRecord(scoreboardSection.scoreboard).matchups);
    const rawMatchups = yahooNormalize(matchupsBlock, "matchup").map(yahooFlatten);

    return rawMatchups
      .map((matchupNode) => {
        const teams = yahooNormalize(matchupNode.teams, "team").map(yahooFlatten);
        const team1 = teams[0] ?? {};
        const team2 = teams[1] ?? {};
        const team1Points = asString(asRecord(team1.team_points).total, "0");
        const team2Points = asString(asRecord(team2.team_points).total, "0");
        const team1PointsNum = Number(team1Points);
        const team2PointsNum = Number(team2Points);
        const team1Id = asNumber(team1.team_id ?? team1.id);
        const team2Id = asNumber(team2.team_id ?? team2.id);
        const winnerTeamId =
          Number.isFinite(team1PointsNum) && Number.isFinite(team2PointsNum) && team1PointsNum !== team2PointsNum
            ? team1PointsNum > team2PointsNum
              ? team1Id
              : team2Id
            : null;
        return {
          leagueId,
          week: asNumber(matchupNode.week),
          team1Id,
          team2Id,
          team1Points,
          team2Points,
          winnerTeamId,
          isPlayoffs: asBool(matchupNode.is_playoffs),
          isConsolation: asBool(matchupNode.is_consolation),
          rawData: matchupNode,
        } satisfies MatchupInsert;
      })
      .filter((m) => m.leagueId && m.team1Id && m.team2Id);
  }

  const rows = list(root.matchups ?? data);
  return rows
    .map((matchup) => {
      const teams = list(matchup.teams);
      const team1 = teams[0] ?? {};
      const team2 = teams[1] ?? {};

      return {
        // TODO: leagueId currently stores Yahoo league_id, but matchups.leagueId FK points to leagues.id.
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
  const root = asRecord(data);

  if (root.fantasy_content) {
    const sections = getYahooLeagueSections(data);
    const leagueRoot = sections.find((s) => s.league_key || s.league_id) ?? {};
    // TODO: leagueId currently stores Yahoo league_id, but rosters.leagueId FK points to leagues.id.
    const leagueId = asNumber(leagueRoot.league_id);
    const teamsSection = sections.find((s) => Object.keys(asRecord(s.teams)).length > 0);
    if (!teamsSection) return [];

    const rawTeams = yahooNormalize(asRecord(teamsSection.teams), "team").map(yahooFlatten);
    const result: RosterInsert[] = [];

    for (const teamNode of rawTeams) {
      const teamId = asNumber(teamNode.team_id);
      if (!teamId) continue;
      const rosterBlock = asRecord(teamNode.roster);
      const week = asNumber(rosterBlock.week);
      const playerRows = yahooNormalize(asRecord(rosterBlock.players), "player").map(yahooFlatten);

      for (const player of playerRows) {
        const playerId = asNumber(player.player_id);
        if (!playerId) continue;
        const selectedPosition = asString(yahooFlatten(player.selected_position).position);
        result.push({
          teamId,
          playerId,
          leagueId,
          week,
          rosterPosition: selectedPosition,
          isStarting: !NON_STARTING_POSITIONS.has(selectedPosition),
        });
      }
    }

    return result.filter((r) => r.teamId !== 0 && r.playerId !== 0);
  }

  const rows = list(root.rosters ?? data);
  return rows
    .map((roster) => ({
      teamId: asNumber(roster.team_id),
      playerId: asNumber(roster.player_id),
      // TODO: leagueId currently stores Yahoo league_id, but rosters.leagueId FK points to leagues.id.
      leagueId: asNumber(roster.league_id),
      week: asNumber(roster.week),
      rosterPosition: asString(roster.roster_position),
      isStarting: asBool(roster.is_starting),
    }))
    .filter((roster) => roster.teamId !== 0 && roster.playerId !== 0);
}

export function parsePlayerStats(data: unknown): PlayerStatInsert[] {
  const rows = list(asRecord(data).player_stats ?? data);
  return rows
    .map((stat) => ({
      playerId: asNumber(stat.player_id),
      // TODO: leagueId currently stores Yahoo league_id, but playerStats.leagueId FK points to leagues.id.
      leagueId: asNumber(stat.league_id),
      teamId: asNullableNumber(stat.team_id),
      week: asNullableNumber(stat.week),
      season: asNumber(stat.season),
      statValues: asRecord(stat.stat_values),
      points: asString(stat.points, "0"),
    }))
    .filter((stat) => stat.playerId !== 0 && stat.season !== 0);
}

export function parseTransactions(data: unknown): TransactionInsert[] {
  const root = asRecord(data);

  if (root.fantasy_content) {
    const sections = getYahooLeagueSections(data);
    const leagueRoot = sections.find((s) => s.league_key || s.league_id) ?? {};
    // TODO: leagueId currently stores Yahoo league_id, but transactions.leagueId FK points to leagues.id.
    const leagueId = asNumber(leagueRoot.league_id);
    const txSection = sections.find((s) => s.transactions);
    if (!txSection) return [];

    const rawTxs = yahooNormalize(asRecord(txSection.transactions), "transaction").map(yahooFlatten);
    return rawTxs
      .map((tx) => ({
        leagueId,
        transactionKey: asString(tx.transaction_key),
        type: asString(tx.type, "add"),
        status: asString(tx.status),
        transactionTimestamp: asNumber(tx.timestamp),
        players: yahooToArray(asRecord(tx.players)).map((entry) =>
          "player" in entry ? yahooFlatten(entry.player) : yahooFlatten(entry),
        ),
        rawData: tx,
      } satisfies TransactionInsert))
      .filter((tx) => Boolean(tx.transactionKey));
  }

  const rows = list(root.transactions ?? data);
  return rows
    .map((tx) => ({
      // TODO: leagueId currently stores Yahoo league_id, but transactions.leagueId FK points to leagues.id.
      leagueId: asNumber(tx.league_id),
      transactionKey: asString(tx.transaction_key),
      type: asString(tx.type, "add"),
      status: asString(tx.status),
      transactionTimestamp: asNumber(tx.timestamp),
      players: Array.isArray(tx.players) ? tx.players : [],
      rawData: tx,
    }))
    .filter((tx) => Boolean(tx.transactionKey));
}

export function parseStatCategories(data: unknown): StatCategoryInsert[] {
  const root = asRecord(data);
  let source: unknown = root.stat_categories ?? asRecord(root.settings).stat_categories;
  if (source === undefined) {
    if (Array.isArray(data)) {
      source = data;
    } else if (root.stat_id) {
      source = [root];
    } else {
      source = [];
    }
  }
  const rows = list(source);
  const deduped = new Map<string, StatCategoryInsert>();

  for (const stat of rows) {
    const parsed = {
      // TODO: leagueId currently stores Yahoo league_id, but statCategories.leagueId FK points to leagues.id.
      leagueId: asNumber(stat.league_id),
      statId: asString(stat.stat_id),
      name: asString(stat.name),
      displayName: asString(stat.display_name),
      sortOrder: asNumber(stat.sort_order),
      isOnlyDisplayStat: asBool(stat.is_only_display_stat),
    } satisfies StatCategoryInsert;

    if (parsed.leagueId === 0 || parsed.statId === "") {
      continue;
    }

    deduped.set(`${parsed.leagueId}:${parsed.statId}`, parsed);
  }

  return [...deduped.values()];
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

  // Raw Yahoo API format (fantasy_content wrapper)
  if (root.fantasy_content) {
    const sections = getYahooLeagueSections(data);
    for (const section of sections) {
      if (section.scoreboard) return "matchups" as const;
      if (section.transactions) return "transactions" as const;
    }
    for (const section of sections) {
      const teamsBlock = asRecord(section.teams);
      if (Object.keys(teamsBlock).length > 0) {
        const rawTeams = yahooNormalize(teamsBlock, "team");
        if (rawTeams.some((t) => "roster" in yahooFlatten(t))) return "rosters" as const;
        return "teams" as const;
      }
    }
    if (sections.some((s) => s.league_key || s.league_id)) return "league" as const;
  }

  return "unknown" as const;
}
