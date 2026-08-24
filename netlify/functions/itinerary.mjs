import OpenAI from "openai";


const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 180_000,
});

export default async (req) => {
  const t0 = Date.now();
  try {

    const {
      destination,
      duration,
      travel_period,
      travel_dates,
      travel_style
    } = await req.json();
	
	console.log("[itinerary] START", { destination, duration, travel_period, travel_dates, travel_style });

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
	console.log("[itinerary] Response preview:", response.output_text.substring(0, 200));

    return new Response(
      response.output_text,
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  } catch (error) {
  console.error(`[itinerary] ERROR after ${Date.now() - t0}ms:`, error.message);
  console.error("[itinerary] Error details:", { status: error.status, code: error.code, type: error.type });

  return new Response(
    JSON.stringify({
      error: error.message,
      status: error.status,
      code: error.code,
      type: error.type
    }),
    {
      status: error.status || 500,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}
};
