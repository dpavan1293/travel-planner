import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async (req) => {

  try {

    const {
      destination,
      date,
      existingactivities = []
    } = await req.json();

    console.log("[activities] START", { destination, date, existingactivities });

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
            existingactivities
          })
        }
      ],

      text: {
        format: {
          type: "json_schema",
          name: "day_activities",
          strict: false,
          schema: {
            type: "object",
            properties: {
              activities: {
                type: "array",
                description: "List of activities suggested for the requested destination.",
                items: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                      description: "Name of the activity or attraction."
                    },
                    description: {
                      type: "string",
                      description: "Short description of the activity, explaining why it is interesting."
                    },
                    duration_minutes: {
                      type: "integer",
                      description: "Approximate time needed to visit or experience the activity, in minutes."
                    }
                  },
                  required: ["name", "description", "duration_minutes"],
                  additionalProperties: false
                }
              }
            },
            required: ["activities"],
            additionalProperties: false
          }
        }
      }

    });

    console.log("[activities] DONE —", response.output_text.length, "chars");

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

    console.error("[activities] ERROR:", error.message);

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
