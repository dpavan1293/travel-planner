// Funzione serverless: legge/scrive coppie chiave-valore su Netlify Database (Postgres),
// isolate per utente tramite Netlify Identity.
//
// IMPORTANTE: usa sintassi ES Module (import / export) perché il package.json della root
// dichiara "type": "module" — con sintassi CommonJS (require / exports.handler) la funzione
// va in crash al caricamento (502 muto), prima ancora che qualsiasi try/catch interno
// possa intercettare l'errore.
import { neon } from "@netlify/neon";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event, context) {
  console.log("START STORAGE");

  let sql;

  try {
    sql = neon();
    console.log("NEON CLIENT CREATED");

    // Test connessione
    await sql`SELECT 1`;
    console.log("DATABASE OK");
  } catch (err) {
    console.error("DATABASE ERROR:", err);
    return json(500, {
      error: err.message,
    });
  }

  const user = context.clientContext?.user;

  if (!user) {
    console.log("NO USER");
    return json(401, { error: "Non autenticato" });
  }

  const userId = user.sub;

  try {
    switch (event.httpMethod) {
      case "GET": {
        const params = event.queryStringParameters || {};

        if (params.list) {
          const prefix = params.prefix || "";

          const rows = await sql`
            SELECT key
            FROM kv_store
            WHERE user_id = ${userId}
              AND key LIKE ${prefix + "%"}
            ORDER BY key
          `;

          return json(200, {
            keys: rows.map((r) => r.key),
            prefix,
            shared: false,
          });
        }

        const key = params.key;

        if (!key) {
          return json(400, {
            error: "Parametro 'key' mancante",
          });
        }

        const rows = await sql`
          SELECT value
          FROM kv_store
          WHERE user_id = ${userId}
            AND key = ${key}
          LIMIT 1
        `;

        if (rows.length === 0) {
          return json(404, {
            error: "Chiave non trovata",
          });
        }

        return json(200, {
          key,
          value: rows[0].value,
          shared: false,
        });
      }

      case "POST": {
        const body = JSON.parse(event.body || "{}");

        if (!body.key) {
          return json(400, {
            error: "Campo 'key' mancante",
          });
        }

        await sql`
          INSERT INTO kv_store(user_id, key, value, updated_at)
          VALUES (${userId}, ${body.key}, ${body.value}, now())
          ON CONFLICT (user_id, key)
          DO UPDATE SET
            value = EXCLUDED.value,
            updated_at = now()
        `;

        return json(200, {
          key: body.key,
          value: body.value,
          shared: false,
        });
      }

      case "DELETE": {
        const params = event.queryStringParameters || {};

        if (!params.key) {
          return json(400, {
            error: "Parametro 'key' mancante",
          });
        }

        await sql`
          DELETE FROM kv_store
          WHERE user_id = ${userId}
            AND key = ${params.key}
        `;

        return json(200, {
          key: params.key,
          deleted: true,
          shared: false,
        });
      }

      default:
        return json(405, {
          error: "Metodo non supportato",
        });
    }
  } catch (err) {
    console.error(err);

    return json(500, {
      error: err.message,
    });
  }
}