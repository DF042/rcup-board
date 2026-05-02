-- Pre-computed per-team season statistics including expected wins.
-- expected_wins: sum over all regular-season weeks of
--   (number of other teams that team would have beaten that week) / (total_teams - 1)
CREATE TABLE season_stats (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  league_id INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  season INTEGER NOT NULL,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  ties INTEGER NOT NULL DEFAULT 0,
  points_for NUMERIC(10, 2) NOT NULL DEFAULT 0,
  points_against NUMERIC(10, 2) NOT NULL DEFAULT 0,
  expected_wins NUMERIC(10, 4) NOT NULL DEFAULT 0,
  rank INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT season_stats_unique UNIQUE (team_id)
);
CREATE INDEX season_stats_league_idx ON season_stats(league_id);

-- Per-team playoff performance for each season.
-- Populated by recomputePlayoffResults() after matchup import.
CREATE TABLE playoff_results (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  league_id INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  season INTEGER NOT NULL,
  made_playoffs BOOLEAN NOT NULL DEFAULT FALSE,
  playoff_wins INTEGER NOT NULL DEFAULT 0,
  playoff_losses INTEGER NOT NULL DEFAULT 0,
  is_champion BOOLEAN NOT NULL DEFAULT FALSE,
  is_consolation_winner BOOLEAN NOT NULL DEFAULT FALSE,
  final_rank INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT playoff_results_unique UNIQUE (team_id)
);
CREATE INDEX playoff_results_league_idx ON playoff_results(league_id);
