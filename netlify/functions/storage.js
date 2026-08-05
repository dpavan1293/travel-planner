// Funzione serverless: legge/scrive coppie chiave-valore su Netlify Database (Postgres),
// isolate per utente tramite Netlify Identity.
//
// Endpoint: /.netlify/functions/storage
//   GET    ?key=...            -> { key, value, shared: false }
//   GET    ?list=1&prefix=...  -> { keys: [...], prefix, shared: false }
//   POST   { key, value }      -> upsert, ritorna { key, value, shared: false }
//   DELETE ?key=...            -> { key, deleted: true, shared: false }
//
// Richiede l'header Authorization: Bearer <token Netlify Identity>, popolato
// automaticamente da Netlify quando la richiesta arriva da un utente loggato
// (vedi src/storage.js sul frontend).
//
// Usa @netlify/neon (client HTTP su Neon/Postgres) invece del driver "pg" classico:
// quest'ultimo apre connessioni TCP dirette che spesso non funzionano bene nell'ambiente
// serverless di Netlify e causano crash (502) all'avvio della funzione.

import { neon } from "@netlify/neon";

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export async function handler(event, context) {
  // Inizializzazione del client dentro l'handler (non a livello di modulo):
  // se il database non è collegato al sito, questo genera un errore leggibile
  // (500 con messaggio) invece di far crashare l'intera funzione (502 muto).
  export async function handler(event, context) {
  console.log("START STORAGE");

  let sql;
  try {
    sql = neon();
    console.log("NEON OK");
  } catch (err) {
    console.error("NEON ERROR", err);
    return json(500, { error: err.message });
  }

  console.log("BEFORE AUTH");

  const user = context.clientContext && context.clientContext.user;

  if (!user) {
    console.log("NO USER");
    return json(401, { error: "Non autenticato" });
  }
  console.log("USER OK");
  ...
}

  const user = context.clientContext && context.clientContext.user;
  if (!user) {
    return json(401, { error: "Non autenticato" });
  }
  const userId = user.sub;

  try {
    if (event.httpMethod === "GET") {
      const params = event.queryStringParameters || {};

      if (params.list) {
        const prefix = params.prefix || "";
        const rows = await sql`
          SELECT key FROM kv_store
          WHERE user_id = ${userId} AND key LIKE ${prefix + "%"}
          ORDER BY key
        `;
        return json(200, { keys: rows.map((r) => r.key), prefix, shared: false });
      }

      const key = params.key;
      if (!key) return json(400, { error: "Parametro 'key' mancante" });

      const rows = await sql`
        SELECT value FROM kv_store
        WHERE user_id = ${userId} AND key = ${key}
        LIMIT 1
      `;
      if (!rows.length) return json(404, { error: "Chiave non trovata" });
      return json(200, { key, value: rows[0].value, shared: false });
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { key, value } = body;
      if (!key) return json(400, { error: "Campo 'key' mancante" });

      await sql`
        INSERT INTO kv_store (user_id, key, value, updated_at)
        VALUES (${userId}, ${key}, ${value}, now())
        ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
      `;
      return json(200, { key, value, shared: false });
    }

    if (event.httpMethod === "DELETE") {
      const params = event.queryStringParameters || {};
      const key = params.key;
      if (!key) return json(400, { error: "Parametro 'key' mancante" });

      await sql`DELETE FROM kv_store WHERE user_id = ${userId} AND key = ${key}`;
      return json(200, { key, deleted: true, shared: false });
    }

    return json(405, { error: "Metodo non supportato" });
  } catch (err) {
    return json(500, { error: err.message });
  }
};
