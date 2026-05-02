export type Achievement = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  earned: boolean;
};

export function computeAchievements(params: {
  seasons: Array<{ season: number; wins: number; losses: number; ties: number; rank: number; pointsFor: number }>;
  playoffSeasons: Array<{ madePlayoffs: boolean; playoffWins: number; playoffLosses: number; isChampion: boolean; finalRank: number; season: number }>;
  totalWins: number;
  totalLosses: number;
  totalTies: number;
  avgPointsFor: number;
  totalPointsFor: number;
  bestFinish: number | null;
  worstFinish: number | null;
  seasonsPlayed: number;
}): Achievement[] {
  const { seasons, playoffSeasons, totalWins, totalLosses, totalTies, avgPointsFor, totalPointsFor, worstFinish, seasonsPlayed } = params;
  const totalGames = totalWins + totalLosses + totalTies;
  const winRate = totalGames > 0 ? totalWins / totalGames : 0;
  const sortedSeasons = [...seasons].sort((a, b) => a.season - b.season);

  return [
    {
      id: "license_to_kill",
      name: "License to Kill",
      emoji: "🔫",
      description: "Maintain a win rate above 60%",
      earned: winRate > 0.60,
    },
    {
      id: "secret_agent",
      name: "Secret Agent",
      emoji: "🕵️",
      description: "Make the playoffs in at least 2 seasons",
      earned: playoffSeasons.filter(s => s.madePlayoffs).length >= 2,
    },
    {
      id: "double_0_agent",
      name: "00 Agent",
      emoji: "🎯",
      description: "Win a championship",
      earned: playoffSeasons.some(s => s.isChampion),
    },
    {
      id: "double_0_status",
      name: "Double 0 Status",
      emoji: "👑",
      description: "Win multiple championships",
      earned: playoffSeasons.filter(s => s.isChampion).length >= 2,
    },
    {
      id: "goldeneye",
      name: "GoldenEye",
      emoji: "🥇",
      description: "Perfect playoff run — won every playoff game with no losses in a season",
      earned: playoffSeasons.some(s => s.madePlayoffs && s.playoffLosses === 0 && s.playoffWins > 0),
    },
    {
      id: "jaws",
      name: "Jaws",
      emoji: "🦈",
      description: "Score over 1500 total points in a single season",
      earned: seasons.some(s => s.pointsFor > 1500),
    },
    {
      id: "oddjob",
      name: "Oddjob",
      emoji: "🎩",
      description: "Finish as the #1 seed in the regular season",
      earned: seasons.some(s => s.rank === 1),
    },
    {
      id: "facility",
      name: "Facility",
      emoji: "🏢",
      description: "Play in 3 or more seasons",
      earned: seasonsPlayed >= 3,
    },
    {
      id: "bunker",
      name: "Bunker",
      emoji: "🏰",
      description: "Survive a bottom-4 finish and bounce back to the top 4",
      earned: (() => {
        for (let i = 0; i < sortedSeasons.length - 1; i++) {
          if (sortedSeasons[i].rank >= 8 && sortedSeasons[i + 1].rank <= 4) return true;
        }
        return false;
      })(),
    },
    {
      id: "stack",
      name: "Stacked Deck",
      emoji: "💰",
      description: "Average over 110 points per game",
      earned: avgPointsFor > 110,
    },
    {
      id: "toilet_bowl",
      name: "Toilet Bowl Champion",
      emoji: "🚽",
      description: "Finish in last place in at least one season",
      earned: seasons.length > 0 && worstFinish !== null && seasons.some(s => s.rank === worstFinish && worstFinish > seasons.length / 2),
    },
    {
      id: "dynasty",
      name: "Dynasty",
      emoji: "⚔️",
      description: "Make the playoffs 3 or more seasons in a row",
      earned: (() => {
        const sorted = [...playoffSeasons].sort((a, b) => a.season - b.season);
        let streak = 0;
        for (const s of sorted) {
          streak = s.madePlayoffs ? streak + 1 : 0;
          if (streak >= 3) return true;
        }
        return false;
      })(),
    },
    {
      id: "upset_city",
      name: "Upset City",
      emoji: "💥",
      description: "Make the playoffs despite finishing in the bottom half of the regular season",
      earned: (() => {
        if (!seasons.length) return false;
        const maxRank = Math.max(...seasons.map(s => s.rank));
        return playoffSeasons.some(ps => {
          if (!ps.madePlayoffs) return false;
          const reg = seasons.find(s => s.season === ps.season);
          return reg ? reg.rank > maxRank / 2 : false;
        });
      })(),
    },
    {
      id: "grinder",
      name: "The Grinder",
      emoji: "⚙️",
      description: "Play in 5 or more seasons",
      earned: seasonsPlayed >= 5,
    },
    {
      id: "redemption_arc",
      name: "Redemption Arc",
      emoji: "🔄",
      description: "Improve your finish by 5 or more places from one season to the next",
      earned: (() => {
        for (let i = 0; i < sortedSeasons.length - 1; i++) {
          if (sortedSeasons[i].rank - sortedSeasons[i + 1].rank >= 5) return true;
        }
        return false;
      })(),
    },
    {
      id: "high_roller",
      name: "High Roller",
      emoji: "💎",
      description: "Accumulate over 5000 total points across all seasons",
      earned: totalPointsFor > 5000,
    },
  ];
}
