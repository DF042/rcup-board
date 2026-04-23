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
    // Mirrors the real Yahoo API structure: matchup is a numeric-keyed object,
    // not a flat object, and team entries are wrapped in numeric-keyed objects.
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
                      "1": { week: "1", is_playoffs: "0", is_consolation: "0", status: "postevent" },
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
                      "1": { week: "1", is_playoffs: "0", is_consolation: "0", status: "postevent" },
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
});
