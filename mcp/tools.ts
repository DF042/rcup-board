import { db } from "@/lib/db";
import { leagues, teams } from "@/lib/db/schema";

export async function listSeasons() {
  return db.select({ season: leagues.season }).from(leagues);
}

export async function listTeams() {
  return db.select({ id: teams.id, name: teams.name }).from(teams);
}
