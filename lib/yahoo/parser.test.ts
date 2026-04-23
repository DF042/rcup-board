import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  detectDataType,
  parseLeague,
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
});
