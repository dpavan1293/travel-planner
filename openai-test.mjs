/*import OpenAI from "openai";

console.log("KEY PREFIX:", key.substring(0, 15));
console.log("KEY LENGTH:", key.length);

const client = new OpenAI({
  apiKey: key
});

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

  console.log("SUCCESS");
  console.log(response.output_text);

} catch (error) {

  console.error("ERROR");
  console.error("message:", error.message);
  console.error("status:", error.status);
  console.error("code:", error.code);
  console.error("type:", error.type);
}*/