// Funzione serverless per l'export pubblico di un viaggio.
//
// Rende l'itinerario come pagina web leggibile da chiunque, senza login.
// È la stessa pagina che "Esporta itinerario" mostra nel browser: servita via HTTPS
// le foto caricano anche su iPhone/Safari (il file .html scaricato veniva aperto
// in contesto locale e Safari bloccava le immagini remote).
//
// Endpoint: /.netlify/functions/export
//   GET ?id=<tripId>  -> HTML dell'itinerario (pubblico, senza autenticazione)

import { neon } from "@netlify/neon";
import { readFileSync } from "node:fs";
import { buildParts, renderExportTemplate } from "../../src/lib/exportTemplate.js";

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function htmlDoc(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    body,
  };
}

const NOT_FOUND_HTML = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Viaggio non trovato</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif; background: linear-gradient(135deg, #AEE1F9 0%, #8FD3D9 40%, #7FCBB4 65%, #F5C089 100%); min-height: 100dvh; margin: 0; display: flex; align-items: center; justify-content: center; color: #1B2430; }
  .card { background: rgba(255,255,255,0.75); border: 1px solid rgba(255,255,255,0.65); border-radius: 20px; padding: 40px 44px; text-align: center; max-width: 400px; box-shadow: 0 20px 60px rgba(20,40,50,0.12); }
  h1 { font-size: 22px; font-weight: 650; margin: 0 0 10px; }
  p { font-size: 14px; margin: 0; color: rgba(27,36,48,0.7); }
</style>
</head>
<body>
  <div class="card">
    <h1>Viaggio non trovato</h1>
    <p>Questo itinerario non esiste oppure è stato eliminato.</p>
  </div>
</body>
</html>`;

function tripIdFromEvent(event) {
  const params = event.queryStringParameters || {};
  if (params.id) return params.id.trim();
  const m = (event.path || "").match(/\/export\/([^/]+)\/?$/);
  if (m) return decodeURIComponent(m[1]);
  return "";
}

// Il template HTML (modificabile dal designer) vive in exportTemplate.html accanto a questa
// funzione: Netlify copia nel pacchetto tutti i file della cartella della funzione.
const EXPORT_TEMPLATE = (() => {
  try {
    return readFileSync(new URL("./exportTemplate.html", import.meta.url), "utf8");
  } catch (err) {
    console.error("Template export non trovato:", err.message);
    return "";
  }
})();

export async function handler(event) {
  if (event.httpMethod !== "GET") return json(405, { error: "Metodo non supportato" });

  let sql;
  try {
    sql = neon();
  } catch (err) {
    return json(500, { error: `Database non collegato al sito: ${err.message}` });
  }

  const tripId = tripIdFromEvent(event);
  if (!tripId) return htmlDoc(404, NOT_FOUND_HTML);

  try {
    const rows = await sql`
      SELECT value FROM kv_store
      WHERE key = ${`trip:${tripId}`}
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    if (!rows.length) return htmlDoc(404, NOT_FOUND_HTML);

    const data = JSON.parse(rows[0].value);
    if (!EXPORT_TEMPLATE) return json(500, { error: "Template export non trovato" });

    const parts = buildParts({
      tripTitle: data.tripTitle || "Il mio viaggio",
      days: data.days || {},
      extras: data.extras || [],
      coverImageUrl: data.coverImageUrl || "",
    });
    const html = renderExportTemplate(EXPORT_TEMPLATE, parts);
    return htmlDoc(200, html);
  } catch (err) {
    console.error(err);
    return json(500, { error: err.message });
  }
}