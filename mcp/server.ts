import { listSeasons, listTeams } from "./tools";

async function main() {
  const seasons = await listSeasons();
  const teamRows = await listTeams();
  console.log(JSON.stringify({ seasons, teams: teamRows.length }));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
