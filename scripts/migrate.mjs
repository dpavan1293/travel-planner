import { neon } from "@netlify/neon";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const sql = neon();
const base = process.cwd();
const migrationsDir = join(base, "netlify/database/migrations");

const migrationFiles = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const file of migrationFiles) {
  const raw = readFileSync(join(migrationsDir, file), "utf8");
  const statements = raw.split(";").map((s) => s.trim()).filter(Boolean);
  console.log(`Running ${file} (${statements.length} statements) ...`);
  for (const stmt of statements) {
    await sql.query(stmt);
  }
  console.log(`Done.`);
}

console.log("Running seed: inserting itineraries from JSON files ...");
const itinerariesDir = join(base, "src/data/itineraries");
const jsonFiles = readdirSync(itinerariesDir).filter((f) => f.endsWith(".json"));

for (const file of jsonFiles) {
  const data = JSON.parse(readFileSync(join(itinerariesDir, file), "utf8"));
  await sql.query(
    `INSERT INTO public_itineraries (id, data, created_by, updated_at)
     VALUES ($1, $2, 'system', now())
     ON CONFLICT (id) DO NOTHING`,
    [data.id, JSON.stringify(data)]
  );
  console.log(`  Seeded ${data.id}`);
}

console.log("All migrations complete.");
