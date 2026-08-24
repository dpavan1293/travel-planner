import OpenAI from "openai";
import { neon } from "@netlify/neon";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 180_000,
});

export default async (req) => {
  const t0 = Date.now();
  try {

    const {
      jobId,
      destination,
      duration,
      travel_period,
      travel_dates,
      travel_style
    } = await req.json();

    if (!jobId) {
      return new Response(JSON.stringify({ error: "jobId mancante" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = req.clientContext?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Non autenticato" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = user.sub;
    const resultKey = `ai-result:${jobId}`;

    console.log(`[itinerary] START jobId=${jobId}`, { destination, duration, travel_period, travel_dates, travel_style });

    const sql = neon();

    // Mark as processing
    await sql`
      INSERT INTO kv_store(user_id, key, value, updated_at)
      VALUES (${userId}, ${resultKey}, ${JSON.stringify({ status: "processing" })}, now())
      ON CONFLICT (user_id, key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `;

    console.log(`[itinerary] Returning 202, OpenAI will run in background`);

    // Fire and forget — don't await
    (async () => {
      try {
        console.log("[itinerary] Calling OpenAI...");
        const response = await client.responses.create({
          prompt: {
            "id": "pmpt_6a8b12dad62c8193aef0584fc484046c0fcd35c99bb9d0cf",
            "variables": {
              "destination": String(destination ?? ""),
              "duration": String(duration ?? ""),
              "travel_period": String(travel_period ?? ""),
              "travel_dates": String(travel_dates ?? ""),
              "travel_style": String(travel_style ?? "")
            }
          }
        });

        console.log(`[itinerary] OpenAI DONE — ${response.output_text.length} chars, ${Date.now() - t0}ms`);

        const result = JSON.stringify({ status: "done", data: response.output_text });
        await sql`
          INSERT INTO kv_store(user_id, key, value, updated_at)
          VALUES (${userId}, ${resultKey}, ${result}, now())
          ON CONFLICT (user_id, key)
          DO UPDATE SET value = EXCLUDED.value, updated_at = now()
        `;
        console.log(`[itinerary] Result saved to DB, key: ${resultKey}`);
      } catch (err) {
        console.error(`[itinerary] OpenAI ERROR after ${Date.now() - t0}ms:`, err.message);
        const errResult = JSON.stringify({ status: "error", error: err.message });
        await sql`
          INSERT INTO kv_store(user_id, key, value, updated_at)
          VALUES (${userId}, ${resultKey}, ${errResult}, now())
          ON CONFLICT (user_id, key)
          DO UPDATE SET value = EXCLUDED.value, updated_at = now()
        `;
      }
    })();

    return new Response(JSON.stringify({ jobId }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error(`[itinerary] FATAL after ${Date.now() - t0}ms:`, error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
