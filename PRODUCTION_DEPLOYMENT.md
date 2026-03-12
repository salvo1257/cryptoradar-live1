# CryptoRadar - Piano di Deployment Produzione
## Guida Completa per il Go-Live Sicuro

**Versione:** 1.7  
**Data:** Marzo 2026  
**Stato:** ✅ PRONTO PER LA PRODUZIONE

---

## 🔍 1. PRODUCTION READINESS CHECK

### Stato Attuale del Sistema

| Componente | Stato | Note |
|------------|-------|------|
| **Kraken API** | ✅ OK | Dati mercato in tempo reale |
| **Coinbase API** | ✅ OK | Order book aggregato |
| **Bitstamp API** | ✅ OK | Order book aggregato |
| **CoinGlass API** | ✅ OK | Open Interest, Funding Rate |
| **MongoDB** | ✅ OK | Storico segnali attivo |
| **News Module** | ✅ OK | Fallback attivo |
| **Trade Signal** | ✅ OK | 9 fattori di scoring |
| **WebSocket** | ✅ OK | Prezzo live streaming |

### Endpoint di Verifica
```bash
# Verifica salute sistema
curl https://YOUR_DOMAIN/api/system/health

# Verifica segnale trading
curl https://YOUR_DOMAIN/api/trade-signal

# Verifica storico segnali
curl https://YOUR_DOMAIN/api/signal-history
```

---

## 🔐 2. CONFIGURAZIONE AMBIENTE

### Variabili Backend (`backend/.env`)

```env
# OBBLIGATORIE
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/
DB_NAME=cryptoradar_prod

# API DATI DERIVATI (Consigliata)
COINGLASS_API_KEY=your_coinglass_api_key

# OPZIONALI
CORS_ORIGINS=https://your-domain.com
CRYPTOCOMPARE_API_KEY=your_key_if_needed
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

### Variabili Frontend (`frontend/.env`)

```env
REACT_APP_BACKEND_URL=https://your-domain.com
```

### Dove Ottenere le Chiavi

| Chiave | URL | Note |
|--------|-----|------|
| **MongoDB** | https://cloud.mongodb.com | Gratuito fino a 512MB |
| **CoinGlass** | https://www.coinglass.com/pricing | Gratuito con limiti |
| **CryptoCompare** | https://www.cryptocompare.com/cryptopian/api-keys | Opzionale |
| **Telegram** | @BotFather su Telegram | Gratuito |

---

## 📋 3. ISTRUZIONI DEPLOYMENT STEP-BY-STEP

### Opzione A: Deploy su Emergent (Consigliato - Più Semplice)

1. **Clicca "Deploy"** nella dashboard Emergent
2. **Verifica variabili ambiente** nella sezione configurazione
3. **Attendi il deploy** (2-3 minuti)
4. **Verifica** con `/api/system/health`

### Opzione B: Deploy su VPS/Server Proprio

#### Requisiti
- Ubuntu 20.04+ o Debian 11+
- Python 3.11+
- Node.js 18+
- MongoDB (locale o Atlas)
- 2GB RAM minimo
- 10GB disco

#### Step 1: Preparazione Server
```bash
# Aggiorna sistema
sudo apt update && sudo apt upgrade -y

# Installa dipendenze
sudo apt install python3.11 python3.11-venv nodejs npm nginx supervisor -y
```

#### Step 2: Clone e Setup
```bash
# Clone repository
git clone https://github.com/YOUR_USER/cryptoradar.git
cd cryptoradar

# Setup Backend
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Crea .env
cp .env.example .env
nano .env  # Modifica con le tue chiavi

# Setup Frontend
cd ../frontend
npm install
npm run build
```

#### Step 3: Configurazione Supervisor
```bash
sudo nano /etc/supervisor/conf.d/cryptoradar.conf
```

Contenuto:
```ini
[program:cryptoradar-backend]
directory=/home/user/cryptoradar/backend
command=/home/user/cryptoradar/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
autostart=true
autorestart=true
stderr_logfile=/var/log/cryptoradar/backend.err.log
stdout_logfile=/var/log/cryptoradar/backend.out.log
user=user
environment=PATH="/home/user/cryptoradar/backend/venv/bin"
```

#### Step 4: Configurazione Nginx
```bash
sudo nano /etc/nginx/sites-available/cryptoradar
```

Contenuto:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (React build)
    location / {
        root /home/user/cryptoradar/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }
}
```

#### Step 5: Avvio Servizi
```bash
# Crea cartella log
sudo mkdir -p /var/log/cryptoradar

# Attiva configurazioni
sudo ln -s /etc/nginx/sites-available/cryptoradar /etc/nginx/sites-enabled/
sudo supervisorctl reread
sudo supervisorctl update

# Avvia tutto
sudo supervisorctl start cryptoradar-backend
sudo systemctl restart nginx
```

#### Step 6: SSL (HTTPS)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

---

## 🛡️ 4. PROTEZIONI DI STABILITÀ

### Protezioni Già Implementate

| Protezione | Stato | Descrizione |
|------------|-------|-------------|
| **Error Handling** | ✅ | Tutti gli endpoint hanno try/except |
| **API Fallback** | ✅ | News genera contenuto se API fallisce |
| **Timeout** | ✅ | Timeout 10s su tutte le chiamate API |
| **Graceful Degradation** | ✅ | Sistema funziona anche se un'API è down |
| **Health Check** | ✅ | `/api/system/health` monitora tutto |
| **Logging** | ✅ | Log dettagliati per debug |

### Comportamento in Caso di Errori API

| API Down | Comportamento |
|----------|---------------|
| **Kraken** | Usa dati cached, mostra ultimo prezzo |
| **Coinbase/Bitstamp** | Order book parziale, segnale continua |
| **CoinGlass** | Dati derivati a 0, segnale con meno fattori |
| **MongoDB** | Segnali non salvati, app continua |

### Configurazione Supervisor per Auto-Restart
```ini
autorestart=true           # Riavvia se crash
startretries=3             # Tenta 3 volte
stopwaitsecs=10           # Attende 10s prima di kill
```

### Monitoring Consigliato

```bash
# Crontab per health check ogni 5 minuti
*/5 * * * * curl -s https://your-domain.com/api/system/health | grep '"status": "OK"' || echo "CryptoRadar DOWN" | mail -s "Alert" your@email.com
```

---

## 📊 5. HEALTH MONITORING

### Endpoint Health Check
```
GET /api/system/health
```

### Risposta Attesa (Tutto OK)
```json
{
  "status": "OK",
  "timestamp": "2026-03-12T22:00:00Z",
  "version": "1.7",
  "apis": {
    "kraken": {"status": "OK"},
    "coinbase": {"status": "OK"},
    "bitstamp": {"status": "OK"},
    "coinglass": {"status": "OK"},
    "mongodb": {"status": "OK"}
  }
}
```

### Script di Monitoring
```python
#!/usr/bin/env python3
import requests
import smtplib

def check_health():
    try:
        r = requests.get("https://your-domain.com/api/system/health", timeout=10)
        data = r.json()
        
        errors = []
        for api, info in data.get("apis", {}).items():
            if info.get("status") == "ERROR":
                errors.append(api)
        
        if errors:
            send_alert(f"API in errore: {', '.join(errors)}")
            
    except Exception as e:
        send_alert(f"Sistema non raggiungibile: {e}")

def send_alert(message):
    # Configura email o Telegram qui
    print(f"ALERT: {message}")

if __name__ == "__main__":
    check_health()
```

---

## 🚀 6. RACCOMANDAZIONE FINALE

### Il Modo Più Sicuro per Deployare CryptoRadar

**Opzione Consigliata: Emergent Platform**

1. ✅ **Zero configurazione server** - Tutto gestito automaticamente
2. ✅ **SSL automatico** - HTTPS incluso
3. ✅ **Auto-restart** - Se il servizio crasha, riparte da solo
4. ✅ **Scaling automatico** - Gestisce i picchi di traffico
5. ✅ **Backup inclusi** - MongoDB Atlas integrato

**Passi per Go-Live su Emergent:**
1. Verifica che `/api/system/health` restituisca OK
2. Clicca "Deploy" nella dashboard
3. Attendi 2-3 minuti
4. Il sistema è live!

---

### Checklist Pre-Deploy

- [ ] `/api/system/health` restituisce status OK
- [ ] Tutti i PDF manuali sono scaricabili
- [ ] Trade Signal genera segnali corretti
- [ ] Signal History salva nel database
- [ ] WebSocket prezzo funziona
- [ ] UI responsive su mobile

### Post-Deploy

- [ ] Verifica health check ogni ora per le prime 24h
- [ ] Controlla log per errori inattesi
- [ ] Testa alert Telegram (se configurato)
- [ ] Monitora performance MongoDB

---

## 📞 SUPPORTO

Per problemi:
1. Controlla `/api/system/health` per identificare l'API in errore
2. Controlla i log: `/var/log/supervisor/backend.err.log`
3. Verifica variabili ambiente in `.env`

---

**CryptoRadar v1.7 - Pronto per la Produzione** ✅
