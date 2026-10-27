# Servizi Pilot — Frontend

Applicazione Angular per la gestione di clienti, prodotti, magazzino, noleggi e manutenzioni. Questa guida descrive anche le schermate FE che espongono le API stagionali e le statistiche cliente implementate nel backend.

## Requisiti e avvio locale

- Node.js e npm compatibili con Angular 19.
- Backend Spring Boot avviato su `http://localhost:8082`.
- Dipendenze installate con `npm install`.

Avviare l'applicazione:

```bash
npm run start
```

Il frontend è disponibile su `http://localhost:4200/`. Il proxy Angular inoltra le richieste `/api` al backend locale sulla porta `8082`; per l'esecuzione locale non è quindi necessario abilitare CORS nel browser.

## Build e test

```bash
npm run build
npm test
```

`npm run build` esegue il build Angular di produzione. `npm test` avvia i test unitari Jasmine/Karma.

## Manutenzioni stagionali

La scheda cliente contiene **un'unica pianificazione stagionale condivisa da tutte le attrezzature noleggiate a quel cliente**. Configurare il numero di giorni di preavviso e una o più stagioni con date inclusive e frequenza in giorni. Per esempio, un periodo estivo può avere intervallo di 30 giorni e quello invernale di 90. I periodi non devono sovrapporsi.

- **Intervallo manutenzione**: frequenza degli interventi ordinari nella stagione indicata.
- **Giorni di preavviso**: anticipo con cui una singola attrezzatura passa a `IN_SCADENZA`; ad esempio, con 7 giorni la segnalazione si attiva nei sette giorni precedenti la sua scadenza.
- La configurazione è comune al cliente, mentre le date di scadenza e lo storico degli interventi sono distinti per noleggio/macchina.
- La prossima scadenza di ogni attrezzatura si calcola dalla sua ultima manutenzione ordinaria; se non esiste, dalla data del relativo documento di noleggio. Le manutenzioni straordinarie non modificano questo riferimento.
- I prodotti acquistati non sono un contatore e non spostano le scadenze.
- Il tab **Manutenzioni** nella sezione Noleggi elenca le macchine, lo stato e lo storico; consente di registrare l'ordinaria quando dovuta (`IN_RITARDO`) o una straordinaria per guasto.
- Se la configurazione cliente manca, la scheda propone 7 giorni come valore iniziale e nessun periodo. Il piano si attiva solo quando viene salvato.

Il backend restituisce per ogni noleggio uno stato:

| Stato | Significato |
|---|---|
| `NON_CONFIGURATA` | Non esiste una pianificazione valida per il noleggio. |
| `PROGRAMMATA` | La scadenza è oltre il periodo di preavviso. |
| `IN_SCADENZA` | La scadenza è entro i giorni di preavviso. |
| `IN_RITARDO` | La data prevista è raggiunta o superata; l'ordinaria è dovuta. |

### API pianificazione e manutenzioni

La pianificazione è relativa al cliente; stato ed eventi sono relativi al singolo documento di noleggio:

| Metodo e URL | Uso |
|---|---|
| `GET /api/clienti/{clienteId}/manutenzione/pianificazione` | Legge il piano condiviso del cliente. |
| `PUT /api/clienti/{clienteId}/manutenzione/pianificazione` | Crea o aggiorna il piano condiviso. |
| `GET /api/storia/noleggi/{docId}/manutenzione` | Legge lo stato corrente e la prossima scadenza. |
| `GET /api/storia/noleggi/{docId}/manutenzione/eventi` | Legge lo storico interventi. |
| `POST /api/storia/noleggi/{docId}/manutenzione/eventi` | Registra l'ordinaria quando dovuta. |
| `POST /api/storia/noleggi/{docId}/manutenzione/eventi/straordinaria` | Registra un intervento straordinario. |

Esempio per `PUT /api/clienti/{clienteId}/manutenzione/pianificazione`:

```json
{
  "giorniAvviso": 7,
  "periodi": [
    {
      "dataInizio": "2026-06-01",
      "dataFine": "2026-09-30",
      "intervalloGiorni": 30
    },
    {
      "dataInizio": "2026-10-01",
      "dataFine": "2027-05-31",
      "intervalloGiorni": 90
    }
  ]
}
```

Per la registrazione di un intervento, il body accetta una nota:

```json
{
  "note": "Sostituzione guarnizione e verifica erogazione"
}
```

Lo stato restituisce, tra gli altri campi, `pianificazioneConfigurata`, `prossimaManutenzioneIl`, `giorniAllaManutenzione`, `statoManutenzione` e `intervalloManutenzioneGiorni`. In assenza di una pianificazione cliente, la `GET` della pianificazione risponde `404`; il FE la tratta come configurazione non ancora creata. Gli altri errori vengono mostrati all'utente.

## Statistiche e stima degli acquisti

La scheda cliente mostra, oltre alla configurazione condivisa:

- quantità complessiva acquistata e numero di righe di vendita;
- vendite raggruppate per categoria, prodotto e mese;
- filtro temporale opzionale `dal` / `al`;

L'endpoint di statistiche esegue le aggregazioni nel backend e non richiede al FE di caricare lo storico completo delle righe di vendita:

```text
GET /api/statistiche/clienti/{clienteId}?dal=2026-01-01&al=2026-12-31
```

Entrambe le date sono opzionali e usano il formato ISO `YYYY-MM-DD`. La risposta include:

- `clienteId`, `cliente`, `dal`, `al`;
- `quantitaTotaleAcquistata`, `righeVendita`;
- `venditePerCategoria`, `venditePerProdotto`, `andamentoMensile`;
- `noleggiEStimePerAttrezzatura`, con le categorie/prodotti stimati e il campo `ambitoStima`, disponibile nell'API per le integrazioni.

**Limite funzionale da mantenere esplicito nell'interfaccia:** quando un cliente ha più macchine, gli acquisti non indicano quale macchina li abbia consumati. Le statistiche restano aggregate al cliente; la ripetizione di acquisti nelle stime di noleggi con categorie comuni non rappresenta un consumo misurato e non va sommata per ricavare consumi macchina. Le vendite non contengono importi/prezzi utilizzabili, quindi il FE mostra quantità e righe, non fatturato.

### Categorie per le stime

La configurazione categorie resta un filtro per le stime nell'API del singolo noleggio. Non è mostrata come impostazione manutentiva cliente, non rappresenta una soglia e non è un contatore di consumo. L'endpoint è:

```text
PUT /api/storia/noleggi/{docId}/manutenzione/configurazione
```

Body:

```json
{
  "categoriaIds": [3, 8]
}
```

La configurazione richiede almeno una categoria; selezionare solo quelle che si vogliono includere nella stima di quel noleggio.

## Client API e OpenAPI

Le API specifiche di pianificazione e statistiche sono descritte anche in `swagger/openApi.yaml` e sono usate tramite i client TypeScript dedicati:

- `StoriaNoleggiManutenzioniService`
- `ClienteStatisticheService`

I modelli corrispondenti sono in `src/app/api/models/`. I client dedicati sono implementazioni manuali: prima di eseguire `npm run api:gen`, verificare l'output del generatore per evitare di sovrascrivere i client usati dalle schermate.

## Migrazioni backend richieste

Le tabelle per piani cliente, periodi e interventi devono esistere prima di usare queste schermate. Con `ddl-auto: validate`, Hibernate non crea automaticamente le tabelle mancanti. Applicare in ordine gli script SQL manuali inclusi nel repository backend:

1. `src/main/resources/db/manual/20261026_manutenzione_noleggi.sql`
2. `src/main/resources/db/manual/20261027_indici_noleggi.sql`
3. `src/main/resources/db/manual/20261028_manutenzione_stagionale.sql`
4. `src/main/resources/db/manual/20261029_manutenzione_cliente.sql`

La migrazione 20261029 non copia automaticamente piani precedenti salvati per noleggio, perché per lo stesso cliente potrebbero essere diversi. I vecchi dati vengono lasciati intatti ma non determinano più le scadenze: configurare il nuovo piano condiviso dalla scheda cliente. Le manutenzioni già registrate restano associate ai singoli noleggi. Le modifiche FE non applicano automaticamente migrazioni al database.
