// Sostituisce l'API window.storage (disponibile solo dentro Claude) con localStorage del browser.
// Stessa forma dei risultati: { key, value, shared } | null — così il resto del codice non cambia.

const PREFIX = "travel-planner:";

const storage = {
  async get(key) {
    try {
      const value = localStorage.getItem(PREFIX + key);
      if (value === null) return null;
      return { key, value, shared: false };
    } catch (e) {
      return null;
    }
  },

  async set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, value);
      return { key, value, shared: false };
    } catch (e) {
      return null;
    }
  },

  async delete(key) {
    try {
      localStorage.removeItem(PREFIX + key);
      return { key, deleted: true, shared: false };
    } catch (e) {
      return null;
    }
  },

  async list(prefix = "") {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX)) {
          const bare = k.slice(PREFIX.length);
          if (bare.startsWith(prefix)) keys.push(bare);
        }
      }
      return { keys, prefix, shared: false };
    } catch (e) {
      return null;
    }
  },
};

export default storage;
