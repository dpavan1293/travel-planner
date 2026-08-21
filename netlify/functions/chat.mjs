import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async (req) => {
  try {
    const body = await req.json();

    const response = await client.responses.create({
      model: "gpt-5.4-mini",
      input: body.message
    });

    return new Response(
      JSON.stringify({
        reply: response.output_text
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({
        error: "Errore nella chiamata OpenAI"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
};