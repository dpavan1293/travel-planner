import { neon } from "@netlify/neon";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const sql = neon();
const dir = join(process.cwd(), "netlify/database/migrations");

const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const file of files) {
  const raw = readFileSync(join(dir, file), "utf8");
  const statements = raw.split(";").map((s) => s.trim()).filter(Boolean);
  console.log(`Running ${file} (${statements.length} statements) ...`);
  for (const stmt of statements) {
    await sql.query(stmt + ";");
  }
  console.log(`Done.`);
}

console.log("All migrations complete.");
