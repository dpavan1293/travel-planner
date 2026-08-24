import OpenAI from "openai";


const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
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

    const response = await client.responses.create({
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