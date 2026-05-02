import {
  crossViewQuery,
  getAllManagers,
  getAllSeasons,
  getChampionHistory,
  getHeadToHead,
  getLeagueBySeason,
  getMatchups,
  getPlayoffResults,
  getPlayers,
  getSeasonStats,
  getStandings,
  getTeamByKey,
  getTeams,
  getTopScorers,
} from "@/lib/db/queries";

export const chatTools = {
  getStandings,
  getAllSeasons,
  getLeagueBySeason,
  getTeams,
  getTeamByKey,
  getAllManagers,
  getHeadToHead,
  getPlayers,
  getTopScorers,
  getMatchups,
  getSeasonStats,
  getPlayoffResults,
  getChampionHistory,
  crossViewQuery,
};

export type ChatToolName = keyof typeof chatTools;

export const chatToolDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "getStandings",
      description: "Get standings for a league and optional season",
      parameters: {
        type: "object",
        properties: {
          leagueId: { type: "string" },
          season: { type: "number" },
        },
        required: ["leagueId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getAllSeasons",
      description: "Get all seasons with summary stats",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getAllManagers",
      description: "Get all managers with all-time aggregate record",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getHeadToHead",
      description: "Get head to head record between two managers",
      parameters: {
        type: "object",
        properties: {
          manager1Id: { type: "string" },
          manager2Id: { type: "string" },
        },
        required: ["manager1Id", "manager2Id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getPlayers",
      description: "Search/filter players with stats",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string" },
          position: { type: "string" },
          season: { type: "number" },
          limit: { type: "number" },
          offset: { type: "number" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getTopScorers",
      description: "Get top scorers for season/week",
      parameters: {
        type: "object",
        properties: {
          season: { type: "number" },
          week: { type: "number" },
          position: { type: "string" },
          limit: { type: "number" },
        },
        required: ["season"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getMatchups",
      description: "Get matchups with filters",
      parameters: {
        type: "object",
        properties: {
          leagueId: { type: "string" },
          season: { type: "number" },
          week: { type: "number" },
          teamId: { type: "string" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "crossViewQuery",
      description: "Run flexible cross view query",
      parameters: {
        type: "object",
        properties: {
          viewType: { type: "string", enum: ["team", "manager"] },
          entityId: { type: "string" },
          season: { type: "number" },
          week: { type: "number" },
          dataType: { type: "string", enum: ["record", "roster", "matchups", "stats", "transactions"] },
          position: { type: "string" },
          compareEntityId: { type: "string" },
        },
        required: ["viewType", "entityId", "dataType"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getTeams",
      description: "Get teams filtered by season, league, or manager",
      parameters: {
        type: "object",
        properties: {
          season: { type: "number" },
          leagueId: { type: "string" },
          managerId: { type: "string" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getLeagueBySeason",
      description: "Get league details for a specific season",
      parameters: {
        type: "object",
        properties: {
          season: { type: "number" },
        },
        required: ["season"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getSeasonStats",
      description: "Get pre-computed season stats (wins, losses, ties, points for/against, expected wins, rank) for teams. Expected wins measures how many wins a team would have accumulated if they had played against every other team each week.",
      parameters: {
        type: "object",
        properties: {
          leagueId: { type: "string" },
          season: { type: "number" },
          managerId: { type: "string" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getPlayoffResults",
      description: "Get playoff performance per team per season — whether they made playoffs, playoff wins/losses, champion status, and final rank",
      parameters: {
        type: "object",
        properties: {
          leagueId: { type: "string" },
          season: { type: "number" },
          managerId: { type: "string" },
          championsOnly: { type: "boolean" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getChampionHistory",
      description: "Get the champion (winning team and manager) for every season in league history",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

export async function runChatTool(name: string, args: Record<string, unknown>) {
  switch (name as ChatToolName) {
    case "getStandings":
      return chatTools.getStandings(String(args.leagueId), typeof args.season === "number" ? args.season : undefined);
    case "getAllSeasons":
      return chatTools.getAllSeasons();
    case "getLeagueBySeason":
      return chatTools.getLeagueBySeason(Number(args.season));
    case "getTeams":
      return chatTools.getTeams({
        season: typeof args.season === "number" ? args.season : undefined,
        managerId: typeof args.managerId === "string" ? args.managerId : undefined,
        leagueId: typeof args.leagueId === "string" ? args.leagueId : undefined,
      });
    case "getTeamByKey":
      return chatTools.getTeamByKey(String(args.teamKey));
    case "getAllManagers":
      return chatTools.getAllManagers();
    case "getHeadToHead":
      return chatTools.getHeadToHead(String(args.manager1Id), String(args.manager2Id));
    case "getPlayers":
      return chatTools.getPlayers({
        search: typeof args.search === "string" ? args.search : undefined,
        position: typeof args.position === "string" ? args.position : undefined,
        season: typeof args.season === "number" ? args.season : undefined,
        teamId: typeof args.teamId === "string" ? args.teamId : undefined,
        leagueId: typeof args.leagueId === "string" ? args.leagueId : undefined,
        limit: typeof args.limit === "number" ? args.limit : undefined,
        offset: typeof args.offset === "number" ? args.offset : undefined,
      });
    case "getTopScorers":
      return chatTools.getTopScorers({
        season: Number(args.season),
        week: typeof args.week === "number" ? args.week : undefined,
        position: typeof args.position === "string" ? args.position : undefined,
        limit: typeof args.limit === "number" ? args.limit : undefined,
      });
    case "getMatchups":
      return chatTools.getMatchups({
        leagueId: typeof args.leagueId === "string" ? args.leagueId : undefined,
        season: typeof args.season === "number" ? args.season : undefined,
        week: typeof args.week === "number" ? args.week : undefined,
        teamId: typeof args.teamId === "string" ? args.teamId : undefined,
      });
    case "getSeasonStats":
      return chatTools.getSeasonStats({
        leagueId: typeof args.leagueId === "string" ? args.leagueId : undefined,
        season: typeof args.season === "number" ? args.season : undefined,
        managerId: typeof args.managerId === "string" ? args.managerId : undefined,
      });
    case "getPlayoffResults":
      return chatTools.getPlayoffResults({
        leagueId: typeof args.leagueId === "string" ? args.leagueId : undefined,
        season: typeof args.season === "number" ? args.season : undefined,
        managerId: typeof args.managerId === "string" ? args.managerId : undefined,
        championsOnly: typeof args.championsOnly === "boolean" ? args.championsOnly : undefined,
      });
    case "getChampionHistory":
      return chatTools.getChampionHistory();
    case "crossViewQuery":
      return chatTools.crossViewQuery({
        viewType: args.viewType === "manager" ? "manager" : "team",
        entityId: String(args.entityId),
        season: typeof args.season === "number" ? args.season : undefined,
        week: typeof args.week === "number" ? args.week : undefined,
        dataType: (args.dataType as "record" | "roster" | "matchups" | "stats" | "transactions") ?? "record",
        position: typeof args.position === "string" ? args.position : undefined,
        compareEntityId: typeof args.compareEntityId === "string" ? args.compareEntityId : undefined,
      });
    default:
      throw new Error(`Unsupported tool: ${name}`);
  }
}

export async function listSeasons() {
  return getAllSeasons();
}

export async function listTeams() {
  const teams = await getTeams({});
  return teams.map((team) => ({ id: team.id, name: team.name }));
}
