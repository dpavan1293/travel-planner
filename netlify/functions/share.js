// Funzione serverless per condividere un viaggio come COPIA modificabile.
//
// Non è condivisione in tempo reale: chi riceve il link ottiene una copia indipendente
// del viaggio sul proprio account, che può modificare liberamente senza toccare l'originale
// (e viceversa). Per condividere in sola lettura, si usa invece l'export HTML.
//
// Endpoint: /.netlify/functions/share
//   POST { tripId }          -> (richiede login, proprietario) crea/riusa un token per il
//                                 viaggio, ritorna { token }
//   POST { token, accept:true } -> (richiede login, chi riceve il link) importa una copia
//                                 del viaggio nel proprio account, ritorna { tripId, title }
//   DELETE ?tripId=...       -> (richiede login, proprietario) revoca il link di condivisione

import { neon } from "@netlify/neon";

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export async function handler(event, context) {
  let sql;
  try {
    sql = neon();
  } catch (err) {
    return json(500, { error: `Database non collegato al sito: ${err.message}` });
  }

  const user = context.clientContext && context.clientContext.user;
  if (!user) return json(401, { error: "Non autenticato" });
  const userId = user.sub;

  try {
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");

      // Il proprietario chiede un link di condivisione per un suo viaggio.
      if (body.tripId && !body.accept) {
        const tripId = body.tripId;

        const existing = await sql`
          SELECT token FROM trip_shares WHERE owner_id = ${userId} AND trip_id = ${tripId} LIMIT 1
        `;
        if (existing.length) return json(200, { token: existing[0].token });

        const token = crypto.randomUUID().replace(/-/g, "");
        await sql`
          INSERT INTO trip_shares (token, owner_id, trip_id) VALUES (${token}, ${userId}, ${tripId})
        `;
        return json(200, { token });
      }

      // Chi riceve il link importa una copia modificabile del viaggio sul proprio account.
      if (body.token && body.accept) {
        const shareRows = await sql`
          SELECT owner_id, trip_id FROM trip_shares WHERE token = ${body.token} LIMIT 1
        `;
        if (!shareRows.length) return json(404, { error: "Link di condivisione non valido o scaduto" });

        const { owner_id, trip_id } = shareRows[0];
        const tripRows = await sql`
          SELECT value FROM kv_store WHERE user_id = ${owner_id} AND key = ${`trip:${trip_id}`} LIMIT 1
        `;
        if (!tripRows.length) return json(404, { error: "Il viaggio condiviso non esiste più" });

        const originalData = JSON.parse(tripRows[0].value);
        const newTripId = uid();
        const newTitle = `${originalData.tripTitle || "Viaggio condiviso"} (condiviso)`;
        const newData = { ...originalData, tripTitle: newTitle };

        await sql`
          INSERT INTO kv_store (user_id, key, value, updated_at)
          VALUES (${userId}, ${`trip:${newTripId}`}, ${JSON.stringify(newData)}, now())
        `;

        // Aggiungiamo il nuovo viaggio all'indice di chi lo riceve (leggi-modifica-scrivi).
        const indexRows = await sql`
          SELECT value FROM kv_store WHERE user_id = ${userId} AND key = 'trips-index' LIMIT 1
        `;
        const currentIndex = indexRows.length ? JSON.parse(indexRows[0].value) : [];
        const newEntry = { id: newTripId, title: newTitle, createdAt: Date.now() };
        const nextIndex = [newEntry, ...currentIndex];

        await sql`
          INSERT INTO kv_store (user_id, key, value, updated_at)
          VALUES (${userId}, 'trips-index', ${JSON.stringify(nextIndex)}, now())
          ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
        `;

        return json(200, { tripId: newTripId, title: newTitle });
      }

      return json(400, { error: "Richiesta non valida" });
    }

    if (event.httpMethod === "DELETE") {
      const tripId = (event.queryStringParameters || {}).tripId;
      if (!tripId) return json(400, { error: "Parametro 'tripId' mancante" });
      await sql`DELETE FROM trip_shares WHERE owner_id = ${userId} AND trip_id = ${tripId}`;
      return json(200, { ok: true });
    }

    return json(405, { error: "Metodo non supportato" });
  } catch (err) {
    return json(500, { error: err.message });
  }
}
