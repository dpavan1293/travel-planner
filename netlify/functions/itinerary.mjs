import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const handler = async (event) => {
  try {
    const response = await client.responses.create({
      prompt: {
        "id": "pmpt_6a8b12dad62c8193aef0584fc484046c0fcd35c99bb9d0cf",
        "variables": {
          "destination": "bali",
          "duration": "14",
          "travel_period": "april",
          "travel_dates": "",
          "travel_style": "nature"
        }
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ text: response.output_text }),
    };
  } catch (error) {
    console.error("OpenAI test error:", error);
    return {
      statusCode: error.status || 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
