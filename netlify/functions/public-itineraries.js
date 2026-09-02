import { neon } from "@netlify/neon";

const ADMIN_EMAILS = ["ignorman93@gmail.com"];

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function isAdmin(user) {
  return user && ADMIN_EMAILS.includes(user.email);
}

export async function handler(event, context) {
  let sql;
  try {
    sql = neon();
    await sql`SELECT 1`;
  } catch (err) {
    return json(500, { error: err.message });
  }

  try {
    switch (event.httpMethod) {
      case "GET": {
        let rows;
        try {
          rows = await sql`SELECT id, data::text as data FROM public_itineraries ORDER BY updated_at DESC`;
        } catch (e) {
          return json(500, { error: "SQL error: " + e.message });
        }
        const itineraries = [];
        for (const r of rows) {
          try {
            let data;
            if (typeof r.data === "string") {
              data = JSON.parse(r.data);
            } else if (typeof r.data === "object" && r.data !== null) {
              data = r.data;
            } else {
              data = {};
            }
            itineraries.push({ id: r.id, ...data });
          } catch (e) {
            itineraries.push({ id: r.id, _error: e.message, _dataType: typeof r.data, _raw: String(r.data).slice(0, 200) });
          }
        }
        return json(200, { itineraries });
      }

      case "POST": {
        const user = context.clientContext?.user;
        if (!user || !isAdmin(user)) {
          return json(403, { error: "Non autorizzato" });
        }

        const body = JSON.parse(event.body || "{}");
        if (!body.id || !body.data) {
          return json(400, { error: "Campi 'id' e 'data' obbligatori" });
        }

        const dataStr = typeof body.data === "string" ? body.data : JSON.stringify(body.data);

        await sql`
          INSERT INTO public_itineraries(id, data, created_by, updated_at)
          VALUES (${body.id}, ${dataStr}, ${user.sub}, now())
          ON CONFLICT (id)
          DO UPDATE SET
            data = EXCLUDED.data,
            updated_at = now()
        `;

        return json(200, { id: body.id, saved: true });
      }

      case "DELETE": {
        const user = context.clientContext?.user;
        if (!user || !isAdmin(user)) {
          return json(403, { error: "Non autorizzato" });
        }

        const params = event.queryStringParameters || {};
        if (!params.id) {
          return json(400, { error: "Parametro 'id' mancante" });
        }

        await sql`DELETE FROM public_itineraries WHERE id = ${params.id}`;
        return json(200, { id: params.id, deleted: true });
      }

      default:
        return json(405, { error: "Metodo non supportato" });
    }
  } catch (err) {
    return json(500, { error: err.message });
  }
}
