import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectDataType, parseLeague } from "./parser";

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
});
