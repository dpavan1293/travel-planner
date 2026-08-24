import OpenAI from "openai";


const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 180_000,
});

export default async (req) => {
  try {

    const {
      destination,
      duration,
      travel_period,
      travel_dates,
      travel_style
    } = await req.json();
	
	console.log("FUNCTION START:", new Date().toISOString());

	console.log("OPENAI START:", new Date().toISOString());

    const stream = await client.responses.create({
      stream: true,
      prompt: {
        "id": "pmpt_6a8b12dad62c8193aef0584fc484046c0fcd35c99bb9d0cf",
		"version": "8",
        "variables": {
          "destination": String(destination ?? ""),
          "duration": String(duration ?? ""),
          "travel_period": String(travel_period ?? ""),
          "travel_dates": String(travel_dates ?? ""),
          "travel_style": String(travel_style ?? "")
        }
      }
    });

    let text = "";
    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        text += event.delta;
      }
    }

	console.log("OPENAI END:", new Date().toISOString());
    return new Response(
      text,
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
	

	console.log("FUNCTION END:", new Date().toISOString());

  } catch (error) {
  console.error("OPENAI ERROR:");
  console.error(error);

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