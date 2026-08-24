import { neon } from "@netlify/neon";

export default async (req) => {
  try {
    const user = req.clientContext?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Non autenticato" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const params = new URL(req.url).searchParams;
    const jobId = params.get("jobId");

    if (!jobId) {
      return new Response(JSON.stringify({ error: "jobId mancante" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const sql = neon();
    const resultKey = `ai-result:${jobId}`;

    const rows = await sql`
      SELECT value
      FROM kv_store
      WHERE user_id = ${user.sub}
        AND key = ${resultKey}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return new Response(JSON.stringify({ status: "processing" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(rows[0].value);

    // Clean up after reading
    if (result.status === "done" || result.status === "error") {
      await sql`
        DELETE FROM kv_store
        WHERE user_id = ${user.sub}
          AND key = ${resultKey}
      `;
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[itinerary-status] ERROR:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
