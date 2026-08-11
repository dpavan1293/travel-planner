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

import netlifyIdentity from "netlify-identity-widget";

const FN_URL = "/.netlify/functions/storage";

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

export async function authHeaders(extra = {}) {
  const user = netlifyIdentity.currentUser();
  if (!user) throw new Error("Utente non autenticato");
  const token = await user.jwt();
  return { Authorization: `Bearer ${token}`, ...extra };
}

const storage = {
  async get(key) {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${FN_URL}?key=${encodeURIComponent(key)}`, { headers });
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
      const headers = await authHeaders({ "Content-Type": "application/json" });
      const res = await fetch(FN_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ key, value }),
      });
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
      const headers = await authHeaders();
      const res = await fetch(`${FN_URL}?key=${encodeURIComponent(key)}`, {
        method: "DELETE",
        headers,
      });
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
      const headers = await authHeaders();
      const res = await fetch(`${FN_URL}?list=1&prefix=${encodeURIComponent(prefix)}`, { headers });
      if (res.status === 401) { notifyError(401, "list"); return null; }
      if (!res.ok) { notifyError(res.status, "list"); return null; }
      return await res.json();
    } catch (e) {
      notifyError(0, "list");
      return null;
    }
  },
};

export default storage;
