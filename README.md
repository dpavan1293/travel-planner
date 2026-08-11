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
3. **Il database Netlify** (Postgres) è collegato nativamente al sito — non serve installare nessun pacchetto per provisionarlo, va semplicemente collegato una volta dalla dashboard (sezione "Database"). La tabella `kv_store` viene creata dalla migrazione in `netlify/database/migrations/0001_create_kv_store.sql`
4. **Ricerca foto (opzionale)**: per usare "Cerca foto" sull'immagine di copertina, serve una chiave gratuita Unsplash:
   - Crea un'app su [unsplash.com/developers](https://unsplash.com/developers) (piano gratuito, basta un account)
   - Copia la "Access Key"
   - Su Netlify: Site configuration → Environment variables → aggiungi `UNSPLASH_ACCESS_KEY` con quel valore
   - Senza questa variabile, il pulsante "Cerca foto" mostra un errore, ma il resto dell'app funziona normalmente (si può sempre incollare un URL manualmente)
5. **Deploy** → l'app è online, pronta per il login

## Build di produzione

```bash
npm run build
```

## Struttura del backend

- `src/storage.js` — client frontend, sostituisce l'interfaccia `window.storage` (usata all'origine dentro Claude) con chiamate autenticate alla funzione serverless. Notifica anche gli errori (sessione scaduta, salvataggio fallito) a chi si iscrive con `onStorageError()` — usato da `App.jsx` per mostrare il banner di avviso in cima all'app
- `netlify/functions/storage.js` — funzione serverless che legge/scrive su Netlify Database, verificando che ogni richiesta provenga da un utente autenticato (tramite `context.clientContext.user`, popolato automaticamente da Netlify Identity)
- `netlify/functions/unsplash.js` — funzione serverless che fa da proxy verso l'API di ricerca foto di Unsplash, tenendo la chiave API segreta lato server (usata dal componente `UnsplashPicker` in `src/App.jsx`)
- `netlify/functions/share.js` — funzione serverless per la condivisione di un viaggio come copia modificabile: chi genera il link (proprietario) e chi lo importa (destinatario) devono entrambi essere autenticati; il destinatario riceve una copia indipendente sul proprio account, l'originale non viene toccato
- `netlify/database/migrations/0001_create_kv_store.sql` — schema della tabella principale: una riga per ogni coppia chiave/valore, isolata per `user_id`
- `netlify/database/migrations/0002_create_trip_shares.sql` — tabella dei link di condivisione (token → viaggio + proprietario)

## Nota

Questa integrazione segue i pattern ufficiali documentati da Netlify (Identity + Functions + Database), ma non è stata testata contro un ambiente Netlify live in fase di sviluppo di questo progetto — solo la build del frontend è stata verificata. Al primo deploy vale la pena controllare i log della funzione (Netlify dashboard → Functions → storage) nel caso qualcosa non torni, ad esempio nomi di variabili d'ambiente cambiati nel frattempo lato Netlify.

## Deploy online

Netlify (Add new site → Import from GitHub). Build command: `npm run build`, publish directory: `dist` — già impostati in `netlify.toml`. Ogni push su `main` ripubblica automaticamente.
