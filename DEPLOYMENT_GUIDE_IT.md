# CryptoRadar - Guida al Deployment
## Documento di Handoff per l'Utente

**Versione:** 1.7  
**Data:** Dicembre 2025

---

## PANORAMICA RAPIDA

CryptoRadar è **pronto per andare LIVE**. La maggior parte delle API sono già configurate e funzionanti.

### Stato Attuale:
- ✅ **Kraken API** - Attiva, nessuna chiave richiesta
- ✅ **Coinbase API** - Attiva, nessuna chiave richiesta
- ✅ **Bitstamp API** - Attiva, nessuna chiave richiesta
- ✅ **CoinGlass API** - Attiva, chiave già configurata
- ⚠️ **CryptoCompare API** - Richiede chiave (news fallback attivo)
- ⏸️ **Telegram API** - Opzionale, non configurato

---

## 1. LISTA COMPLETA DELLE API

### API DATI DI MERCATO (Gratuite, Nessuna Chiave)

| API | Uso | Stato | Chiave Richiesta |
|-----|-----|-------|------------------|
| **Kraken** | Prezzo BTC, candele, order book | ✅ ATTIVA | NO |
| **Coinbase** | Order book (aggregazione) | ✅ ATTIVA | NO |
| **Bitstamp** | Order book (aggregazione) | ✅ ATTIVA | NO |

**Queste API sono completamente gratuite e non richiedono configurazione.**

---

### API DERIVATI (Richiede Chiave - GIÀ CONFIGURATA)

| API | Uso | Stato | Chiave Richiesta |
|-----|-----|-------|------------------|
| **CoinGlass** | Open Interest, Funding Rate, Liquidazioni | ✅ ATTIVA | SÌ ✅ |

**Configurazione Attuale:**
- File: `/app/backend/.env`
- Chiave: `COINGLASS_API_KEY=858c52fb63b04008ab6633a913c32c7d`
- Stato: **Già configurata e funzionante**

**Nota:** Questa è una chiave di test. Per uso produzione, potresti voler ottenere la tua chiave su https://www.coinglass.com/

---

### API NOTIZIE (Opzionale)

| API | Uso | Stato | Chiave Richiesta |
|-----|-----|-------|------------------|
| **CryptoCompare** | Feed notizie crypto | ⚠️ FALLBACK | SÌ (opzionale) |

**Stato Attuale:**
- CryptoCompare ora richiede una chiave API
- Il sistema genera automaticamente **notizie basate sui dati di mercato** come fallback
- Le notizie funzionano anche senza la chiave

**Per abilitare CryptoCompare (opzionale):**
1. Registrati su https://www.cryptocompare.com/
2. Ottieni una chiave API gratuita
3. Aggiungi al file `/app/backend/.env`:
   ```
   CRYPTOCOMPARE_API_KEY=la_tua_chiave
   ```

---

### API TELEGRAM (Opzionale - Non Configurata)

| API | Uso | Stato | Chiave Richiesta |
|-----|-----|-------|------------------|
| **Telegram Bot** | Notifiche alert | ⏸️ NON ATTIVA | SÌ |

**Questa funzionalità è opzionale.** L'app funziona perfettamente senza Telegram.

**Per abilitare Telegram (opzionale):**
1. Crea un bot su Telegram:
   - Apri Telegram
   - Cerca @BotFather
   - Invia `/newbot`
   - Segui le istruzioni
   - Copia il token del bot
2. Ottieni il tuo Chat ID:
   - Cerca @userinfobot su Telegram
   - Invia `/start`
   - Copia il tuo ID
3. Aggiungi al file `/app/backend/.env`:
   ```
   TELEGRAM_BOT_TOKEN=il_tuo_token
   TELEGRAM_CHAT_ID=il_tuo_chat_id
   ```

---

## 2. RIEPILOGO CONFIGURAZIONE

### File di Configurazione: `/app/backend/.env`

```
# Database (già configurato)
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"

# CORS (già configurato)
CORS_ORIGINS="*"

# CoinGlass (già configurato)
COINGLASS_API_KEY=858c52fb63b04008ab6633a913c32c7d

# Opzionali (aggiungi se necessario)
# CRYPTOCOMPARE_API_KEY=la_tua_chiave
# TELEGRAM_BOT_TOKEN=il_tuo_token
# TELEGRAM_CHAT_ID=il_tuo_chat_id
```

### File di Configurazione: `/app/frontend/.env`

```
# URL Backend (verrà aggiornato durante il deployment)
REACT_APP_BACKEND_URL=https://il-tuo-dominio.com
```

---

## 3. GUIDA DEPLOYMENT PASSO-PASSO

### Opzione A: Deployment su Emergent (Raccomandato)

**Questo è il metodo più semplice. Tutto è già configurato.**

1. **Clicca su "Deploy"** nella dashboard di Emergent
2. **Attendi** che il deployment sia completato (2-3 minuti)
3. **Fatto!** Il tuo CryptoRadar è online

Il deployment Emergent:
- ✅ Configura automaticamente il database MongoDB
- ✅ Configura automaticamente le variabili d'ambiente
- ✅ Fornisce un URL pubblico per l'accesso

---

### Opzione B: Deployment Manuale (Avanzato)

Se preferisci deployare su un tuo server:

**Requisiti:**
- Node.js 18+
- Python 3.11+
- MongoDB

**Passi:**

1. **Clona il progetto**
2. **Configura il backend:**
   ```bash
   cd backend
   pip install -r requirements.txt
   # Modifica .env con le tue configurazioni
   ```
3. **Configura il frontend:**
   ```bash
   cd frontend
   yarn install
   # Modifica .env con il tuo URL backend
   ```
4. **Avvia i servizi:**
   ```bash
   # Backend
   uvicorn server:app --host 0.0.0.0 --port 8001
   
   # Frontend
   yarn start
   ```

---

## 4. CHECKLIST PRE-DEPLOYMENT

### Obbligatori ✅
- [x] Kraken API - Funzionante
- [x] Coinbase API - Funzionante
- [x] Bitstamp API - Funzionante
- [x] CoinGlass API - Chiave configurata
- [x] MongoDB - Configurato
- [x] Traduzioni Italiano - Complete

### Opzionali (Puoi configurare dopo)
- [ ] CryptoCompare API Key - Per notizie esterne
- [ ] Telegram Bot - Per notifiche
- [ ] Dominio personalizzato

---

## 5. DOPO IL DEPLOYMENT

### Primi Passi:
1. Accedi all'app tramite l'URL fornito
2. Verifica che il prezzo BTC sia visualizzato (indica che Kraken funziona)
3. Verifica che Open Interest mostri dati (indica che CoinGlass funziona)
4. Clicca "Registra Segnale" nello Storico per iniziare a tracciare i segnali

### Manutenzione:
- L'app si aggiorna automaticamente ogni 60 secondi
- I segnali vengono registrati nel database MongoDB
- Non è necessaria alcuna manutenzione regolare

---

## 6. RISOLUZIONE PROBLEMI

### "Il prezzo non si aggiorna"
- Verifica la connessione internet
- Kraken potrebbe avere un breve downtime (raro)
- Ricarica la pagina

### "Open Interest mostra 'N/A'"
- La chiave CoinGlass potrebbe essere scaduta
- Ottieni una nuova chiave su coinglass.com
- Aggiorna in `/app/backend/.env`

### "Le notizie mostrano sempre le stesse"
- Questo è normale senza la chiave CryptoCompare
- Le notizie generate sono basate sui dati di mercato reali

---

## 7. CONTATTI E SUPPORTO

### URL dei Manuali:
- **Manuale Operativo (IT):** `/MANUALE_OPERATIVO_IT.pdf`
- **Manuale Tecnico (IT):** `/MANUALE_TECNICO_IT.pdf`
- **Operational Manual (EN):** `/OPERATIONAL_MANUAL.pdf`
- **Technical Manual (EN):** `/TECHNICAL_MANUAL.pdf`

---

## RIEPILOGO FINALE

| Componente | Stato | Azione Richiesta |
|------------|-------|------------------|
| Dati Mercato (Kraken, Coinbase, Bitstamp) | ✅ Pronto | Nessuna |
| Dati Derivati (CoinGlass) | ✅ Pronto | Nessuna |
| Database (MongoDB) | ✅ Pronto | Nessuna |
| Traduzioni Italiano | ✅ Pronto | Nessuna |
| Notizie (CryptoCompare) | ⚠️ Fallback | Opzionale: aggiungi chiave |
| Notifiche (Telegram) | ⏸️ Non attivo | Opzionale: configura bot |

**CryptoRadar è pronto per il deployment.**

Clicca "Deploy" su Emergent e il tuo sistema di intelligence BTC sarà online!

---

*Documento creato: Dicembre 2025*
*Versione CryptoRadar: 1.7*
