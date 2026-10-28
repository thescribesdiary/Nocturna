# Nocturna

La tua app personale per scuola, lavoro, lettura e scrittura. Funziona su computer e telefono, si sincronizza tra i dispositivi, funziona offline e si installa come un'app. Costa zero: usa solo i piani gratuiti di Firebase e GitHub, e non devi installare niente sul computer.

> **Contenuto:** accesso con Google; Home con calendario di tutte le aree e pannello Oggi/Domani; Scuola (bacheca, calendario con orario, materie, orario settimanale, voti, sessioni di studio collegate); Lavoro (panoramica, bacheca, calendario, progetti, appunti e verbali, blocchi e richieste); The Scribe's Diary (panoramica, libri e collaborazioni con copertina, piano editoriale, attività, calendario); Mabel Altheanne Nyctalis (attività, progetti, Attività della corte, calendario); colonne personalizzabili; attività ricorrenti; ricerca e filtri; cestino; Profilo e Impostazioni con backup e ripristino; riepilogo all'apertura; notifiche push anche ad app chiusa.

---

## Novità della versione 2

- **Scrittura:** la pagina iniziale (*Panoramica*) mostra i progetti con le loro copertine e, di lato, le attività scadute e quelle dei prossimi 7 giorni (su telefono il pannello sta in alto, comprimibile). Ogni progetto ha il campo copertina. Nell'elenco *Progetti* c'è un solo pulsante «Nuovo progetto».
- **Ispirazione (Scrittura):** nuova scheda per salvare foto (compresse a circa 1200 px, nel database, senza costi) e link a fonti esterne con titolo, etichetta e nota. PDF e documenti pesanti: caricali su Google Drive e incolla il link.
- **The Scribe's Diary:** viste dei libri *Schede, Copertine, Elenco, Delegati* (per delegato e «sola segnalazione»); le scadenze di lettura arrivano come notifica (3 giorni prima e il giorno stesso, alle 9:00) e compaiono nel riepilogo all'apertura.
- **Ovunque:** ricerca unica dalla Home (pulsante «Cerca ovunque» o Ctrl/Cmd + K); «Annulla» dopo ogni eliminazione; avviso se elimini un progetto, un libro o una materia con elementi collegati; date rapide (Oggi, Domani, +1 settimana); duplicazione delle attività; trascinamento delle attività su un altro giorno nel calendario (computer); ultima scheda e filtri di ogni sezione ricordati.
- **Ricorrenze:** «fino al», «nei giorni» (es. lunedì e giovedì) e «Salta questa volta» nel dettaglio.
- **Scuola:** media dei voti nella scheda della materia.
- **Impostazioni (spente di base):** lezioni dell'orario nel calendario della Home; svuotamento automatico del cestino dopo 30 giorni. Il riepilogo all'apertura ricorda il backup se l'ultimo ha più di 30 giorni.
- **Ornamenti goth:** fregi con croce e ali di pipistrello sotto i titoli, angoli e archi traforati nei moduli, nel riepilogo e nell'accesso, rosone a sole nero negli stati vuoti; cremisi di notte, rosso sangue sul tema chiaro. Corretti anche i campi data/ora e i menu a tendina nel tema chiaro e l'avviso che copriva il pulsante + sul telefono.

Per aggiornare un'installazione già pubblicata basta sostituire i file nel repository GitHub: le regole di sicurezza e i secret non cambiano.

---

## Configurazione (una volta sola, circa 30 minuti)

Ti servono un browser e l'account Google che userai per Nocturna. Va bene anche solo il telefono.

Sul telefono, le console di Firebase e Google Cloud funzionano meglio in versione desktop:
- **Chrome:** menu **⋮** → **Sito desktop**.
- **Safari:** **aA** → **Richiedi sito desktop**.

Segui i passi nell'ordine.

### 1. Crea il progetto Firebase

1. Apri <https://console.firebase.google.com> ed entra con il tuo account Google.
2. Clicca **Crea un progetto** (o **Aggiungi progetto**).
3. Come nome scrivi `nocturna`. Firebase aggiunge da solo un codice finale, per esempio `nocturna-a1b2c`. Questo è l'**ID progetto**: annotalo.
4. Quando chiede di **Google Analytics**, disattivalo. Non serve.
5. Clicca **Crea progetto** e aspetta che finisca.

### 2. Registra l'app web e copia la configurazione

1. Nella pagina del progetto clicca l'icona **`</>`** (Web).
2. Come nickname scrivi `Nocturna`. Lascia **non selezionata** la casella su Firebase Hosting.
3. Clicca **Registra app**.
4. Compare un blocco di codice con `const firebaseConfig = { ... }`. Copialo, per esempio in una nota: ti serve al passo 6. Lo ritrovi sempre in **Impostazioni progetto → Generali → Le tue app**.

### 3. Attiva l'accesso con Google

1. Nel menu a sinistra: **Build → Authentication → Inizia**.
2. Nella scheda **Metodo di accesso**, scegli **Google**.
3. Attiva l'interruttore, scegli la tua email come «email di assistenza» e clicca **Salva**.

### 4. Crea il database

1. Nel menu a sinistra: **Build → Firestore Database → Crea database**.
2. Lascia l'ID del database com'è: `(default)`.
3. Come posizione scegli **eur3 (Europe)**. Non si può cambiare in seguito.
4. Scegli **Avvia in modalità di produzione** e clicca **Crea**. Le regole di sicurezza giuste le pubblicherà GitHub al passo 8.

### 5. Prepara Hosting e la chiave per GitHub

**Hosting**

1. Nel menu a sinistra: **Build → Hosting → Inizia**.
2. Clicca **Avanti** su tutte le schermate fino a **Continua alla console**. I comandi che mostra non ti servono: se ne occupa GitHub.

**Chiave privata**

1. Clicca l'ingranaggio in alto a sinistra: **Impostazioni progetto → Account di servizio**.
2. Clicca **Genera nuova chiave privata** e conferma. Si scarica un file `.json`.
3. Conservalo bene e non condividerlo con nessuno: è la chiave che permette a GitHub di pubblicare l'app.

**Permessi della chiave**

1. Apri <https://console.cloud.google.com/iam-admin/iam> e in alto seleziona il tuo progetto `nocturna-…`.
2. Trova la riga con l'indirizzo che inizia per `firebase-adminsdk-`.
3. Clicca la **matita** a destra, poi **Aggiungi un altro ruolo**.
4. Cerca e scegli **Amministratore Firebase** (in inglese *Firebase Admin*) e clicca **Salva**.

### 6. Crea il repository GitHub e aggiungi i Secrets

1. Crea un account gratuito su <https://github.com> se non lo hai.
2. In alto a destra tocca **+ → New repository**.
3. Come nome scrivi `nocturna`, scegli **Public**, attiva **Add a README file** e tocca **Create repository**.

   Pubblico vuol dire che il codice è visibile, ma i tuoi dati e la tua email no. Così GitHub offre minuti illimitati, che serviranno per le notifiche.
4. Nel repository vai su **Settings → Secrets and variables → Actions → New repository secret** e crea questi tre secret:

| Nome | Valore |
| --- | --- |
| `FIREBASE_CONFIG` | Il blocco `firebaseConfig` del passo 2. Va bene anche incollarlo tutto, da `const firebaseConfig = {` fino a `};`. |
| `FIREBASE_SERVICE_ACCOUNT` | Tutto il contenuto del file `.json` del passo 5. Vedi sotto come copiarlo. |
| `ALLOWED_EMAIL` | L'indirizzo Google che userai per entrare in Nocturna. Puoi metterne anche due (o più) separati da una virgola, per esempio `primo@gmail.com, secondo@gmail.com`: tutti gli account vedono e modificano gli stessi dati. Nessun altro account potrà accedere. |

**Come copiare il contenuto del file `.json`**

- **Computer:** aprilo con il Blocco note o TextEdit, seleziona tutto e copia.
- **Android:** aprilo dall'app *File* (o *Download*) con un visualizzatore di testo, seleziona tutto e copia.
- **iPhone:** aprilo dall'app *File*: si vede il testo. Tieni premuto, scegli **Seleziona tutto** e poi **Copia**.

Il contenuto deve iniziare con `{` e finire con `}`. Dopo averlo incollato nel secret, elimina il file dal dispositivo.

### 7. Crea il file che pubblica l'app

Servono due file, da creare una volta sola. Per ciascuno:

1. Nella pagina principale del repository tocca **Add file → Create new file**.
2. Come nome scrivi esattamente il percorso indicato sotto. Le barre `/` creano da sole le cartelle.
3. Incolla il contenuto del file corrispondente, che ti ho dato in chat. Dopo il primo caricamento ne trovi una copia anche nel repository, nella cartella `setup/`.
4. Tocca **Commit changes** e conferma.

| Percorso | Contenuto | A cosa serve |
| --- | --- | --- |
| `.github/workflows/deploy.yml` | `setup/deploy.yml` | Pubblica l'app, solo dal branch `main`. |
| `.github/workflows/aggiorna-da-zip.yml` | `setup/aggiorna-da-zip.yml` | Estrae lo zip in un branch separato e apre una Pull Request da controllare. Non pubblica nulla. |

Se Nocturna è già installata con il vecchio `deploy.yml`, **sostituisci prima `deploy.yml`** e solo dopo crea `aggiorna-da-zip.yml`: finché resta il vecchio file, uno zip caricato su `main` viene pubblicato senza controllo.

Poi in **Settings → Actions → General**, in fondo alla pagina, attiva **Allow GitHub Actions to create and approve pull requests** e tocca **Save**. Se non lo attivi, l'aggiornamento funziona lo stesso ma la Pull Request la apri tu dal link che trovi nel riepilogo dell'esecuzione.

### 8. Carica lo zip

1. Nella pagina principale del repository tocca **Add file → Upload files**.
2. Scegli lo zip di Nocturna (per esempio `nocturna-v1.zip`) **così com’è**, senza estrarlo.
3. Tocca **Commit changes**. Se GitHub ti chiede di creare un nuovo branch e una Pull Request, va bene: accetta.
4. Apri la scheda **Actions**: vedrai «Prepara aggiornamento da zip» in esecuzione. GitHub controlla lo zip (rifiuta collegamenti, percorsi sospetti e file troppo grandi), lo prova a compilare **senza** usare i secret e apre una Pull Request.
5. Apri la scheda **Pull requests**, entra nella Pull Request «Aggiornamento di Nocturna da …» e guarda **Files changed**. Se le modifiche sono quelle attese, tocca **Merge pull request** e conferma.
6. Solo ora parte «Pubblica Nocturna». Dopo 3–4 minuti deve comparire un segno di spunta verde.

### 9. Apri Nocturna

Vai su **https://ID-PROGETTO.firebaseapp.com** (per esempio `https://nocturna-a1b2c.firebaseapp.com`) e clicca **Accedi con Google**.

L'indirizzo `…web.app` funziona lo stesso: ti porta automaticamente a `…firebaseapp.com`, dove l'accesso con Google è più affidabile.

---

## Notifiche push (circa 10 minuti, anche dal telefono)

Dopo il primo avvio riuscito puoi attivare i promemoria. Arrivano 15 minuti prima delle attività con orario e, per il piano editoriale, alle 9:00 del giorno scelto nel campo «Promemoria».

### A. Genera la chiave per le notifiche

1. Nella console di Firebase apri **Impostazioni progetto → Cloud Messaging**.
2. In fondo, in **Certificati push web**, tocca **Genera coppia di chiavi**.
3. Copia la chiave che compare: è una lunga stringa che inizia di solito con `B`.

### B. Aggiungi la chiave alla configurazione

1. Su GitHub apri **Settings → Secrets and variables → Actions**.
2. Tocca la matita accanto a `FIREBASE_CONFIG`. Il contenuto attuale non si vede: va reincollato tutto.
3. Incolla di nuovo il blocco `firebaseConfig` e aggiungi in fondo una riga con la chiave, così:

```
const firebaseConfig = { …come prima… };
vapidKey: "LA-CHIAVE-COPIATA"
```

4. Tocca **Update secret**.

### C. Crea il file dei promemoria

1. Nel repository apri il file `setup/reminders.yml` e copia tutto il suo contenuto. C'è un pulsante di copia in alto a destra del file.
2. Torna alla pagina principale e tocca **Add file → Create new file**.
3. Come nome scrivi `.github/workflows/reminders.yml`, incolla il testo e tocca **Commit changes**.

### D. Ripubblica e attiva le notifiche

1. In **Actions**, apri **Pubblica Nocturna** e tocca **Run workflow**. Aspetta la spunta verde.
2. Apri Nocturna, vai in **Impostazioni → Notifiche e riepilogo → Attiva notifiche** e consenti le notifiche.
3. Ripeti il punto 2 su ogni dispositivo su cui vuoi riceverle. Su iPhone prima installa l'app sulla schermata Home e aprila da lì.
4. Con **Invia una prova** controlli che il dispositivo le mostri.

Il controllo dei promemoria gira su GitHub ogni 15 minuti; lo vedi in **Actions → Promemoria Nocturna**. GitHub può ritardare queste esecuzioni di qualche minuto, per questo lo script invia anche i promemoria dei 20 minuti successivi: nel caso peggiore un avviso arriva un po' prima o un po' dopo, ma arriva.

GitHub sospende le esecuzioni programmate dei repository fermi da 60 giorni. Il workflow dei promemoria lo evita da solo con un piccolo aggiornamento ogni 45 giorni.

---

## Installare l'app

- **Android (Chrome):** apri l'indirizzo, tocca il menu **⋮** e poi **Installa app** (o **Aggiungi a schermata Home**).
- **iPhone (Safari):** apri l'indirizzo, tocca **Condividi** e poi **Aggiungi alla schermata Home**. Le notifiche, quando arriveranno, funzioneranno solo dall'app installata così.
- **Computer (Chrome o Edge):** clicca l'icona di installazione a destra nella barra degli indirizzi.

Dopo la prima apertura l'app funziona anche offline. Le modifiche si sincronizzano appena torna la connessione: l'indicatore nella barra laterale (o la nuvola in alto su telefono) mostra **In sincronia**, **Modifiche in attesa** oppure **Offline**.

---

## Aggiornare l'app

Per ogni nuova fase riceverai uno zip aggiornato.

1. Caricalo su GitHub come al passo 8, anche dal telefono.
2. GitHub lo estrae in un branch separato e apre una Pull Request: nulla viene pubblicato finché non la controlli e fai il merge.
3. Dopo il merge GitHub ripubblica da solo e, al successivo avvio, l'app sui dispositivi si aggiorna in automatico.

Lo zip non può modificare la cartella `.github`: se una fase cambia uno dei workflow, te lo dirò e andrà aggiornato a mano come al passo 7. I file dello zip si aggiungono o sostituiscono quelli esistenti, ma non cancellano i file che non contiene.

## Se qualcosa non va

- **Spunta rossa in Actions.** Apri l'esecuzione e leggi l'errore. Se riguarda la configurazione o un secret mancante, il messaggio dice in italiano cosa correggere. Dopo aver corretto, clicca **Re-run jobs**.
- **Errore che parla di permessi** (*permission*, *403*). Ricontrolla il ruolo **Amministratore Firebase** del passo 5.
- **Errore che dice che un'API non è attiva** (*API has not been used* o *is disabled*). Apri il link contenuto nell'errore, clicca **Abilita**, aspetta un paio di minuti e poi **Re-run jobs**.
- **Errore su `FIREBASE_CONFIG`.** Ricopia il blocco `firebaseConfig` per intero nel secret.
- **Le notifiche non arrivano.** Controlla in **Actions → Promemoria Nocturna** che le esecuzioni siano verdi e che il dispositivo risulti attivo in Impostazioni. Se l'errore parla di *Cloud Messaging* o *FCM*, apri il link contenuto nell'errore e abilita l'API.
- **«Account non autorizzato» all'accesso.** Hai scelto un account Google che non è scritto nel secret `ALLOWED_EMAIL`. Per aggiungerne uno: GitHub → Settings → Secrets and variables → Actions → `ALLOWED_EMAIL` → Update, scrivi gli indirizzi separati da virgola e poi rilancia la pubblicazione da Actions.

---

## Come sono organizzati i dati

Tutti i dati stanno in un unico database Firestore, in `users/{tuo-id}/{sezione}/{documento}`:

- `scuola`: attività, materie e lezioni dell'orario.
- `lavoro`: attività, progetti e note.
- `lettura`: libri e attività.
- `scrittura`: progetti e attività.
- `impostazioni`: preferenze, profilo e colonne delle bacheche.
- `dispositivi`: i telefoni e i computer abilitati alle notifiche.

Le regole di sicurezza permettono di leggere e scrivere i dati solo agli account indicati in `ALLOWED_EMAIL`. I dati stanno in uno spazio condiviso (`users/condiviso`): dalla versione 2.1, al primo accesso di ogni account i dati che aveva nelle versioni precedenti vengono copiati lì una volta sola, senza cancellare l'originale. Gli elementi eliminati restano nel Cestino finché non li elimini definitivamente.

Campi facoltativi aggiunti alle attività (i record precedenti che non li hanno continuano a funzionare e il backup li conserva):

- `estimate` (Lettura e Scrittura, come già in Scuola e Lavoro): tempo stimato in testo libero, per esempio «1 h 30». Il pannello «La giornata» somma solo i valori che riesce a leggere («2 h», «45 min», «1h30», «1:15») e ignora gli altri.
- `contentFormat` e `platforms` (Scrittura, solo per promozione e pubblicazione): formato del contenuto (post, reel, storia Instagram, citazione, estratto, teaser, annuncio, countdown, cover reveal, unboxing…) e piattaforme.
- `seriesId` e `repeatDay` (attività ricorrenti): serie a cui appartiene l'occorrenza e giorno originale delle ricorrenze mensili.

### Importare più libri da CSV

In Lettura → Libri e collaborazioni → **Importa da CSV**. Il pulsante **Scarica il modello** fornisce un file con le colonne accettate, che sono le stesse del modulo «Aggiungi libro». Sono obbligatori Titolo, Autore, Editore e Formato. Prima di salvare puoi rivedere ogni riga: quelle non valide sono spiegate e non vengono importate, i possibili duplicati (stesso titolo e autore di un libro esistente, anche nel cestino, o ripetuti nel file) vengono saltati, a meno che tu non scelga di importarli come libri separati. Un libro esistente non viene mai modificato. Le colonne sconosciute o non importabili (per esempio la copertina) vengono segnalate.

## Per chi sviluppa

```bash
npm install
npm run dev          # poi apri http://localhost:5173/?demo per provare l'interfaccia con dati d'esempio, senza Firebase
npm run build
```

### Controlli e test

Servono Node.js 22 (22.6 o successivo) e, solo per i test delle regole, Java 21 o successivo. Nessun comando qui sotto usa il progetto Firebase reale o i suoi dati.

```bash
npm ci                                   # installazione riproducibile dal package-lock.json
npm test                                 # test unitari (backup, ripristino, immagini, promemoria, ricorrenze, preparazione del deploy)
npm run test:rules                       # regole Firestore sull'emulatore locale, progetto finto «demo-nocturna»
npx tsc --noEmit                         # controllo dei tipi
npm run build                            # build di produzione in dist/
python3 -I .github/scripts/test_estrai_zip.py   # estrazione sicura degli zip di aggiornamento
```

Come leggere i risultati:

- `npm test` e `npm run test:rules` terminano con un riepilogo `# pass N` / `# fail N`: il controllo è superato solo con `# fail 0` e codice di uscita 0.
- `npm run test:rules` la prima volta scarica l'emulatore da Google (`storage.googleapis.com`). Se il download è bloccato (errore `403` o `download failed`) i test delle regole **non sono stati eseguiti**: non vanno considerati superati.
- I test delle regole si rifiutano di partire se non trovano l'emulatore locale (`FIRESTORE_EMULATOR_HOST`) o se è impostata `GOOGLE_APPLICATION_CREDENTIALS`: avviali sempre con `npm run test:rules`.
- `tsc` e `build` non stampano errori quando tutto è corretto.

Su GitHub il workflow **Controlli** esegue gli stessi passi, in quest'ordine, su ogni Pull Request: test degli zip, verifica dei workflow, `npm ci`, test unitari, test delle regole, TypeScript e build. Il primo errore ferma il controllo.
