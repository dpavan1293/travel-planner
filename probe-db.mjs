import { neon } from "@netlify/neon";
const sql = neon({ connectionString: process.env.NETLIFY_DATABASE_URL });
try {
  const rows = await sql`SELECT 1 AS ok`;
  console.log("DB OK", JSON.stringify(rows));
} catch (e) {
  console.error("DB ERR", e.message);
}
