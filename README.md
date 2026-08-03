# Travel Planner

App per pianificare viaggi giorno per giorno, con calendario reale, categorie personalizzabili, schede extra (volo, sicurezza, vaccinazioni, cosa portare, costi, note) ed export dell'itinerario in un documento HTML pronto da inviare o stampare in PDF.

I dati sono sincronizzati in cloud tramite **Netlify Identity** (login) + **Netlify Database** (Postgres gestito da Netlify): puoi accedere ai tuoi viaggi da qualsiasi dispositivo, basta fare login con lo stesso account.

## Sviluppo locale

```bash
npm install
npx netlify-cli dev
```

> Usa `netlify dev` (non `npm run dev`/`vite` da solo) perché serve anche a far girare la funzione serverless e il database locale che imitano l'ambiente di produzione. Se non hai ancora installato la CLI: `npm install -g netlify-cli`.

Al primo avvio la CLI ti chiederà di collegare il progetto al tuo account Netlify (`netlify link` o `netlify init`).

## Setup iniziale su Netlify (una tantum)

1. **Crea il sito** collegando questo repository GitHub a Netlify (Add new site → Import from GitHub)
2. **Attiva Netlify Identity**: nella dashboard del sito → Site configuration → Identity → Enable Identity
   - In "Registration preferences" scegli se aprire la registrazione a chiunque o solo su invito (consigliato: "Invite only" se l'app è solo per te/la tua famiglia)
3. **Il database si crea da solo**: essendo `@netlify/database` tra le dipendenze del progetto, Netlify provisiona automaticamente un database Postgres al primo deploy e applica la migrazione in `netlify/database/migrations/0001_create_kv_store.sql` (crea la tabella `kv_store` che contiene tutti i dati dei viaggi, isolati per utente)
4. **Deploy** → l'app è online, pronta per il login

## Build di produzione

```bash
npm run build
```

## Struttura del backend

- `src/storage.js` — client frontend, sostituisce l'interfaccia `window.storage` (usata all'origine dentro Claude) con chiamate autenticate alla funzione serverless
- `netlify/functions/storage.js` — funzione serverless che legge/scrive su Netlify Database, verificando che ogni richiesta provenga da un utente autenticato (tramite `context.clientContext.user`, popolato automaticamente da Netlify Identity)
- `netlify/database/migrations/0001_create_kv_store.sql` — schema della tabella: una riga per ogni coppia chiave/valore, isolata per `user_id`

## Nota

Questa integrazione segue i pattern ufficiali documentati da Netlify (Identity + Functions + Database), ma non è stata testata contro un ambiente Netlify live in fase di sviluppo di questo progetto — solo la build del frontend è stata verificata. Al primo deploy vale la pena controllare i log della funzione (Netlify dashboard → Functions → storage) nel caso qualcosa non torni, ad esempio nomi di variabili d'ambiente cambiati nel frattempo lato Netlify.

## Deploy online

Netlify (Add new site → Import from GitHub). Build command: `npm run build`, publish directory: `dist` — già impostati in `netlify.toml`. Ogni push su `main` ripubblica automaticamente.
