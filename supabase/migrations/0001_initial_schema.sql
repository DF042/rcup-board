CREATE TABLE leagues (
  id SERIAL PRIMARY KEY,
  league_key TEXT NOT NULL UNIQUE,
  league_id TEXT NOT NULL,
  season INTEGER NOT NULL,
  name TEXT NOT NULL,
  sport TEXT NOT NULL,
  scoring_type TEXT,
  num_teams INTEGER,
  settings JSONB,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE managers (
  id SERIAL PRIMARY KEY,
  guid TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  email TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  team_key TEXT NOT NULL UNIQUE,
  team_id TEXT NOT NULL,
  league_id INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  manager_id INTEGER REFERENCES managers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  waiver_priority INTEGER,
  faab_balance INTEGER,
  number_of_moves INTEGER,
  number_of_trades INTEGER,
  standings JSONB,
  draft_results JSONB,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX teams_league_idx ON teams(league_id);
CREATE INDEX teams_manager_idx ON teams(manager_id);

CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  player_key TEXT NOT NULL UNIQUE,
  player_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  positions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  nfl_team TEXT,
  jersey_number TEXT,
  status TEXT,
  headshot_url TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE rosters (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  league_id INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  roster_position TEXT,
  is_starting BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX rosters_team_idx ON rosters(team_id);
CREATE INDEX rosters_player_idx ON rosters(player_id);

CREATE TABLE matchups (
  id SERIAL PRIMARY KEY,
  league_id INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  team1_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  team2_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  team1_points NUMERIC(10, 2) DEFAULT 0,
  team2_points NUMERIC(10, 2) DEFAULT 0,
  winner_team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  is_playoffs BOOLEAN NOT NULL DEFAULT FALSE,
  is_consolation BOOLEAN NOT NULL DEFAULT FALSE,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX matchups_league_week_idx ON matchups(league_id, week);

CREATE TABLE player_stats (
  id SERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  league_id INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  week INTEGER,
  season INTEGER NOT NULL,
  stat_values JSONB NOT NULL,
  points NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, league_id, week, season)
);

CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  league_id INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  transaction_key TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  status TEXT,
  timestamp BIGINT NOT NULL,
  players JSONB,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stat_categories (
  id SERIAL PRIMARY KEY,
  league_id INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  stat_id TEXT NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT,
  sort_order INTEGER,
  is_only_display_stat BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(league_id, stat_id)
);
