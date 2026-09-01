// Sostituisce l'API window.storage (disponibile solo dentro Claude) con chiamate
// alla funzione serverless Netlify `/.netlify/functions/storage`, che legge/scrive
// su Netlify Database (Postgres) scoping i dati per utente autenticato.
//
// Stessa forma dei risultati dell'originale: { key, value, shared } | null —
// così il resto del codice dell'app (App.jsx) non deve cambiare.
//
// In più: gli errori (sessione scaduta, salvataggio fallito, rete assente) non vengono
// più ignorati silenziosamente. Chi vuole reagire (App.jsx, per mostrare un avviso)
// può iscriversi con onStorageError().
//
// Gestione del 401: prima di segnalare l'errore si forza il rinnovo del token e si
// riprova una volta (cura i casi di token scaduto/non ancora rinnovato). Se anche il
// token appena rinnovato viene rifiutato la sessione è irrecuperabile: viene fatto
// il logout così l'app torna pulita alla schermata di accesso.

import netlifyIdentity from "netlify-identity-widget";

const FN_URL = "/.netlify/functions/storage";
const PUBLIC_FN_URL = "/.netlify/functions/public-itineraries";

const errorListeners = new Set();

// Registra un callback chiamato ad ogni errore di storage: { status, context }.
// status: 401 = sessione scaduta / non autenticato, 0 = rete assente o errore imprevisto,
// altrimenti il codice HTTP restituito dalla funzione (es. 500).
// Ritorna una funzione per annullare l'iscrizione.
export function onStorageError(cb) {
  errorListeners.add(cb);
  return () => errorListeners.delete(cb);
}

function notifyError(status, context) {
  errorListeners.forEach((cb) => {
    try {
      cb({ status, context });
    } catch (e) {
      // un listener che esplode non deve rompere il resto
    }
  });
}

async function accessToken(force = false) {
  const user = netlifyIdentity.currentUser();
  if (!user) return null;
  try {
    return await user.jwt(force);
  } catch (e) {
    return null;
  }
}

export async function authHeaders(extra = {}) {
  const token = await accessToken();
  if (!token) throw new Error("Utente non autenticato");
  return { Authorization: `Bearer ${token}`, ...extra };
}

// Se la sessione lato client è corrotta (token rifiutato anche dopo il rinnovo)
// il logout ripristina uno stato coerente: widget, localStorage e cookie nf_jwt
// vengono puliti e l'app torna alla schermata di login.
function discardBrokenSession() {
  if (netlifyIdentity.currentUser()) netlifyIdentity.logout();
}

async function authedFetch(url, options = {}) {
  const doFetch = (t) =>
    fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${t}` },
    });

  let token = await accessToken();
  if (!token) {
    discardBrokenSession();
    return null;
  }

  let res = await doFetch(token);

  if (res.status === 401) {
    token = await accessToken(true);
    if (!token) {
      discardBrokenSession();
      return null;
    }
    res = await doFetch(token);
  }

  return res;
}

const storage = {
  async get(key) {
    try {
      const res = await authedFetch(`${FN_URL}?key=${encodeURIComponent(key)}`);
      if (!res) { notifyError(401, "get"); return null; }
      if (res.status === 404) return null;
      if (res.status === 401) { notifyError(401, "get"); return null; }
      if (!res.ok) { notifyError(res.status, "get"); return null; }
      return await res.json();
    } catch (e) {
      notifyError(0, "get");
      return null;
    }
  },

  async set(key, value) {
    try {
      const res = await authedFetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res) { notifyError(401, "set"); return null; }
      if (res.status === 401) { notifyError(401, "set"); return null; }
      if (!res.ok) { notifyError(res.status, "set"); return null; }
      return await res.json();
    } catch (e) {
      notifyError(0, "set");
      return null;
    }
  },

  async delete(key) {
    try {
      const res = await authedFetch(`${FN_URL}?key=${encodeURIComponent(key)}`, {
        method: "DELETE",
      });
      if (!res) { notifyError(401, "delete"); return null; }
      if (res.status === 401) { notifyError(401, "delete"); return null; }
      if (!res.ok) { notifyError(res.status, "delete"); return null; }
      return await res.json();
    } catch (e) {
      notifyError(0, "delete");
      return null;
    }
  },

  async list(prefix = "") {
    try {
      const res = await authedFetch(`${FN_URL}?list=1&prefix=${encodeURIComponent(prefix)}`);
      if (!res) { notifyError(401, "list"); return null; }
      if (res.status === 401) { notifyError(401, "list"); return null; }
      if (!res.ok) { notifyError(res.status, "list"); return null; }
      return await res.json();
    } catch (e) {
      notifyError(0, "list");
      return null;
    }
  },

  async getPublicItineraries() {
    const res = await authedFetch(PUBLIC_FN_URL);
    if (!res) throw new Error("Sessione scaduta. Accedi di nuovo.");
    if (!res.ok) throw new Error(`Errore del server (${res.status})`);
    const json = await res.json();
    return { itineraries: json.itineraries || [] };
  },

  async savePublicItinerary(id, data) {
    const res = await authedFetch(PUBLIC_FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, data }),
    });
    if (!res) throw new Error("Sessione scaduta. Accedi di nuovo.");
    if (!res.ok) throw new Error(`Errore nel salvataggio (${res.status})`);
    return await res.json();
  },

  async deletePublicItinerary(id) {
    const res = await authedFetch(`${PUBLIC_FN_URL}?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res) throw new Error("Sessione scaduta. Accedi di nuovo.");
    if (!res.ok) throw new Error(`Errore nella cancellazione (${res.status})`);
    return { id, deleted: true };
  },
};

export default storage;
