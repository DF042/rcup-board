#!/usr/bin/env tsx
import fs from "node:fs/promises";
import path from "node:path";
import https from "node:https";
import { URL, pathToFileURL } from "node:url";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

type JsonValue = null | string | number | boolean | JsonValue[] | { [key: string]: JsonValue };
type JsonRecord = Record<string, unknown>;

type YahooTokens = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
  acquired_at: number;
};

type CliOptions = {
  league: string;
  weeks: number;
  season?: number;
  out: string;
  debug?: boolean;
};

const YAHOO_AUTH_URL = "https://api.login.yahoo.com/oauth2/request_auth";
const YAHOO_TOKEN_URL = "https://api.login.yahoo.com/oauth2/get_token";
const YAHOO_API_BASE = "https://fantasysports.yahooapis.com/fantasy/v2";
const TOKEN_FILE = path.resolve(process.cwd(), ".yahoo-tokens.json");
const DEFAULT_WEEKS = 18;
const TOKEN_REFRESH_BUFFER_MS = 60_000;
const RATE_LIMIT_DELAY_MS = 300;
const NON_STARTING_POSITIONS = new Set(["BN", "IR"]);
const LEAGUE_KEY_SEPARATOR = ".l.";
const NFL_GAME_KEYS: Record<string, string> = {
  "2025": "461",
  "2024": "449",
  "2023": "423",
  "2022": "414",
  "2021": "406",
  "2020": "399",
  "2019": "390",
  "2018": "380",
  "2017": "371",
  "2016": "359",
  "2015": "348",
  "2014": "331",
  "2013": "314",
  "2012": "273",
  "2011": "257",
  "2010": "242",
};

let lastApiCallAt = 0;

function asRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null ? (value as JsonRecord) : {};
}

function asString(value: unknown, fallback = ""): string {
  return value == null ? fallback : String(value);
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => asString(entry)).filter(Boolean);
  }
  if (value == null) return [];
  const single = asString(value);
  return single ? [single] : [];
}

function toArray(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) return value.map((item) => asRecord(item));
  const record = asRecord(value);
  return Object.entries(record)
    .filter(([key]) => key !== "count")
    .map(([, item]) => asRecord(item));
}

function normalizeNestedCollection(value: unknown, key: string): JsonRecord[] {
  return toArray(value)
    .map((item) => {
      if (key in item) return flattenNode(item[key]);
      return item;
    })
    .filter((item) => Object.keys(item).length > 0);
}

function parseEnvLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const eqIndex = trimmed.indexOf("=");
  if (eqIndex <= 0) return null;
  const key = trimmed.slice(0, eqIndex).trim();
  let value = trimmed.slice(eqIndex + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

async function loadEnvDefaults() {
  const envPaths = [".env.local", ".env"];
  for (const envPath of envPaths) {
    const absolute = path.resolve(process.cwd(), envPath);
    try {
      const content = await fs.readFile(absolute, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const parsed = parseEnvLine(line);
        if (!parsed) continue;
        if (process.env[parsed.key] == null || process.env[parsed.key] === "") {
          process.env[parsed.key] = parsed.value;
        }
      }
    } catch {
      // ignore missing env files
    }
  }
}

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = argv[i + 1];

    if (arg === "--league") {
      options.league = value;
      i += 1;
      continue;
    }
    if (arg === "--weeks") {
      options.weeks = asNumber(value, DEFAULT_WEEKS);
      i += 1;
      continue;
    }
    if (arg === "--season") {
      options.season = asNumber(value);
      i += 1;
      continue;
    }
    if (arg === "--out") {
      options.out = value;
      i += 1;
      continue;
    }
    if (arg === "--debug") {
      options.debug = true;
      continue;
    }
  }

  if (!options.league) {
    throw new Error(
      "Usage: npm run fetch-yahoo -- --league <league_key> [--weeks <n>] [--out <dir>] [--season <year>] [--debug]",
    );
  }

  return {
    league: options.league,
    weeks: options.weeks && options.weeks > 0 ? options.weeks : DEFAULT_WEEKS,
    season: options.season,
    out: options.out ? path.resolve(process.cwd(), options.out) : path.resolve(process.cwd(), "data"),
    debug: options.debug,
  };
}

function requestJson<T>(
  requestUrl: string,
  {
    method = "GET",
    headers,
    body,
  }: { method?: "GET" | "POST"; headers?: Record<string, string>; body?: string } = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    const url = new URL(requestUrl);
    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        method,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`HTTP ${res.statusCode ?? "unknown"}: ${raw}`));
            return;
          }
          try {
            resolve(JSON.parse(raw) as T);
          } catch (error) {
            reject(new Error(`Failed to parse JSON from ${requestUrl}: ${(error as Error).message}`));
          }
        });
      },
    );

    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function yahooApiGet(pathname: string, accessToken: string): Promise<JsonRecord> {
  const sinceLastCall = Date.now() - lastApiCallAt;
  if (sinceLastCall < RATE_LIMIT_DELAY_MS) {
    await sleep(RATE_LIMIT_DELAY_MS - sinceLastCall);
  }

  const divider = pathname.includes("?") ? "&" : "?";
  const url = `${YAHOO_API_BASE}${pathname}${divider}format=json`;

  const response = await requestJson<JsonRecord>(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  lastApiCallAt = Date.now();
  return response;
}

async function readTokenFile(): Promise<YahooTokens | null> {
  try {
    const content = await fs.readFile(TOKEN_FILE, "utf8");
    return JSON.parse(content) as YahooTokens;
  } catch {
    return null;
  }
}

async function writeTokenFile(tokens: YahooTokens) {
  await fs.writeFile(TOKEN_FILE, `${JSON.stringify(tokens, null, 2)}\n`, "utf8");
}

function isAccessTokenExpired(tokens: YahooTokens): boolean {
  if (!tokens.expires_in) return false;
  const expiresAt = tokens.acquired_at + tokens.expires_in * 1000;
  return Date.now() >= expiresAt - TOKEN_REFRESH_BUFFER_MS;
}

async function exchangeToken(
  params: Record<string, string>,
  clientId: string,
  clientSecret: string,
): Promise<YahooTokens> {
  const body = new URLSearchParams(params).toString();
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await requestJson<JsonRecord>(YAHOO_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(body).toString(),
      Accept: "application/json",
    },
    body,
  });

  return {
    access_token: asString(response.access_token),
    refresh_token: asString(response.refresh_token),
    token_type: asString(response.token_type),
    expires_in: asNumber(response.expires_in, 3600),
    acquired_at: Date.now(),
  };
}

async function promptForAuthCode(clientId: string): Promise<string> {
  const authUrl = new URL(YAHOO_AUTH_URL);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", "oob");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "fspt-r");

  console.log("Open this URL in your browser, approve access, then paste the verifier code:\n");
  console.log(`${authUrl.toString()}\n`);

  const rl = readline.createInterface({ input, output });
  const code = (await rl.question("Yahoo verifier code: ")).trim();
  rl.close();

  if (!code) {
    throw new Error("No verifier code provided.");
  }

  return code;
}

async function ensureAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const existing = await readTokenFile();
  if (existing?.access_token && !isAccessTokenExpired(existing)) {
    return existing.access_token;
  }

  if (existing?.refresh_token) {
    try {
      const refreshed = await exchangeToken(
        {
          grant_type: "refresh_token",
          redirect_uri: "oob",
          refresh_token: existing.refresh_token,
        },
        clientId,
        clientSecret,
      );
      const merged: YahooTokens = {
        ...existing,
        ...refreshed,
        refresh_token: refreshed.refresh_token || existing.refresh_token,
      };
      await writeTokenFile(merged);
      return merged.access_token;
    } catch {
      // fallback to auth-code flow
    }
  }

  const code = await promptForAuthCode(clientId);
  const fresh = await exchangeToken(
    {
      grant_type: "authorization_code",
      redirect_uri: "oob",
      code,
    },
    clientId,
    clientSecret,
  );

  await writeTokenFile(fresh);
  return fresh.access_token;
}

function getLeagueSection(response: JsonRecord): JsonRecord[] {
  const fantasyContent = asRecord(response.fantasy_content);
  const league = fantasyContent.league;
  if (Array.isArray(league)) return league.map((entry) => asRecord(entry));
  if (league && typeof league === "object") return [asRecord(league)];
  return [];
}

function getFirstLeagueRoot(response: JsonRecord): JsonRecord {
  const sections = getLeagueSection(response);
  for (const section of sections) {
    if (section.league_key || section.league_id) {
      return section;
    }
  }
  return {};
}

function flattenNode(node: unknown): JsonRecord {
  if (Array.isArray(node)) {
    const merged: JsonRecord = {};
    for (const entry of node) {
      const record = flattenNode(entry);
      for (const [key, value] of Object.entries(record)) {
        if (!(key in merged)) {
          merged[key] = value;
          continue;
        }
        if (Array.isArray(merged[key])) {
          (merged[key] as unknown[]).push(value);
        } else {
          merged[key] = [merged[key], value];
        }
      }
    }
    return merged;
  }

  const record = asRecord(node);
  const numericKeys = Object.keys(record).filter((k) => k !== "count" && /^\d+$/.test(k));
  const nonNumericKeys = Object.keys(record).filter((k) => k !== "count" && !/^\d+$/.test(k));

  if (numericKeys.length === 0) return record;

  const numericValues = numericKeys
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => record[k]);
  const merged = flattenNode(numericValues);

  for (const key of nonNumericKeys) {
    merged[key] = record[key];
  }

  return merged;
}

function extractManagers(teamNode: JsonRecord): JsonRecord[] {
  const managersValue = teamNode.managers;
  if (!managersValue) return [];
  const managerEntries = normalizeNestedCollection(managersValue, "manager");
  if (managerEntries.length > 0) return managerEntries;
  return toArray(managersValue);
}

function extractTeams(response: JsonRecord, leagueId: string): { teams: JsonRecord[]; managerCount: number } {
  const sections = getLeagueSection(response);
  const teamsBlock = sections
    .map((section) => asRecord(section.teams))
    .find((block) => Object.keys(block).length > 0);

  const rawTeams = normalizeNestedCollection(teamsBlock, "team").map((entry) => flattenNode(entry));

  let managerCount = 0;

  const teams = rawTeams.map((teamNode) => {
    const managerRows = extractManagers(teamNode).map((manager) => ({
      guid: asString(manager.guid),
      nickname: asString(manager.nickname),
      email: asString(manager.email),
      image_url: asString(manager.image_url),
    }));
    managerCount += managerRows.length;

    const logosBlock = asRecord(teamNode.team_logos);
    const logoRows = normalizeNestedCollection(logosBlock, "team_logo");
    const logoUrl = asString(logoRows[0]?.url ?? teamNode.logo_url);

    return {
      team_key: asString(teamNode.team_key),
      team_id: asString(teamNode.team_id),
      league_id: leagueId,
      name: asString(teamNode.name),
      logo_url: logoUrl,
      waiver_priority: teamNode.waiver_priority,
      faab_balance: teamNode.faab_balance,
      number_of_moves: teamNode.number_of_moves,
      number_of_trades: teamNode.number_of_trades,
      standings: asRecord(teamNode.standings || teamNode.team_standings),
      draft_results: asRecord(teamNode.draft_results),
      managers: managerRows,
    };
  });

  return { teams, managerCount };
}

function extractPlayers(response: JsonRecord): JsonRecord[] {
  const sections = getLeagueSection(response);
  const playersBlock = sections
    .map((section) => asRecord(section.players))
    .find((block) => Object.keys(block).length > 0);

  const rawPlayers = normalizeNestedCollection(playersBlock, "player").map((entry) => flattenNode(entry));

  return rawPlayers.map((playerNode) => {
    const nameNode = asRecord(playerNode.name);
    const headshotBlock = asRecord(playerNode.headshot);
    const imageUrl = asString(headshotBlock.url || asRecord(playerNode.image_url).url || playerNode.image_url);

    const eligiblePositionRows = normalizeNestedCollection(playerNode.eligible_positions, "eligible_position");
    const eligiblePositions = (
      eligiblePositionRows.length
        ? eligiblePositionRows.map((position) => position.position ?? position.value ?? position)
        : stringList(playerNode.eligible_positions)
    )
      .map((position) => asString(position))
      .filter(Boolean);

    return {
      player_key: asString(playerNode.player_key),
      player_id: asString(playerNode.player_id),
      full_name: asString(nameNode.full ?? playerNode.full_name),
      first_name: asString(nameNode.first ?? playerNode.first_name),
      last_name: asString(nameNode.last ?? playerNode.last_name),
      eligible_positions: eligiblePositions,
      editorial_team_abbr: asString(playerNode.editorial_team_abbr),
      uniform_number: asString(playerNode.uniform_number),
      status: asString(playerNode.status),
      headshot: { url: imageUrl },
    };
  });
}

function extractMatchups(response: JsonRecord, leagueId: number, week: number): JsonRecord[] {
  const sections = getLeagueSection(response);
  let scoreboardBlock = sections
    .map((section) => asRecord(section.scoreboard))
    .find((block) => Object.keys(block).length > 0);
  if ((!scoreboardBlock || Object.keys(scoreboardBlock).length === 0) && sections.length > 1) {
    scoreboardBlock = asRecord(asRecord(sections[1])?.scoreboard);
  }
  const innerScoreboard = asRecord((scoreboardBlock as JsonRecord)?.["0"] ?? scoreboardBlock);
  const matchupsBlock = asRecord(innerScoreboard.matchups ?? (scoreboardBlock as JsonRecord)?.matchups);

  const rawMatchups = normalizeNestedCollection(matchupsBlock, "matchup").map((entry) => flattenNode(entry));

  return rawMatchups.map((matchupNode) => {
    const teams = normalizeNestedCollection(matchupNode.teams, "team").map((entry) => flattenNode(entry));
    const mappedTeams = teams.slice(0, 2).map((team) => ({
      team_id: asString(team.team_id),
      team_points: { total: asString(asRecord(team.team_points).total, "0") },
    }));

    const [teamA, teamB] = mappedTeams;
    const aPoints = Number(teamA?.team_points.total ?? "NaN");
    const bPoints = Number(teamB?.team_points.total ?? "NaN");

    let winnerTeamId: number | null = null;
    if (Number.isFinite(aPoints) && Number.isFinite(bPoints) && aPoints !== bPoints) {
      winnerTeamId = aPoints > bPoints ? asNumber(teamA.team_id) : asNumber(teamB.team_id);
    }

    return {
      league_id: leagueId,
      week,
      is_playoffs: asBool(matchupNode.is_playoffs),
      is_consolation: asBool(matchupNode.is_consolation),
      winner_team_id: winnerTeamId,
      teams: mappedTeams,
    };
  });
}

function extractRosters(response: JsonRecord, leagueId: string, week: number): JsonRecord[] {
  const sections = getLeagueSection(response);
  const teamsBlock = sections
    .map((section) => asRecord(section.teams))
    .find((block) => Object.keys(block).length > 0);

  const rawTeams = normalizeNestedCollection(teamsBlock, "team").map((entry) => flattenNode(entry));

  const rosterRows: JsonRecord[] = [];

  for (const team of rawTeams) {
    const teamId = asString(team.team_id);
    const rosterBlock = asRecord(team.roster);
    if (Object.keys(rosterBlock).length === 0) {
      console.warn(`  ⚠ Team ${teamId}: no roster block found after flattenNode`);
      continue;
    }
    const innerRoster = asRecord(rosterBlock["0"] ?? rosterBlock);
    const playersBlock = asRecord(innerRoster.players ?? rosterBlock.players);
    const playerRows = normalizeNestedCollection(playersBlock, "player").map((entry) => flattenNode(entry));

    for (const player of playerRows) {
      const selectedPosition = asString(flattenNode(player.selected_position).position);
      if (!player.player_id) continue;
      rosterRows.push({
        team_id: teamId,
        player_id: asString(player.player_id),
        league_id: leagueId,
        week,
        roster_position: selectedPosition,
        is_starting: !NON_STARTING_POSITIONS.has(selectedPosition),
      });
    }
  }

  return rosterRows;
}

function extractTransactions(response: JsonRecord, leagueId: string): JsonRecord[] {
  const sections = getLeagueSection(response);
  const transactionsBlock = sections
    .map((section) => asRecord(section.transactions))
    .find((block) => Object.keys(block).length > 0);

  const rawTransactions = normalizeNestedCollection(transactionsBlock, "transaction").map((entry) => flattenNode(entry));

  return rawTransactions.map((transaction) => {
    const playersBlock = asRecord(transaction.players);
    const players = toArray(playersBlock).map((entry) => {
      if (entry.player) {
        return flattenNode(entry.player);
      }
      return flattenNode(entry);
    });

    return {
      league_id: leagueId,
      transaction_key: asString(transaction.transaction_key),
      type: asString(transaction.type),
      status: asString(transaction.status),
      timestamp: asNumber(transaction.timestamp),
      players,
    };
  });
}

function extractPlayerStats(response: JsonRecord, leagueId: string, week: number, season: number): JsonRecord[] {
  const sections = getLeagueSection(response);
  const teamsBlock = sections
    .map((section) => asRecord(section.teams))
    .find((block) => Object.keys(block).length > 0);

  if (!teamsBlock || Object.keys(teamsBlock).length === 0) return [];

  const rawTeams = normalizeNestedCollection(teamsBlock, "team").map((entry) => flattenNode(entry));
  const statRows: JsonRecord[] = [];

  for (const team of rawTeams) {
    const teamId = asString(team.team_id);
    if (!teamId) continue;

    const rosterBlock = asRecord(team.roster);
    const innerRoster = asRecord(rosterBlock["0"] ?? rosterBlock);
    const playersBlock = asRecord(innerRoster.players ?? rosterBlock.players);
    const playerRows = normalizeNestedCollection(playersBlock, "player").map((entry) => flattenNode(entry));

    for (const player of playerRows) {
      const playerId = asString(player.player_id);
      if (!playerId) continue;

      // player_points is included when the /stats sub-resource is requested
      const playerPointsBlock = asRecord(player.player_points ?? {});
      const points = asString(playerPointsBlock.total ?? playerPointsBlock.value ?? "", "0");
      if (points === "" || playerPointsBlock.total == null) continue;

      const statValues = asRecord(
        player.player_stats ?? asRecord(player.stats).stat_values ?? {},
      );

      statRows.push({
        player_id: playerId,
        team_id: teamId,
        league_id: leagueId,
        week,
        season,
        points,
        stat_values: statValues,
      });
    }
  }

  return statRows;
}

async function writeJson(filePath: string, payload: JsonValue | JsonRecord) {
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function debugDump(options: CliOptions, name: string, data: JsonRecord) {
  if (!options.debug) return;
  const debugDir = path.join(options.out, "debug");
  await fs.mkdir(debugDir, { recursive: true });
  await writeJson(path.join(debugDir, `${name}.json`), data);
}

function debugFileHint(options: CliOptions, name: string) {
  const debugPath = path.join("debug", `${name}.json`);
  return options.debug ? `check ${debugPath}` : `run with --debug and check ${debugPath}`;
}

function resolveLeagueKey(leagueArg: string, season: number | undefined): string {
  if (!season) return leagueArg;

  const gameKey = NFL_GAME_KEYS[String(season)];
  if (!gameKey) {
    console.warn(`  ⚠ No known NFL game key for season ${season}, using league key as-is: ${leagueArg}`);
    return leagueArg;
  }

  const leagueId = leagueArg.includes(LEAGUE_KEY_SEPARATOR)
    ? leagueArg.slice(leagueArg.lastIndexOf(LEAGUE_KEY_SEPARATOR) + LEAGUE_KEY_SEPARATOR.length)
    : leagueArg;
  const corrected = `${gameKey}.l.${leagueId}`;

  if (corrected !== leagueArg) {
    console.log(`  ℹ League key corrected for season ${season}: ${leagueArg} → ${corrected}`);
  }

  return corrected;
}

async function main() {
  await loadEnvDefaults();
  const options = parseArgs(process.argv.slice(2));

  const clientId = process.env.YAHOO_CLIENT_ID;
  const clientSecret = process.env.YAHOO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing YAHOO_CLIENT_ID or YAHOO_CLIENT_SECRET. Set them in your environment or .env.local.");
  }

  const accessToken = await ensureAccessToken(clientId, clientSecret);
  const leagueKey = resolveLeagueKey(options.league, options.season);

  await fs.mkdir(options.out, { recursive: true });

  const leagueResponse = await yahooApiGet(`/league/${leagueKey}`, accessToken);
  await debugDump(options, "league", leagueResponse);
  const settingsResponse = await yahooApiGet(`/league/${leagueKey}/settings`, accessToken);
  await debugDump(options, "settings", settingsResponse);

  const leagueRoot = getFirstLeagueRoot(leagueResponse);
  const settingsRoot = getFirstLeagueRoot(settingsResponse);

  const leagueData = {
    league_key: asString(leagueRoot.league_key, options.league),
    league_id: asString(leagueRoot.league_id),
    season: options.season ?? asNumber(leagueRoot.season),
    name: asString(leagueRoot.name),
    sport: asString(leagueRoot.game_code || leagueRoot.sport || "nfl"),
    scoring_type: asString(leagueRoot.scoring_type),
    num_teams: asNumber(leagueRoot.num_teams),
    settings: asRecord(settingsRoot.settings),
  };

  const leagueId = leagueData.league_id;
  const leagueIdNumber = asNumber(leagueId);

  const teamsResponse = await yahooApiGet(`/league/${leagueKey}/teams`, accessToken);
  await debugDump(options, "teams", teamsResponse);
  const teamsData = extractTeams(teamsResponse, leagueId);

  const allPlayers: JsonRecord[] = [];
  for (let start = 0; ; start += 25) {
    let playersResponse: JsonRecord;
    try {
      playersResponse = await yahooApiGet(
        `/league/${leagueKey}/players;count=25;start=${start}`,
        accessToken,
      );
    } catch (err) {
      console.warn(`  ⚠ Players page start=${start}: fetch failed, stopping player pagination – ${(err as Error).message}`);
      break;
    }
    await debugDump(options, `players-start-${start}`, playersResponse);
    const pagePlayers = extractPlayers(playersResponse);
    if (!pagePlayers.length) break;
    allPlayers.push(...pagePlayers);
    if (pagePlayers.length < 25) break;
  }

  const allMatchups: JsonRecord[] = [];
  const allRosters: JsonRecord[] = [];
  const allPlayerStats: JsonRecord[] = [];

  for (let week = 1; week <= options.weeks; week += 1) {
    const scoreboardResponse = await yahooApiGet(`/league/${leagueKey}/scoreboard;week=${week}`, accessToken);
    await debugDump(options, `scoreboard-week-${week}`, scoreboardResponse);
    const rosterResponse = await yahooApiGet(`/league/${leagueKey}/teams/roster;week=${week}`, accessToken);
    await debugDump(options, `roster-week-${week}`, rosterResponse);

    const weekMatchups = extractMatchups(scoreboardResponse, leagueIdNumber, week);
    if (weekMatchups.length === 0) {
      console.warn(`  ⚠ Week ${week}: 0 matchups parsed (${debugFileHint(options, `scoreboard-week-${week}`)})`);
    }
    allMatchups.push(...weekMatchups);

    const weekRosters = extractRosters(rosterResponse, leagueId, week);
    if (weekRosters.length === 0) {
      console.warn(`  ⚠ Week ${week}: 0 roster entries parsed (${debugFileHint(options, `roster-week-${week}`)})`);
    }
    allRosters.push(...weekRosters);

    // Fetch player stats for this week (roster with stats sub-resource)
    try {
      const statsResponse = await yahooApiGet(
        `/league/${leagueKey}/teams/roster;week=${week}/stats;type=week;week=${week}`,
        accessToken,
      );
      await debugDump(options, `stats-week-${week}`, statsResponse);
      const season = leagueData.season;
      const weekStats = extractPlayerStats(statsResponse, leagueId, week, season);
      allPlayerStats.push(...weekStats);
      if (weekStats.length === 0) {
        console.warn(`  ⚠ Week ${week}: 0 player stats parsed`);
      }
    } catch (err) {
      console.warn(`  ⚠ Week ${week}: could not fetch player stats – ${(err as Error).message}`);
    }
  }

  const transactionsResponse = await yahooApiGet(
    `/league/${leagueKey}/transactions;type=add,drop,trade,commish`,
    accessToken,
  );
  await debugDump(options, "transactions", transactionsResponse);
  const transactions = extractTransactions(transactionsResponse, leagueId);
  if (transactions.length === 0) {
    console.warn(`  ⚠ 0 transactions parsed (${debugFileHint(options, "transactions")})`);
  }

  const leagueFile = path.join(options.out, "league.json");
  const teamsFile = path.join(options.out, "teams.json");
  const playersFile = path.join(options.out, "players.json");
  const matchupsFile = path.join(options.out, "matchups.json");
  const rostersFile = path.join(options.out, "rosters.json");
  const playerStatsFile = path.join(options.out, "player_stats.json");
  const transactionsFile = path.join(options.out, "transactions.json");

  await writeJson(leagueFile, leagueData);
  await writeJson(teamsFile, { teams: teamsData.teams });
  await writeJson(playersFile, { players: allPlayers });
  await writeJson(matchupsFile, { matchups: allMatchups });
  await writeJson(rostersFile, { rosters: allRosters });
  await writeJson(playerStatsFile, { player_stats: allPlayerStats });
  await writeJson(transactionsFile, { transactions });

  const relativeOut = path.relative(process.cwd(), options.out) || ".";

  console.log(`✓ Saved ${path.join(relativeOut, "league.json")} (1 league)`);
  console.log(
    `✓ Saved ${path.join(relativeOut, "teams.json")} (${teamsData.teams.length} teams, ${teamsData.managerCount} managers)`,
  );
  console.log(`✓ Saved ${path.join(relativeOut, "players.json")} (${allPlayers.length} players)`);
  console.log(
    `✓ Saved ${path.join(relativeOut, "matchups.json")} (${allMatchups.length} matchups across ${options.weeks} weeks)`,
  );
  console.log(`✓ Saved ${path.join(relativeOut, "rosters.json")} (${allRosters.length} roster entries)`);
  console.log(`✓ Saved ${path.join(relativeOut, "player_stats.json")} (${allPlayerStats.length} player stat entries)`);
  console.log(`✓ Saved ${path.join(relativeOut, "transactions.json")} (${transactions.length} transactions)`);

  console.log("\nNow import in order:");
  console.log(`  npm run import ${path.join(relativeOut, "league.json")}`);
  console.log(`  npm run import ${path.join(relativeOut, "teams.json")}`);
  console.log(`  npm run import ${path.join(relativeOut, "players.json")}`);
  console.log(`  npm run import ${path.join(relativeOut, "matchups.json")}`);
  console.log(`  npm run import ${path.join(relativeOut, "rosters.json")}`);
  console.log(`  npm run import ${path.join(relativeOut, "player_stats.json")}`);
  console.log(`  npm run import ${path.join(relativeOut, "transactions.json")}`);
}

export const __private = {
  parseArgs,
  extractMatchups,
  resolveLeagueKey,
};

if (import.meta.url === pathToFileURL(process.argv[1]!).href) {
  main().catch((error) => {
    console.error("Fetch failed:", error);
    process.exit(1);
  });
}
