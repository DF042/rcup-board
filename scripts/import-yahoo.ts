#!/usr/bin/env tsx
import fs from "node:fs/promises";
import { importYahooPayload } from "@/lib/yahoo/importer";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    throw new Error("Usage: tsx scripts/import-yahoo.ts <path-to-json>");
  }

  const content = await fs.readFile(filePath, "utf8");
  const payload = JSON.parse(content) as unknown;
  const result = await importYahooPayload(payload);
  const { summary } = result;

  console.log(
    `✓ Imported: ${summary.league} league, ${summary.teams} teams, ${summary.managers} managers, ${summary.players} players, ${summary.matchups} matchups, ${summary.rosters} rosters, ${summary.stats} stats, ${summary.transactions} transactions`,
  );
}

main().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
