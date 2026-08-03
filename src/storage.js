// Sostituisce l'API window.storage (disponibile solo dentro Claude) con chiamate
// alla funzione serverless Netlify `/.netlify/functions/storage`, che legge/scrive
// su Netlify Database (Postgres) scoping i dati per utente autenticato.
//
// Stessa forma dei risultati dell'originale: { key, value, shared } | null —
// così il resto del codice dell'app (App.jsx) non deve cambiare.

import netlifyIdentity from "netlify-identity-widget";

const FN_URL = "/.netlify/functions/storage";

async function authHeaders(extra = {}) {
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
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
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
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
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
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async list(prefix = "") {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${FN_URL}?list=1&prefix=${encodeURIComponent(prefix)}`, { headers });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  },
};

export default storage;
