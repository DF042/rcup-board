import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const leagues = pgTable("leagues", {
  id: serial("id").primaryKey(),
  leagueKey: text("league_key").notNull().unique(),
  leagueId: text("league_id").notNull(),
  season: integer("season").notNull(),
  name: text("name").notNull(),
  sport: text("sport").notNull(),
  scoringType: text("scoring_type"),
  numTeams: integer("num_teams"),
  settings: jsonb("settings"),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const managers = pgTable("managers", {
  id: serial("id").primaryKey(),
  guid: text("guid").notNull().unique(),
  nickname: text("nickname").notNull(),
  email: text("email"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const teams = pgTable(
  "teams",
  {
    id: serial("id").primaryKey(),
    teamKey: text("team_key").notNull().unique(),
    teamId: text("team_id").notNull(),
    leagueId: integer("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
    managerId: integer("manager_id").references(() => managers.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    logoUrl: text("logo_url"),
    waiverPriority: integer("waiver_priority"),
    faabBalance: integer("faab_balance"),
    numberOfMoves: integer("number_of_moves"),
    numberOfTrades: integer("number_of_trades"),
    standings: jsonb("standings"),
    draftResults: jsonb("draft_results"),
    rawData: jsonb("raw_data"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("teams_league_idx").on(table.leagueId), index("teams_manager_idx").on(table.managerId)],
);

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  playerKey: text("player_key").notNull().unique(),
  playerId: text("player_id").notNull(),
  fullName: text("full_name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  positions: text("positions").array().default([]).notNull(),
  nflTeam: text("nfl_team"),
  jerseyNumber: text("jersey_number"),
  status: text("status"),
  headshotUrl: text("headshot_url"),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const rosters = pgTable(
  "rosters",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
    playerId: integer("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    leagueId: integer("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
    week: integer("week").notNull(),
    rosterPosition: text("roster_position"),
    isStarting: boolean("is_starting").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("rosters_team_idx").on(table.teamId), index("rosters_player_idx").on(table.playerId)],
);

export const matchups = pgTable(
  "matchups",
  {
    id: serial("id").primaryKey(),
    leagueId: integer("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
    week: integer("week").notNull(),
    team1Id: integer("team1_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
    team2Id: integer("team2_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
    team1Points: numeric("team1_points", { precision: 10, scale: 2 }).default("0"),
    team2Points: numeric("team2_points", { precision: 10, scale: 2 }).default("0"),
    winnerTeamId: integer("winner_team_id").references(() => teams.id, { onDelete: "set null" }),
    isPlayoffs: boolean("is_playoffs").default(false).notNull(),
    isConsolation: boolean("is_consolation").default(false).notNull(),
    rawData: jsonb("raw_data"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("matchups_league_week_idx").on(table.leagueId, table.week)],
);

export const playerStats = pgTable(
  "player_stats",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    leagueId: integer("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
    teamId: integer("team_id").references(() => teams.id, { onDelete: "set null" }),
    week: integer("week"),
    season: integer("season").notNull(),
    statValues: jsonb("stat_values").notNull(),
    points: numeric("points", { precision: 10, scale: 2 }).default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique("player_stats_unique").on(table.playerId, table.leagueId, table.week, table.season)],
);

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  leagueId: integer("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
  transactionKey: text("transaction_key").notNull().unique(),
  type: text("type").notNull(),
  status: text("status"),
  transactionTimestamp: bigint("timestamp", { mode: "number" }).notNull(),
  players: jsonb("players"),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const statCategories = pgTable(
  "stat_categories",
  {
    id: serial("id").primaryKey(),
    leagueId: integer("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
    statId: text("stat_id").notNull(),
    name: text("name").notNull(),
    displayName: text("display_name"),
    sortOrder: integer("sort_order"),
    isOnlyDisplayStat: boolean("is_only_display_stat").default(false).notNull(),
  },
  (table) => [uniqueIndex("stat_categories_unique").on(table.leagueId, table.statId)],
);

export type LeagueInsert = typeof leagues.$inferInsert;
export type ManagerInsert = typeof managers.$inferInsert;
export type TeamInsert = typeof teams.$inferInsert;
export type PlayerInsert = typeof players.$inferInsert;
export type RosterInsert = typeof rosters.$inferInsert;
export type MatchupInsert = typeof matchups.$inferInsert;
export type PlayerStatInsert = typeof playerStats.$inferInsert;
export type TransactionInsert = typeof transactions.$inferInsert;
export type StatCategoryInsert = typeof statCategories.$inferInsert;
