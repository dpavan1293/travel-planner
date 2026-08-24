import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async (req) => {

  try {

    const {
      place,
      existingActivities = []
    } = await req.json();

    const response = await client.responses.create({

      prompt: {
        id: "pmpt_6a8842f44c6c8193b82b31ea2222aa1609a9b6d96cde6663"
      },

      input: [
        {
          role: "user",
          content: JSON.stringify({
            date,
            destination,
			existingActivities
          })
        }
      ]

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

    console.error(error);

    return new Response(
      JSON.stringify({
        error: "Errore durante la generazione dei suggerimenti"
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