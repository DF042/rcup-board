import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  detectDataType,
  parseLeague,
  parseMatchups,
  parsePlayerStats,
  parsePlayers,
  parseRosters,
  parseStatCategories,
  parseTeams,
  parseTransactions,
} from "./parser";

describe("yahoo parser", () => {
  it("detects league payload", () => {
    assert.equal(detectDataType({ league_key: "nfl.l.1" }), "league");
  });

  it("parses league payload", () => {
    const parsed = parseLeague({
      league_key: "nfl.l.1",
      league_id: "1",
      season: "2025",
      name: "Test",
      sport: "nfl",
    });

    assert.equal(parsed.leagueKey, "nfl.l.1");
    assert.equal(parsed.season, 2025);
  });

  it("filters invalid rows in parsers", () => {
    const teams = parseTeams({
      teams: [
        { team_key: "", league_id: 1 },
        { team_key: "t.1", team_id: "1", league_id: 0 },
        { team_key: "t.2", team_id: "2", league_id: 16883 },
      ],
    });
    assert.equal(teams.teams.length, 1);
    assert.equal(teams.teams[0]?.teamKey, "t.2");

    const players = parsePlayers({
      players: [{ player_key: "", player_id: "1" }, { player_key: "p.1", player_id: "2" }],
    });
    assert.equal(players.length, 1);
    assert.equal(players[0]?.playerKey, "p.1");

    const rosters = parseRosters({
      rosters: [
        { team_id: 0, player_id: 1, league_id: 1, week: 1 },
        { team_id: 1, player_id: 0, league_id: 1, week: 1 },
        { team_id: 1, player_id: 2, league_id: 1, week: 1 },
      ],
    });
    assert.equal(rosters.length, 1);

    const stats = parsePlayerStats({
      player_stats: [
        { player_id: 0, season: 2024, league_id: 1 },
        { player_id: 1, season: 0, league_id: 1 },
        { player_id: 1, season: 2024, league_id: 1 },
      ],
    });
    assert.equal(stats.length, 1);

    const transactions = parseTransactions({
      transactions: [{ transaction_key: "", league_id: 1 }, { transaction_key: "tx.1", league_id: 1 }],
    });
    assert.equal(transactions.length, 1);
    assert.equal(transactions[0]?.transactionKey, "tx.1");
  });

  it("parses stat categories from settings and deduplicates/filters invalid rows", () => {
    const categories = parseStatCategories({
      settings: {
        stat_categories: [
          { league_id: 16883, stat_id: "4", name: "Pass TD" },
          { league_id: 16883, stat_id: "4", name: "Pass TD Updated" },
          { league_id: 0, stat_id: "5", name: "Invalid League" },
          { league_id: 16883, stat_id: "", name: "Invalid Stat Id" },
        ],
      },
    });

    assert.equal(categories.length, 1);
    assert.equal(categories[0]?.leagueId, 16883);
    assert.equal(categories[0]?.statId, "4");
    assert.equal(categories[0]?.name, "Pass TD Updated");
  });

  it("detects and parses raw Yahoo matchup payload (fantasy_content)", () => {
    const rawYahoo = {
      fantasy_content: {
        league: [
          { league_key: "nfl.l.12345", league_id: "12345" },
          {
            scoreboard: {
              matchups: {
                0: {
                  matchup: {
                    week: "3",
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
                    week: "3",
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

    assert.equal(detectDataType(rawYahoo), "matchups");

    const matchups = parseMatchups(rawYahoo);
    assert.equal(matchups.length, 2);
    assert.equal(matchups[0]?.leagueId, 12345);
    assert.equal(matchups[0]?.week, 3);
    assert.equal(matchups[0]?.team1Id, 1);
    assert.equal(matchups[0]?.team2Id, 2);
    assert.equal(matchups[0]?.team1Points, "98.5");
    assert.equal(matchups[0]?.team2Points, "101.2");
    assert.equal(matchups[0]?.winnerTeamId, 2);
    assert.equal(matchups[0]?.isPlayoffs, false);
    // tied game — no winner
    assert.equal(matchups[1]?.winnerTeamId, null);
  });

  it("detects and parses raw Yahoo roster payload (fantasy_content)", () => {
    const rawYahoo = {
      fantasy_content: {
        league: [
          { league_key: "nfl.l.12345", league_id: "12345" },
          {
            teams: {
              0: {
                team: [
                  { team_id: "1", team_key: "nfl.l.12345.t.1", name: "Team A" },
                  {
                    roster: {
                      week: "3",
                      players: {
                        0: {
                          player: [
                            { player_id: "7578", player_key: "nfl.p.7578" },
                            { selected_position: [{ coverage_type: "week" }, { position: "QB" }] },
                          ],
                        },
                        1: {
                          player: [
                            { player_id: "9999", player_key: "nfl.p.9999" },
                            { selected_position: [{ coverage_type: "week" }, { position: "BN" }] },
                          ],
                        },
                        count: 2,
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

    assert.equal(detectDataType(rawYahoo), "rosters");

    const rosters = parseRosters(rawYahoo);
    assert.equal(rosters.length, 2);
    assert.equal(rosters[0]?.teamId, 1);
    assert.equal(rosters[0]?.playerId, 7578);
    assert.equal(rosters[0]?.leagueId, 12345);
    assert.equal(rosters[0]?.week, 3);
    assert.equal(rosters[0]?.rosterPosition, "QB");
    assert.equal(rosters[0]?.isStarting, true);
    assert.equal(rosters[1]?.rosterPosition, "BN");
    assert.equal(rosters[1]?.isStarting, false);
  });

  it("detects and parses raw Yahoo transaction payload (fantasy_content)", () => {
    const rawYahoo = {
      fantasy_content: {
        league: [
          { league_key: "nfl.l.12345", league_id: "12345" },
          {
            transactions: {
              0: {
                transaction: [
                  {
                    transaction_key: "nfl.l.12345.w.t.1",
                    type: "add/drop",
                    status: "successful",
                    timestamp: "1725543870",
                  },
                  {
                    players: {
                      0: {
                        player: [
                          { player_id: "7578", player_key: "nfl.p.7578" },
                          { transaction_data: { type: "add", destination_team_key: "nfl.l.12345.t.1" } },
                        ],
                      },
                      count: 1,
                    },
                  },
                ],
              },
              1: {
                transaction: [
                  { transaction_key: "", type: "add", status: "failed", timestamp: "0" },
                  { players: {} },
                ],
              },
              count: 2,
            },
          },
        ],
      },
    };

    assert.equal(detectDataType(rawYahoo), "transactions");

    const transactions = parseTransactions(rawYahoo);
    // second transaction has empty transaction_key and is filtered out
    assert.equal(transactions.length, 1);
    assert.equal(transactions[0]?.transactionKey, "nfl.l.12345.w.t.1");
    assert.equal(transactions[0]?.leagueId, 12345);
    assert.equal(transactions[0]?.type, "add/drop");
    assert.equal(transactions[0]?.status, "successful");
    assert.equal(transactions[0]?.transactionTimestamp, 1725543870);
    assert.equal((transactions[0]?.players as unknown[]).length, 1);
  });

  it("detects raw Yahoo stats payload (fantasy_content) as 'stats' when player_points present", () => {
    const rawYahoo = {
      fantasy_content: {
        league: [
          { league_key: "nfl.l.12345", league_id: "12345" },
          {
            teams: {
              0: {
                team: [
                  { team_id: "1", team_key: "nfl.l.12345.t.1", name: "Team A" },
                  {
                    roster: {
                      "0": {
                        players: {
                          0: {
                            player: [
                              [{ player_id: "7578" }, { player_key: "nfl.p.7578" }],
                              {
                                player_points: { coverage_type: "week", week: "1", total: "22.00" },
                                player_stats: {
                                  coverage_type: "week",
                                  week: "1",
                                  stats: {
                                    "0": { stat: { stat_id: "4", value: "200" } },
                                    count: 1,
                                  },
                                },
                              },
                            ],
                          },
                          count: 1,
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

    assert.equal(detectDataType(rawYahoo), "stats");
  });
});
