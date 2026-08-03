# Travel Planner

App per pianificare viaggi giorno per giorno, con calendario reale, categorie personalizzabili, schede extra (volo, sicurezza, vaccinazioni, cosa portare, costi, note) ed export dell'itinerario in un documento HTML pronto da inviare o stampare in PDF.

## Sviluppo locale

```bash
npm install
npm run dev
```

Apri l'indirizzo mostrato in terminale (di solito `http://localhost:5173`).

## Build di produzione

```bash
npm run build
```

I file pronti per il deploy vengono generati in `dist/`.

## Dati e salvataggio

I viaggi vengono salvati nel `localStorage` del browser (vedi `src/storage.js`). Questo significa:

- I dati restano solo su quel browser/dispositivo — non sono condivisi tra dispositivi diversi.
- Cancellare i dati di navigazione del browser cancella anche i viaggi salvati.
- Non serve alcun account o backend per usare l'app.

Se in futuro vorrai sincronizzare i viaggi tra più dispositivi, andrà sostituito `src/storage.js` con un client verso un backend/database (es. Supabase, Firebase).

## Deploy online

Il modo più semplice: pubblica questo repository su GitHub, poi collegalo a [Vercel](https://vercel.com) o [Netlify](https://netlify.com) (build command: `npm run build`, output directory: `dist`). Ogni push aggiorna automaticamente il sito pubblicato.
