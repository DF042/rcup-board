#!/usr/bin/env tsx
import fs from "node:fs/promises";
import path from "node:path";

async function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    try {
      const content = await fs.readFile(path.resolve(process.cwd(), file), "utf8");
      for (const line of content.split(/\r?\n/)) {
        const match = line.match(/^\s*([^#=\s][^=]*?)\s*=\s*(.*)\s*$/);
        if (match && process.env[match[1]] == null) {
          process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
        }
      }
    } catch {
      // ignore missing files
    }
  }
}

async function main() {
  await loadEnv();

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Add it to your .env.local file.\n" +
        "Example format: DATABASE_URL=<your-postgres-connection-string>",
    );
  }

  const { importYahooPayload } = await import("@/lib/yahoo/importer");

  const filePath = process.argv[2];
  if (!filePath) {
    throw new Error("Usage: tsx scripts/import-yahoo.ts <path-to-json>");
  }

  const content = await fs.readFile(filePath, "utf8");
  const payload = JSON.parse(content) as unknown;
  const result = await importYahooPayload(payload);
  const { summary } = result;

  console.log(
    `✓ Imported: ${summary.league} league, ${summary.teams} teams, ${summary.managers} managers, ${summary.players} players, ${summary.matchups} matchups, ${summary.rosters} rosters, ${summary.stats} stats, ${summary.transactions} transactions, ${summary.statCategories} stat categories`,
  );
}

main().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
