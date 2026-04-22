export type ViewMode = "desktop" | "mobile";

export interface FilterState {
  season?: number;
  leagueId?: number;
  teamId?: number;
  managerId?: number;
  search?: string;
}
