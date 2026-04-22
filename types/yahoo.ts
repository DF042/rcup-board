export interface YahooApiResponse<T> {
  fantasy_content: T;
}

export interface YahooManager {
  manager_id?: string;
  guid: string;
  nickname: string;
  email?: string;
  image_url?: string;
}

export interface YahooLeague {
  league_key: string;
  league_id: string;
  season: string;
  name: string;
  sport: string;
  scoring_type?: string;
  num_teams?: number;
  settings?: Record<string, unknown>;
}

export interface YahooTeam {
  team_key: string;
  team_id: string;
  league_id?: string;
  name: string;
  logo_url?: string;
  waiver_priority?: number;
  faab_balance?: number;
  number_of_moves?: number;
  number_of_trades?: number;
  managers?: YahooManager[];
  standings?: Record<string, unknown>;
  draft_results?: Record<string, unknown>;
  roster?: YahooRoster;
}

export interface YahooPlayer {
  player_key: string;
  player_id: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  editorial_team_abbr?: string;
  uniform_number?: string;
  status?: string;
  headshot?: { url?: string };
  positions?: string[];
  eligible_positions?: string[];
}

export interface YahooRoster {
  team_key?: string;
  week?: number;
  players: YahooPlayer[];
}

export interface YahooMatchup {
  league_id?: string;
  week: number;
  teams: Array<{
    team_key: string;
    team_points?: { total?: string };
  }>;
  is_playoffs?: boolean;
  is_consolation?: boolean;
}

export interface YahooTransaction {
  transaction_key: string;
  league_id?: string;
  type: string;
  status?: string;
  timestamp: string;
  players?: unknown[];
}

export interface YahooPlayerStats {
  player_key: string;
  league_id?: string;
  team_key?: string;
  week?: number;
  season: number;
  stat_values: Record<string, string | number>;
  points?: number;
}

export interface YahooStatCategory {
  league_id?: string;
  stat_id: string;
  name: string;
  display_name?: string;
  sort_order?: number;
  is_only_display_stat?: boolean;
}
