import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { __private } from "./fetch-yahoo";

describe("fetch-yahoo script", () => {
  it("parses required CLI options with defaults", () => {
    const parsed = __private.parseArgs(["--league", "nfl.l.12345"]);

    assert.equal(parsed.league, "nfl.l.12345");
    assert.equal(parsed.weeks, 18);
    assert.equal(path.basename(parsed.out), "data");
  });

  it("parses debug CLI flag", () => {
    const parsed = __private.parseArgs(["--league", "nfl.l.12345", "--debug"]);

    assert.equal(parsed.debug, true);
  });

  it("keeps league key unchanged when no season is provided", () => {
    assert.equal(__private.resolveLeagueKey("470.l.16883", undefined), "470.l.16883");
  });

  it("corrects game key prefix to match provided season", () => {
    assert.equal(__private.resolveLeagueKey("470.l.16883", 2024), "449.l.16883");
  });

  it("uses league id segment after the last .l. marker", () => {
    assert.equal(__private.resolveLeagueKey("foo.l.bar.l.16883", 2024), "449.l.16883");
  });

  it("passes through league key for unknown seasons", () => {
    assert.equal(__private.resolveLeagueKey("470.l.16883", 2099), "470.l.16883");
  });

  it("derives matchup winner_team_id from team_points totals", () => {
    // Mirrors the real Yahoo API structure: matchup has mixed keys — numeric key
    // "0" containing teams, plus string metadata keys (week, is_playoffs, etc.)
    // coexisting at the same level.
    const response = {
      fantasy_content: {
        league: [
          {},
          {
            scoreboard: {
              "0": {
                matchups: {
                  "0": {
                    matchup: {
                      "0": {
                        teams: {
                          "0": {
                            team: [
                              [{ team_key: "449.l.495396.t.1" }, { team_id: "1" }],
                              { team_points: { total: "98.5" } },
                            ],
                          },
                          "1": {
                            team: [
                              [{ team_key: "449.l.495396.t.2" }, { team_id: "2" }],
                              { team_points: { total: "101.2" } },
                            ],
                          },
                          count: 2,
                        },
                      },
                      week: "1",
                      is_playoffs: "0",
                      is_consolation: "0",
                      status: "postevent",
                    },
                  },
                  "1": {
                    matchup: {
                      "0": {
                        teams: {
                          "0": {
                            team: [
                              [{ team_key: "449.l.495396.t.3" }, { team_id: "3" }],
                              { team_points: { total: "110.0" } },
                            ],
                          },
                          "1": {
                            team: [
                              [{ team_key: "449.l.495396.t.4" }, { team_id: "4" }],
                              { team_points: { total: "110.0" } },
                            ],
                          },
                          count: 2,
                        },
                      },
                      week: "1",
                      is_playoffs: "0",
                      is_consolation: "0",
                      status: "postevent",
                    },
                  },
                  count: 2,
                },
              },
            },
          },
        ],
      },
    };

    const matchups = __private.extractMatchups(response, 12345, 1);

    assert.equal(matchups.length, 2);
    assert.equal(matchups[0]?.winner_team_id, 2);
    assert.equal(matchups[1]?.winner_team_id, null);

    const teams0 = matchups[0]?.teams as Array<{ team_id: string; team_points: { total: string } }>;
    assert.equal(teams0.length, 2);
    assert.ok(teams0[0]?.team_id, "first team should have a non-empty team_id");
    assert.ok(teams0[0]?.team_points?.total, "first team should have a non-empty team_points.total");
    assert.ok(teams0[1]?.team_id, "second team should have a non-empty team_id");
    assert.ok(teams0[1]?.team_points?.total, "second team should have a non-empty team_points.total");

    assert.equal(matchups[0]?.is_playoffs, false);
    assert.equal(matchups[0]?.week, 1);
  });

  it("extractPlayerStats: records all players including those with missing player_points", () => {
    // Simulates a Yahoo stats-week response where some players have player_points
    // and some do not (e.g. benched or bye-week players in older seasons).
    const response = {
      fantasy_content: {
        league: [
          { league_key: "242.l.134839", league_id: "134839" },
          {
            teams: {
              "0": {
                team: [
                  [{ team_key: "242.l.134839.t.1" }, { team_id: "1" }],
                  {
                    roster: {
                      "0": {
                        players: {
                          "0": {
                            player: [
                              [{ player_id: "6624" }, { player_key: "242.p.6624" }],
                              {
                                player_points: { coverage_type: "week", week: "1", total: "32.50" },
                                player_stats: {
                                  coverage_type: "week",
                                  week: "1",
                                  stats: {
                                    "0": { stat: { stat_id: "4", value: "312" } },
                                    "1": { stat: { stat_id: "5", value: "2" } },
                                    count: 2,
                                  },
                                },
                              },
                            ],
                          },
                          // Player without player_points (benched / bye week)
                          "1": {
                            player: [
                              [{ player_id: "6339" }, { player_key: "242.p.6339" }],
                              {
                                player_stats: {
                                  coverage_type: "week",
                                  week: "1",
                                  stats: {
                                    "0": { stat: { stat_id: "4", value: "0" } },
                                    count: 1,
                                  },
                                },
                              },
                            ],
                          },
                          count: 2,
                        },
                      },
                    },
                  },
                ],
              },
              count: 1,
            },
          },
        ],
      },
    };

    const stats = __private.extractPlayerStats(response, "134839", 1, 2010);

    // Both players must be present — the guard must not skip the bench player
    assert.equal(stats.length, 2);

    const starter = stats.find((s) => s.player_id === "6624");
    assert.ok(starter, "starter player should be present");
    assert.equal(starter?.points, "32.50");
    // stat_values should be a flat {stat_id: value} map with string values, not the wrapper object
    assert.deepEqual(starter?.stat_values, { "4": "312", "5": "2" });

    const bench = stats.find((s) => s.player_id === "6339");
    assert.ok(bench, "bench player (no player_points) should still be present");
    assert.equal(bench?.points, "0");
    assert.deepEqual(bench?.stat_values, { "4": "0" });
  });
});
