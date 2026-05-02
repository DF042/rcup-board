/**
 * lib/db/compute.ts
 *
 * Recomputes derived tables (season_stats, playoff_results) from raw matchup
 * data stored in the matchups table.  Called automatically after matchup
 * imports and can be triggered manually via the /api/recompute endpoint.
 */

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { leagues, matchups, seasonStats, playoffResults, teams } from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ---------------------------------------------------------------------------
// Season stats (regular-season W/L/T, PF, PA, expected wins, rank)
// ---------------------------------------------------------------------------

/**
 * Recompute season_stats for every team in the given league.
 * Only regular-season matchups (is_playoffs = false, is_consolation = false)
 * are used for expected-wins; W/L/T and points totals include all matchups.
 *
 * Expected wins formula per week:
 *   (number of other teams whose score the team would have beaten) / (total_teams - 1)
 * Summed across all regular-season weeks.
 */
export async function recomputeSeasonStats(leagueId: number): Promise<void> {
  // 1. Load season for this league
  const [leagueRow] = await db
    .select({ season: leagues.season })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!leagueRow) return;
  const season = leagueRow.season;

  // 2. Load all matchups for the league
  const rows = await db
    .select({
      team1Id: matchups.team1Id,
      team2Id: matchups.team2Id,
      team1Points: matchups.team1Points,
      team2Points: matchups.team2Points,
      winnerTeamId: matchups.winnerTeamId,
      week: matchups.week,
      isPlayoffs: matchups.isPlayoffs,
      isConsolation: matchups.isConsolation,
    })
    .from(matchups)
    .where(eq(matchups.leagueId, leagueId));

  if (!rows.length) return;

  // 3. Collect every team that participates
  const allTeamIds = new Set<number>();
  for (const row of rows) {
    allTeamIds.add(row.team1Id);
    allTeamIds.add(row.team2Id);
  }

  // 4. Build per-team accumulators
  type TeamBucket = {
    wins: number;
    losses: number;
    ties: number;
    pf: number;
    pa: number;
    expectedWins: number;
  };
  const buckets = new Map<number, TeamBucket>();
  for (const id of allTeamIds) {
    buckets.set(id, { wins: 0, losses: 0, ties: 0, pf: 0, pa: 0, expectedWins: 0 });
  }

  // 5. Accumulate W/L/T and PF/PA across all matchups
  for (const row of rows) {
    const b1 = buckets.get(row.team1Id);
    const b2 = buckets.get(row.team2Id);
    const p1 = toNum(row.team1Points);
    const p2 = toNum(row.team2Points);

    if (b1) {
      b1.pf += p1;
      b1.pa += p2;
      if (!row.winnerTeamId) b1.ties += 1;
      else if (row.winnerTeamId === row.team1Id) b1.wins += 1;
      else b1.losses += 1;
    }
    if (b2) {
      b2.pf += p2;
      b2.pa += p1;
      if (!row.winnerTeamId) b2.ties += 1;
      else if (row.winnerTeamId === row.team2Id) b2.wins += 1;
      else b2.losses += 1;
    }
  }

  // 6. Compute expected wins using only regular-season weeks
  //    Group by week so we can compare every team against every other team
  const regularRows = rows.filter((r) => !r.isPlayoffs && !r.isConsolation);

  // Build a map: week → array of { teamId, points }
  const weekScores = new Map<number, Array<{ teamId: number; points: number }>>();
  for (const row of regularRows) {
    const list1 = weekScores.get(row.week) ?? [];
    list1.push({ teamId: row.team1Id, points: toNum(row.team1Points) });
    list1.push({ teamId: row.team2Id, points: toNum(row.team2Points) });
    weekScores.set(row.week, list1);
  }

  for (const [, scores] of weekScores) {
    const n = scores.length; // total scores this week
    if (n < 2) continue;
    const denom = n - 1;
    for (const { teamId, points } of scores) {
      const beaten = scores.filter((s) => s.teamId !== teamId && s.points < points).length;
      const bucket = buckets.get(teamId);
      if (bucket) {
        bucket.expectedWins += beaten / denom;
      }
    }
  }

  // 7. Sort by wins desc, then PF desc to assign rank
  const sorted = [...buckets.entries()].sort(([, a], [, b]) =>
    b.wins - a.wins || b.pf - a.pf,
  );

  // 8. Upsert into season_stats
  const now = new Date();
  for (let i = 0; i < sorted.length; i++) {
    const [teamId, bucket] = sorted[i];
    const rank = i + 1;
    await db
      .insert(seasonStats)
      .values({
        teamId,
        leagueId,
        season,
        wins: bucket.wins,
        losses: bucket.losses,
        ties: bucket.ties,
        pointsFor: bucket.pf.toFixed(2),
        pointsAgainst: bucket.pa.toFixed(2),
        expectedWins: bucket.expectedWins.toFixed(4),
        rank,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [seasonStats.teamId, seasonStats.season],
        set: {
          leagueId: sql`excluded.league_id`,
          season: sql`excluded.season`,
          wins: sql`excluded.wins`,
          losses: sql`excluded.losses`,
          ties: sql`excluded.ties`,
          pointsFor: sql`excluded.points_for`,
          pointsAgainst: sql`excluded.points_against`,
          expectedWins: sql`excluded.expected_wins`,
          rank: sql`excluded.rank`,
          updatedAt: now,
        },
      });
  }
}

// ---------------------------------------------------------------------------
// Playoff results (made playoffs, wins, losses, champion, consolation winner)
// ---------------------------------------------------------------------------

/**
 * Recompute playoff_results for every team in the given league.
 *
 * Champion detection: In the last playoff week, the winner of the
 * non-consolation matchup with the highest-ranked teams is the champion.
 * Concretely, the team that wins the highest-week non-consolation playoff
 * matchup is declared champion.
 */
export async function recomputePlayoffResults(leagueId: number): Promise<void> {
  const [leagueRow] = await db
    .select({ season: leagues.season })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!leagueRow) return;
  const season = leagueRow.season;

  // Load all playoff matchups
  const playoffRows = await db
    .select({
      id: matchups.id,
      team1Id: matchups.team1Id,
      team2Id: matchups.team2Id,
      team1Points: matchups.team1Points,
      team2Points: matchups.team2Points,
      winnerTeamId: matchups.winnerTeamId,
      week: matchups.week,
      isConsolation: matchups.isConsolation,
    })
    .from(matchups)
    .where(and(eq(matchups.leagueId, leagueId), eq(matchups.isPlayoffs, true)));

  // Also load all teams in this league so we can mark non-playoff teams too
  const leagueTeams = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.leagueId, leagueId));

  type PlayoffBucket = {
    madePlayoffs: boolean;
    playoffWins: number;
    playoffLosses: number;
    isChampion: boolean;
    isConsolationWinner: boolean;
    finalRank: number;
  };

  const buckets = new Map<number, PlayoffBucket>();
  for (const t of leagueTeams) {
    buckets.set(t.id, {
      madePlayoffs: false,
      playoffWins: 0,
      playoffLosses: 0,
      isChampion: false,
      isConsolationWinner: false,
      finalRank: 0,
    });
  }

  if (playoffRows.length === 0) {
    // No playoff matchups yet — nothing to do (upsert zeros below)
  } else {
    // Mark teams that appear in any playoff matchup
    for (const row of playoffRows) {
      const b1 = buckets.get(row.team1Id);
      const b2 = buckets.get(row.team2Id);
      if (b1) b1.madePlayoffs = true;
      if (b2) b2.madePlayoffs = true;
    }

    // Accumulate playoff W/L
    for (const row of playoffRows) {
      const b1 = buckets.get(row.team1Id);
      const b2 = buckets.get(row.team2Id);
      if (b1) {
        if (row.winnerTeamId === row.team1Id) b1.playoffWins += 1;
        else if (row.winnerTeamId) b1.playoffLosses += 1;
      }
      if (b2) {
        if (row.winnerTeamId === row.team2Id) b2.playoffWins += 1;
        else if (row.winnerTeamId) b2.playoffLosses += 1;
      }
    }

    // Determine champion: winner of the championship game =
    //   the non-consolation playoff matchup in the latest week
    const nonConsolation = playoffRows.filter((r) => !r.isConsolation);
    if (nonConsolation.length > 0) {
      const lastChampWeek = Math.max(...nonConsolation.map((r) => r.week));
      const championshipGames = nonConsolation.filter((r) => r.week === lastChampWeek);
      // If there are multiple championship-week non-consolation games, pick the
      // one with the highest combined score (the actual finals vs. 3rd-place game).
      const champGame = championshipGames.reduce((best, r) => {
        const combined = toNum(r.team1Points) + toNum(r.team2Points);
        const bestCombined = toNum(best.team1Points) + toNum(best.team2Points);
        return combined > bestCombined ? r : best;
      });
      if (champGame.winnerTeamId) {
        const cb = buckets.get(champGame.winnerTeamId);
        if (cb) cb.isChampion = true;
      }
    }

    // Consolation winner: winner of consolation matchup in last consolation week
    const consolation = playoffRows.filter((r) => r.isConsolation);
    if (consolation.length > 0) {
      const lastConsWeek = Math.max(...consolation.map((r) => r.week));
      const consolationFinals = consolation.filter((r) => r.week === lastConsWeek);
      const consGame = consolationFinals.reduce((best, r) => {
        const combined = toNum(r.team1Points) + toNum(r.team2Points);
        const bestCombined = toNum(best.team1Points) + toNum(best.team2Points);
        return combined > bestCombined ? r : best;
      });
      if (consGame.winnerTeamId) {
        const cb = buckets.get(consGame.winnerTeamId);
        if (cb) cb.isConsolationWinner = true;
      }
    }

    // Assign final ranks:
    //   1st = champion, 2nd = runner-up, 3rd = consolation winner ...
    //   Remaining: sorted by playoff wins desc
    const champion = [...buckets.entries()].find(([, b]) => b.isChampion);
    const consolationWinner = [...buckets.entries()].find(([, b]) => b.isConsolationWinner && !b.isChampion);
    if (champion) champion[1].finalRank = 1;
    if (consolationWinner) consolationWinner[1].finalRank = 3;

    // Runner-up: most playoff wins among non-champion playoff teams
    const runnerUp = [...buckets.entries()]
      .filter(([, b]) => b.madePlayoffs && !b.isChampion && !b.isConsolationWinner)
      .sort(([, a], [, b]) => b.playoffWins - a.playoffWins)[0];
    if (runnerUp) runnerUp[1].finalRank = 2;

    // Consolation runner-up
    const consRunnerUp = [...buckets.entries()]
      .filter(([, b]) => b.madePlayoffs && !b.isChampion && b.finalRank !== 2 && !b.isConsolationWinner)
      .sort(([, a], [, b]) => b.playoffWins - a.playoffWins)[0];
    if (consRunnerUp) consRunnerUp[1].finalRank = 4;
  }

  // Upsert
  const now = new Date();
  for (const [teamId, bucket] of buckets) {
    await db
      .insert(playoffResults)
      .values({
        teamId,
        leagueId,
        season,
        madePlayoffs: bucket.madePlayoffs,
        playoffWins: bucket.playoffWins,
        playoffLosses: bucket.playoffLosses,
        isChampion: bucket.isChampion,
        isConsolationWinner: bucket.isConsolationWinner,
        finalRank: bucket.finalRank,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [playoffResults.teamId, playoffResults.season],
        set: {
          leagueId: sql`excluded.league_id`,
          season: sql`excluded.season`,
          madePlayoffs: sql`excluded.made_playoffs`,
          playoffWins: sql`excluded.playoff_wins`,
          playoffLosses: sql`excluded.playoff_losses`,
          isChampion: sql`excluded.is_champion`,
          isConsolationWinner: sql`excluded.is_consolation_winner`,
          finalRank: sql`excluded.final_rank`,
          updatedAt: now,
        },
      });
  }
}

/**
 * Recompute both season_stats and playoff_results for a league.
 */
export async function recomputeLeagueStats(leagueId: number): Promise<void> {
  await Promise.all([
    recomputeSeasonStats(leagueId),
    recomputePlayoffResults(leagueId),
  ]);
}
