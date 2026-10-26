# Nocturna

La tua app personale per scuola, lavoro, lettura e scrittura. Funziona su computer e telefono, si sincronizza tra i dispositivi, funziona offline e si installa come un'app. Costa zero: usa solo i piani gratuiti di Firebase e GitHub, e non devi installare niente sul computer.

> **Contenuto:** accesso con Google; Home con calendario di tutte le aree e pannello Oggi/Domani; Scuola (bacheca, calendario con orario, materie, orario settimanale, voti, sessioni di studio collegate); Lavoro (panoramica, bacheca, calendario, progetti, appunti e verbali, blocchi e richieste); The Scribe's Diary (panoramica, libri e collaborazioni con copertina, piano editoriale, attività, calendario); Mabel Altheanne Nyctalis (attività, progetti, Attività della corte, calendario); colonne personalizzabili; attività ricorrenti; ricerca e filtri; cestino; Profilo e Impostazioni con backup e ripristino; riepilogo all'apertura; notifiche push anche ad app chiusa.

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
| `ALLOWED_EMAIL` | L'indirizzo Google che userai per entrare in Nocturna. Nessun altro account potrà accedere. |

**Come copiare il contenuto del file `.json`**

- **Computer:** aprilo con il Blocco note o TextEdit, seleziona tutto e copia.
- **Android:** aprilo dall'app *File* (o *Download*) con un visualizzatore di testo, seleziona tutto e copia.
- **iPhone:** aprilo dall'app *File*: si vede il testo. Tieni premuto, scegli **Seleziona tutto** e poi **Copia**.

Il contenuto deve iniziare con `{` e finire con `}`. Dopo averlo incollato nel secret, elimina il file dal dispositivo.

### 7. Crea il file che pubblica l'app

1. Nella pagina principale del repository tocca **Add file → Create new file**.
2. Come nome scrivi esattamente `.github/workflows/deploy.yml`. Le barre `/` creano da sole le cartelle.
3. Incolla il contenuto del file `deploy.yml`, che ti ho dato in chat. Dopo il primo caricamento ne trovi una copia anche nel repository, in `setup/deploy.yml`.
4. Tocca **Commit changes** e conferma.

Questo passo si fa una volta sola. Da qui in poi lo zip basta caricarlo.

### 8. Carica lo zip

1. Nella pagina principale del repository tocca **Add file → Upload files**.
2. Scegli lo zip di Nocturna (per esempio `nocturna-v1.zip`) **così com’è**, senza estrarlo.
3. Tocca **Commit changes**.
4. Apri la scheda **Actions**: vedrai «Pubblica Nocturna» in esecuzione. GitHub estrae lo zip, compila l'app e la pubblica. Dopo 3–4 minuti deve comparire un segno di spunta verde.

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
2. GitHub lo estrae, sostituisce i file vecchi e ripubblica da solo.
3. Al successivo avvio, l'app sui dispositivi si aggiorna in automatico.

Se una fase modifica anche il file `deploy.yml`, te lo dirò e andrà aggiornato a mano come al passo 7.

## Se qualcosa non va

- **Spunta rossa in Actions.** Apri l'esecuzione e leggi l'errore. Se riguarda la configurazione o un secret mancante, il messaggio dice in italiano cosa correggere. Dopo aver corretto, clicca **Re-run jobs**.
- **Errore che parla di permessi** (*permission*, *403*). Ricontrolla il ruolo **Amministratore Firebase** del passo 5.
- **Errore che dice che un'API non è attiva** (*API has not been used* o *is disabled*). Apri il link contenuto nell'errore, clicca **Abilita**, aspetta un paio di minuti e poi **Re-run jobs**.
- **Errore su `FIREBASE_CONFIG`.** Ricopia il blocco `firebaseConfig` per intero nel secret.
- **Le notifiche non arrivano.** Controlla in **Actions → Promemoria Nocturna** che le esecuzioni siano verdi e che il dispositivo risulti attivo in Impostazioni. Se l'errore parla di *Cloud Messaging* o *FCM*, apri il link contenuto nell'errore e abilita l'API.
- **«Account non autorizzato» all'accesso.** Hai scelto un account Google diverso da quello scritto nel secret `ALLOWED_EMAIL`.

---

## Come sono organizzati i dati

Tutti i dati stanno in un unico database Firestore, in `users/{tuo-id}/{sezione}/{documento}`:

- `scuola`: attività, materie e lezioni dell'orario.
- `lavoro`: attività, progetti e note.
- `lettura`: libri e attività.
- `scrittura`: progetti e attività.
- `impostazioni`: preferenze, profilo e colonne delle bacheche.
- `dispositivi`: i telefoni e i computer abilitati alle notifiche.

Le regole di sicurezza permettono di leggere e scrivere solo i propri dati, e solo all'account indicato in `ALLOWED_EMAIL`. Gli elementi eliminati restano nel Cestino finché non li elimini definitivamente.

## Per chi sviluppa

```bash
npm install
npm run dev          # poi apri http://localhost:5173/?demo per provare l'interfaccia con dati d'esempio, senza Firebase
npm run build
```
