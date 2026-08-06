// Funzione serverless: proxy verso l'API di ricerca foto di Unsplash.
//
// Perché una funzione e non una chiamata diretta dal frontend? La chiave API di Unsplash
// (UNSPLASH_ACCESS_KEY) deve restare segreta lato server — esporla nel codice React la
// renderebbe visibile a chiunque apra gli strumenti sviluppatore del browser.
//
// Endpoint: /.netlify/functions/unsplash
//   GET ?q=<query>                 -> { results: [{ id, thumb, full, description, authorName, authorLink, downloadLocation }] }
//   GET ?download=<downloadLocationUrl>  -> ping di conteggio richiesto dalle linee guida Unsplash
//                                            quando una foto viene effettivamente scelta/usata
//
// Serve la variabile d'ambiente UNSPLASH_ACCESS_KEY (Site configuration → Environment variables),
// ottenibile creando un'app gratuita su https://unsplash.com/developers

const UNSPLASH_API = "https://api.unsplash.com";

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return json(500, { error: "UNSPLASH_ACCESS_KEY non configurata sul sito Netlify" });
  }

  const params = event.queryStringParameters || {};

  // Ping di "download" richiesto dalle linee guida Unsplash quando una foto viene selezionata.
  // Viene chiamato dal frontend dopo che l'utente sceglie una foto (fire-and-forget).
  if (params.download) {
    try {
      await fetch(decodeURIComponent(params.download), {
        headers: { Authorization: `Client-ID ${accessKey}` },
      });
      return json(200, { ok: true });
    } catch (err) {
      return json(500, { error: err.message });
    }
  }

  const q = (params.q || "").trim();
  if (!q) {
    return json(400, { error: "Parametro 'q' mancante" });
  }

  try {
    const res = await fetch(
      `${UNSPLASH_API}/search/photos?query=${encodeURIComponent(q)}&per_page=15&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${accessKey}` } }
    );

    if (!res.ok) {
      const text = await res.text();
      return json(res.status, { error: `Errore dall'API Unsplash: ${text}` });
    }

    const data = await res.json();
    const results = (data.results || []).map((p) => ({
      id: p.id,
      thumb: p.urls?.small,
      full: p.urls?.regular,
      description: p.alt_description || p.description || "",
      authorName: p.user?.name || "",
      authorLink: p.user?.links?.html || "",
      downloadLocation: p.links?.download_location || "",
    }));

    return json(200, { results });
  } catch (err) {
    return json(500, { error: err.message });
  }
}
