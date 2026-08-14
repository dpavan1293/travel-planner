import { handler } from "./netlify/functions/storage.js";

const event = {
  httpMethod: "POST",
  headers: {
    authorization: "Bearer local-dev-token",
    "content-type": "application/json",
  },
  body: JSON.stringify({ key: "test-probe", value: "hello" }),
};

const res = await handler(event, {});
console.log("STATUS", res.statusCode);
console.log("BODY", res.body);
