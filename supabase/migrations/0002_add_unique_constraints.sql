ALTER TABLE matchups
  ADD CONSTRAINT matchups_unique UNIQUE (league_id, week, team1_id, team2_id);

ALTER TABLE rosters
  ADD CONSTRAINT rosters_unique UNIQUE (team_id, player_id, league_id, week);
