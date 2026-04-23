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

  it("derives matchup winner_team_id from team_points totals", () => {
    const response = {
      fantasy_content: {
        league: [
          {},
          {
            scoreboard: {
              matchups: {
                0: {
                  matchup: {
                    is_playoffs: "0",
                    is_consolation: "0",
                    teams: {
                      0: { team: { team_id: "1", team_points: { total: "98.5" } } },
                      1: { team: { team_id: "2", team_points: { total: "101.2" } } },
                      count: 2,
                    },
                  },
                },
                1: {
                  matchup: {
                    is_playoffs: "0",
                    is_consolation: "0",
                    teams: {
                      0: { team: { team_id: "3", team_points: { total: "110.0" } } },
                      1: { team: { team_id: "4", team_points: { total: "110.0" } } },
                      count: 2,
                    },
                  },
                },
                count: 2,
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
  });

  it("parses matchups nested under scoreboard numeric key", () => {
    const response = {
      fantasy_content: {
        league: [
          {},
          {
            scoreboard: {
              0: {
                matchups: {
                  0: {
                    matchup: {
                      is_playoffs: "0",
                      is_consolation: "0",
                      teams: {
                        0: { team: { team_id: "10", team_points: { total: "120.5" } } },
                        1: { team: { team_id: "11", team_points: { total: "110.4" } } },
                        count: 2,
                      },
                    },
                  },
                  count: 1,
                },
              },
              week: "1",
            },
          },
        ],
      },
    };

    const matchups = __private.extractMatchups(response, 12345, 1);

    assert.equal(matchups.length, 1);
    assert.equal(matchups[0]?.winner_team_id, 10);
  });
});
