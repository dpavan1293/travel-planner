// Funzione serverless: proxy verso il geocoding di OpenStreetMap (Nominatim).
//
// Perché una funzione e non una chiamata diretta dal frontend? Nominatim richiede
// un User-Agent identificativo per ogni richiesta (policy di utilizzo) e applica
// limiti di frequenza: passando da qui teniamo le chiamate sotto controllo e il
// risultato è lo stesso per tutti gli utenti, senza rischiare blocchi per CORS.
//
// Endpoint: /.netlify/functions/geocode
//   GET ?q=<testo>  -> { results: [{ name, short, lat, lon }] }
//
// Le coordinate NON vengono cercate qui al salvataggio: vengono recuperate solo
// quando l'utente seleziona un risultato e poi salvate nel JSON del viaggio.

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  if (event.httpMethod !== "GET") return json(405, { error: "Metodo non supportato" });

  const q = ((event.queryStringParameters || {}).q || "").trim();
  if (!q) return json(400, { error: "Parametro 'q' mancante" });
  if (q.length > 120) return json(400, { error: "Ricerca troppo lunga" });

  try {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("q", q);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "8");
    url.searchParams.set("addressdetails", "0");
    url.searchParams.set("accept-language", "it");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "TucanoPlanner/1.0 (travel-planner web app)",
        "Accept-Language": "it",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return json(res.status, { error: `Errore dal geocoding: ${text}` });
    }

    const data = await res.json();
    const results = (data || []).map((r) => ({
      name: r.display_name || "",
      short: r.name || r.display_name || "",
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
    }));

    return json(200, { results });
  } catch (err) {
    return json(500, { error: err.message });
  }
}