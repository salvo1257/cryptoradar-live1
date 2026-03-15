import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { 
  BookOpen, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Shield, 
  Activity,
  BarChart3,
  Waves,
  Users,
  AlertTriangle,
  CheckCircle,
  Download,
  ChevronDown,
  ChevronRight,
  Zap,
  Clock,
  DollarSign,
  ListChecks
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

// Manual content in all languages
const manualContent = {
  it: {
    title: "Manuale CryptoRadar",
    subtitle: "Guida completa al sistema di intelligence per il trading BTC",
    sections: [
      {
        id: "trade-signal",
        icon: Zap,
        title: "Segnale Operativo",
        content: `Il **Segnale Operativo** è il cuore di CryptoRadar. Sintetizza 9 fattori di intelligence per generare raccomandazioni di trading:

**Stati del Segnale:**
- **NESSUNA OPERAZIONE**: Nessun setup chiaro rilevato
- **IN CONFERMA**: Setup rilevato, in attesa di conferma (richiede 2 segnali consecutivi)
- **OPERATIVO**: Segnale confermato, pronto per il trading

**Come funziona la conferma:**
1. Il sistema rileva un potenziale setup LONG o SHORT
2. Attende almeno 2 segnali consecutivi nella stessa direzione
3. Verifica che non ci siano contraddizioni da altri fattori
4. Solo dopo la conferma il segnale diventa OPERATIVO

**Timeframe:**
Il sistema usa candele a 4 ore (4H) come contesto operativo principale. Questo significa che i segnali sono pensati per trade che durano da alcune ore a alcuni giorni.`
      },
      {
        id: "sr-levels",
        icon: Activity,
        title: "Supporto e Resistenza",
        content: `I livelli di **Supporto e Resistenza** sono calcolati da due fonti:

**1. Analisi Storica (Pivot Points)**
- Identifica i massimi e minimi significativi dalle candele 4H
- Calcola quante volte il prezzo ha toccato ogni livello
- Classifica la forza: forte (3+ tocchi), moderato (2), debole (1)

**2. Order Book Multi-Exchange**
- Aggrega dati da Kraken, Coinbase e Bitstamp
- Identifica "muri" di ordini significativi (>2.5x volume medio)
- Mostra dove c'è reale interesse di acquisto/vendita

**Come interpretarli:**
- I livelli **forti** hanno alta probabilità di tenuta
- I livelli **moderati** potrebbero cedere con momentum
- I livelli **deboli** servono come riferimento ma possono rompersi facilmente`
      },
      {
        id: "liquidity-ladder",
        icon: Waves,
        title: "Scala di Liquidità",
        content: `La **Scala di Liquidità** analizza dove si trova la liquidità nel mercato e prevede dove il prezzo potrebbe andare per "cacciare" gli stop.

**Concetto chiave:** Il prezzo tende a muoversi verso le zone di liquidità per riempire ordini e liquidare posizioni.

**Elementi analizzati:**
- Liquidità sopra il prezzo attuale (ordini di vendita)
- Liquidità sotto il prezzo attuale (ordini di acquisto)
- Distanza dal prezzo corrente
- Valore totale in ogni zona

**Interpretazione:**
- **Più liquidità sopra**: Il prezzo potrebbe salire per cacciare gli stop degli short
- **Più liquidità sotto**: Il prezzo potrebbe scendere per cacciare gli stop dei long
- **Bilanciato**: Nessuna direzione chiara, possibile consolidamento

**Sweep Expectation:**
Il sistema prevede se ci sarà uno "sweep" (movimento rapido per liquidare posizioni) prima del movimento principale.`
      },
      {
        id: "sweep-reversal",
        icon: Target,
        title: "Logica Sweep & Reversal",
        content: `Lo **Sweep & Reversal** è uno dei pattern più importanti nel trading BTC professionale.

**Cos'è uno Sweep:**
Uno sweep è un movimento rapido del prezzo oltre un livello chiave per:
1. Attivare gli stop loss dei trader
2. Liquidare posizioni con leva
3. Raccogliere liquidità

**Come funziona in CryptoRadar:**
1. Il sistema identifica quando il prezzo si avvicina a un livello chiave
2. Calcola la "zona di sweep" (area dove sono concentrati gli stop ovvi)
3. Posiziona lo stop loss OLTRE la zona di sweep per evitare la caccia
4. Aspetta la conferma del rigetto/recupero prima di segnalare l'operazione

**Esempio LONG:**
- Prezzo vicino al supporto $68,000
- Zona di sweep stimata: $67,800-67,600
- Stop "intelligente" posizionato a $67,400 (oltre lo sweep)
- Il segnale diventa OPERATIVO solo dopo che il prezzo recupera $68,000

**Perché è importante:**
Molti trader perdono perché posizionano stop negli stessi punti ovvi. CryptoRadar li aiuta a evitare queste trappole.`
      },
      {
        id: "market-bias",
        icon: BarChart3,
        title: "Bias di Mercato",
        content: `Il **Bias di Mercato** determina la direzione generale del mercato analizzando:

**Fattori considerati:**
1. **Trend delle candele 4H**: Direzione del prezzo
2. **Order Book Imbalance**: Più acquirenti o venditori?
3. **RSI (14)**: Momentum rialzista o ribassista
4. **Volume**: Conferma del movimento

**Stati del Bias:**
- **BULLISH**: Il mercato favorisce i rialzisti
- **BEARISH**: Il mercato favorisce i ribassisti  
- **NEUTRAL**: Indecisione, nessuna direzione chiara

**Confidenza:**
La percentuale di confidenza indica quanto sono allineati i fattori. Una confidenza del 75%+ indica un bias molto chiaro.

**Trap Risk:**
Il sistema valuta anche il "rischio trappola" - la probabilità che un movimento sia un falso breakout.`
      },
      {
        id: "open-interest",
        icon: DollarSign,
        title: "Open Interest",
        content: `L'**Open Interest (OI)** rappresenta il numero totale di contratti futures aperti sul mercato.

**Dati da CoinGlass:**
- OI totale BTC su tutti gli exchange
- Variazione nelle ultime 4H e 24H
- Trend (in aumento, stabile, in diminuzione)

**Interpretazione:**
- **OI in aumento + Prezzo in salita**: Nuovi long entrano = bullish
- **OI in aumento + Prezzo in discesa**: Nuovi short entrano = bearish
- **OI in diminuzione**: Posizioni in chiusura = possibile esaurimento
- **OI stabile**: Consolidamento, attesa di catalizzatore

**Segnali importanti:**
- Un OI molto alto può indicare un mercato affollato pronto per un flush
- Un calo improvviso di OI può segnalare liquidazioni in corso`
      },
      {
        id: "funding-rate",
        icon: Activity,
        title: "Funding Rate",
        content: `Il **Funding Rate** è il meccanismo che tiene il prezzo dei futures perpetui vicino allo spot.

**Come funziona:**
- Funding positivo: I long pagano gli short → mercato bullish/affollato di long
- Funding negativo: Gli short pagano i long → mercato bearish/affollato di short

**Dati analizzati:**
- Tasso attuale (ogni 8 ore)
- Sentiment derivato (bullish/bearish/neutral)
- Overcrowding (posizioni affollate)

**Segnali di rischio:**
- **Long affollati** (funding molto positivo): Rischio di long squeeze
- **Short affollati** (funding molto negativo): Rischio di short squeeze

Il sistema avvisa quando una delle due condizioni è presente, permettendoti di agire con cautela o sfruttare la situazione.`
      },
      {
        id: "whale-activity",
        icon: Users,
        title: "Attività Balene",
        content: `Il **Whale Engine** analizza l'attività dei grandi operatori (balene) per identificare pressione di acquisto o vendita.

**Fattori analizzati:**
1. **Volume spike**: Picchi di volume anomali
2. **Order book aggression**: Ordini aggressivi bid/ask
3. **Liquidation data**: Chi sta venendo liquidato
4. **Multi-exchange analysis**: Confronto tra exchange

**Output:**
- **Direzione**: BUY, SELL, o NEUTRAL
- **Forza**: 0-100% (quanto è forte il segnale)
- **Spiegazione**: Dettaglio di cosa sta succedendo

**Utilizzo:**
- Se il segnale è LONG ma le balene vendono forte → cautela
- Se il segnale è LONG e le balene comprano → conferma
- Se le balene sono neutrali → il segnale dipende dagli altri fattori

Il sistema integra automaticamente l'attività balene nel calcolo del segnale finale.`
      },
      {
        id: "signal-history",
        icon: Clock,
        title: "Storico Segnali",
        content: `Lo **Storico Segnali** registra automaticamente tutti i cambiamenti di stato del sistema.

**Eventi registrati:**
- **Setup Rilevato**: Nuovo potenziale trade identificato
- **Segnale Confermato**: Setup confermato, segnale operativo
- **Setup Invalidato**: Setup non confermato, condizioni cambiate
- **Segnale Invalidato**: Trade operativo terminato

**Dati salvati per ogni evento:**
- Timestamp
- Direzione (LONG/SHORT/NO TRADE)
- Confidenza %
- Zona di ingresso, stop, target
- Prezzo BTC al momento
- Bias di mercato
- Attività balene
- Ragionamento completo

**Utilizzo:**
1. Analizza le performance passate
2. Identifica pattern ricorrenti
3. Verifica l'accuratezza del sistema
4. Migliora il tuo trading nel tempo`
      },
      {
        id: "news",
        icon: BookOpen,
        title: "News Module",
        content: `Il **News Module** genera titoli contestuali basati sui dati di mercato in tempo reale.

**Come funziona:**
Il sistema analizza:
- Prezzo attuale e variazione
- Bias di mercato
- Attività balene
- Funding rate

E genera headline che riflettono la situazione attuale del mercato.

**Nota importante:**
Le news sono generate algoritmicamente, non sono notizie reali. Servono come sintesi rapida delle condizioni di mercato, non come fonte di informazione esterna.

**Perché questo approccio:**
Le API di news crypto richiedono chiavi a pagamento. Invece di mostrare news obsolete o non disponibili, il sistema genera contenuto utile basato sui dati reali che già possiede.`
      }
    ],
    tradingGuide: {
      title: "Guida al Trading",
      subtitle: "Come usare CryptoRadar per il trading BTC",
      sections: [
        {
          title: "Interpretare i Segnali LONG",
          content: `**Quando il sistema mostra LONG (OPERATIVO):**

1. **Verifica il Bias**: Dovrebbe essere BULLISH o almeno NEUTRAL
2. **Controlla la Confidenza**: >65% è un buon segnale, >75% è forte
3. **Guarda la Zona di Ingresso**: Il range suggerito per entrare
4. **Imposta lo Stop Loss**: Usa il valore indicato (oltre la zona sweep)
5. **Pianifica i Target**: Target 1 per parziale, Target 2 per il resto

**Quando NON entrare anche se dice LONG:**
- Confidenza <55%
- Contraddizioni da whale activity
- Alta volatilità segnalata
- Risk/Reward <1.5:1`
        },
        {
          title: "Interpretare i Segnali SHORT",
          content: `**Quando il sistema mostra SHORT (OPERATIVO):**

1. **Verifica il Bias**: Dovrebbe essere BEARISH o NEUTRAL con pressione di vendita
2. **Controlla la Confidenza**: >65% è buono, >75% è forte
3. **Nota la Zona Sweep**: Il prezzo potrebbe salire brevemente prima di scendere
4. **Imposta lo Stop Loss**: Sopra la zona sweep indicata
5. **Target in discesa**: Usa i livelli S/R sotto il prezzo

**Attenzione particolare per SHORT:**
- BTC tende a salire nel lungo termine
- Gli short squeeze sono violenti
- Usa size più piccole rispetto ai long`
        },
        {
          title: "Capire la Confidenza",
          content: `La **Confidenza %** indica quanto i fattori sono allineati:

**90-100%**: Tutti i fattori concordano - segnale molto forte
**75-89%**: La maggior parte concorda - segnale affidabile
**60-74%**: Alcuni fattori discordanti - procedere con cautela
**50-59%**: Segnali misti - ridurre size o aspettare
**<50%**: Troppa incertezza - meglio NO TRADE

**Cosa abbassa la confidenza:**
- Exchange in disaccordo
- Whale activity contraria
- Funding rate estremo
- Pattern contraddittori`
        },
        {
          title: "Entry, Stop e Target",
          content: `**Zona di Ingresso:**
- Range suggerito per l'entry
- Non entrare troppo lontano dalla zona
- Usa ordini limit se possibile

**Stop Loss:**
- Il sistema lo posiziona OLTRE la zona di sweep
- NON spostarlo più vicino (trap risk)
- Rappresenta l'invalidazione del trade

**Target 1 (Conservativo):**
- Primo livello di profitto
- Considera di chiudere 50% della posizione qui

**Target 2 (Esteso):**
- Secondo livello per il resto
- Raggiungerlo richiede un movimento forte

**Risk/Reward:**
- Ideale: >2:1
- Accettabile: >1.5:1
- <1.5:1 il sistema avvisa`
        },
        {
          title: "Identificare Falsi Segnali",
          content: `**Segnali di una possibile trappola:**

1. **"Alto rischio trappola"** - Il sistema lo segnala esplicitamente
2. **Sweep atteso** - Prezzo potrebbe muoversi contro prima
3. **Whale activity contraria** - Grandi operatori vanno nell'altra direzione
4. **Funding estremo** - Mercato troppo affollato in una direzione
5. **Confidenza bassa** - Troppi fattori discordanti

**Come proteggersi:**
- Attendi lo stato OPERATIVO, non entrare su IN CONFERMA
- Usa lo stop del sistema, non uno più stretto
- Riduci la size quando ci sono warning
- Non fare "averaging down" se lo stop viene colpito`
        },
        {
          title: "Combinare i Fattori",
          content: `**Il setup ideale:**

✅ Segnale OPERATIVO (confermato)
✅ Bias di mercato concorda
✅ Whale activity concorda
✅ Liquidity ladder supporta la direzione
✅ Confidenza >70%
✅ Risk/Reward >1.5:1
✅ Nessun warning critico

**Quando aspettare:**
- Segnale ancora IN CONFERMA
- Sweep atteso prima del movimento
- Alta volatilità segnalata
- Contraddizioni tra i moduli

**Quando NON tradare:**
- NO TRADE persistente
- Confidenza <55%
- Troppi warning attivi
- Mercato in consolidamento estremo`
        }
      ]
    },
    downloadPdf: "Scarica PDF",
    systemManual: "Manuale Sistema",
    tradingManual: "Guida Trading",
    operationalRules: {
      title: "Regole Operative",
      subtitle: "5 regole pratiche per usare CryptoRadar in modo efficace",
      rules: [
        {
          number: 1,
          title: "Evita il Trading nel Weekend",
          icon: "calendar",
          content: `**Regola:** Evita il trading nel weekend quando possibile.

**Perché:** I dati recenti mostrano un alto tasso di segnali scaduti (expired) e una qualità dei segnali più debole durante il fine settimana.

**Evidenza dai dati:**
- Win rate weekend: ~0%
- Expired rate weekend: ~100%
- Win rate weekday: ~50%

**Azione pratica:** Se vedi un segnale OPERATIVO durante il sabato o la domenica, valuta se aspettare lunedì prima di agire. La volatilità ridotta nel weekend spesso non permette ai segnali di raggiungere i target.`
        },
        {
          number: 2,
          title: "Preferisci i Setup LONG",
          icon: "trending-up",
          content: `**Regola:** Preferisci i setup LONG rispetto agli SHORT, almeno per ora.

**Perché:** I dati attuali di affidabilità mostrano una performance significativamente migliore per i segnali LONG.

**Evidenza dai dati:**
- LONG win rate: ~80%
- SHORT win rate: ~4%
- LONG profit factor: >1
- SHORT profit factor: ~0

**Azione pratica:** Quando vedi un segnale SHORT, consideralo con maggiore cautela. Potresti ridurre la size o aspettare ulteriori conferme. I segnali LONG, invece, hanno storicamente performato molto meglio.

**Nota:** Questa preferenza potrebbe cambiare quando raccoglieremo più dati in condizioni di mercato diverse.`
        },
        {
          number: 3,
          title: "Solo Segnali OPERATIVI",
          icon: "check-circle",
          content: `**Regola:** Entra nei trade SOLO quando lo stato del segnale è OPERATIVO.

**Perché:** Gli stati "NO TRADE" e "IN CONFERMA" indicano che il sistema non ha ancora validato completamente il setup.

**Stati del segnale:**
- **NO TRADE**: Nessun setup valido - NON tradare
- **IN CONFERMA**: Setup potenziale ma non confermato - ASPETTA
- **OPERATIVO**: Setup confermato e pronto - OK per entrare

**Azione pratica:** Prima di ogni trade, verifica che il badge del segnale mostri "OPERATIVO" (verde). Se vedi "IN CONFERMA" (giallo), aspetta che diventi operativo. Entrare anticipatamente aumenta il rischio di falsi segnali.`
        },
        {
          number: 4,
          title: "Controlla Urgenza e Validità",
          icon: "clock",
          content: `**Regola:** Controlla sempre signal_urgency e valid_for_minutes prima di agire. Non inseguire segnali scaduti o in ritardo.

**Perché:** Ogni segnale ha una finestra di validità. Entrare troppo tardi riduce significativamente le probabilità di successo.

**Indicatori da controllare:**
- **Urgenza**: LOW / MEDIUM / HIGH
- **Valido per**: XX minuti rimanenti
- **Timestamp**: Quando è stato generato

**Azione pratica:** 
- Se l'urgenza è HIGH e rimangono pochi minuti, agisci rapidamente o lascia perdere
- Se il segnale è già "vecchio" di ore, probabilmente il prezzo si è già mosso
- Non "inseguire" un trade se il prezzo è già lontano dalla zona di ingresso suggerita`
        },
        {
          number: 5,
          title: "Usa la Heatmap come Filtro",
          icon: "bar-chart",
          content: `**Regola:** Usa la reliability heatmap (Analisi Affidabilità) come filtro decisionale. Se un tipo di segnale ha performance storiche deboli, trattalo con cautela extra.

**Perché:** Non tutti i segnali sono uguali. La heatmap mostra quali combinazioni (direzione + confidenza) hanno funzionato storicamente.

**Come usarla:**
1. Vai su "Analisi Affidabilità" nel menu
2. Controlla la heatmap Direzione × Confidenza
3. Verifica il colore della cella corrispondente al tuo segnale

**Interpretazione colori:**
- 🟢 Verde (60%+): Combinazione affidabile - procedi
- 🟡 Giallo (40-60%): Cautela - riduci size
- 🟠 Arancione (20-40%): Alto rischio - considera di saltare
- 🔴 Rosso (<20%): Evita questa combinazione

**Azione pratica:** Prima di ogni trade, fai un rapido check sulla heatmap. Se la combinazione del tuo segnale è rossa o arancione, potresti voler aspettare un'opportunità migliore.`
        }
      ]
    }
  },
  en: {
    title: "CryptoRadar Manual",
    subtitle: "Complete guide to the BTC trading intelligence system",
    sections: [
      {
        id: "trade-signal",
        icon: Zap,
        title: "Trade Signal",
        content: `The **Trade Signal** is the core of CryptoRadar. It synthesizes 9 intelligence factors to generate trading recommendations:

**Signal States:**
- **NO TRADE**: No clear setup detected
- **IN CONFIRMATION**: Setup detected, awaiting confirmation (requires 2 consecutive signals)
- **OPERATIONAL**: Confirmed signal, ready for trading

**How confirmation works:**
1. The system detects a potential LONG or SHORT setup
2. Waits for at least 2 consecutive signals in the same direction
3. Verifies no contradictions from other factors
4. Only after confirmation does the signal become OPERATIONAL

**Timeframe:**
The system uses 4-hour (4H) candles as the main operational context. This means signals are designed for trades lasting from several hours to several days.`
      },
      {
        id: "sr-levels",
        icon: Activity,
        title: "Support & Resistance",
        content: `**Support and Resistance** levels are calculated from two sources:

**1. Historical Analysis (Pivot Points)**
- Identifies significant highs and lows from 4H candles
- Calculates how many times price touched each level
- Classifies strength: strong (3+ touches), moderate (2), weak (1)

**2. Multi-Exchange Order Book**
- Aggregates data from Kraken, Coinbase, and Bitstamp
- Identifies significant order "walls" (>2.5x average volume)
- Shows where real buying/selling interest exists

**How to interpret:**
- **Strong** levels have high probability of holding
- **Moderate** levels may break with momentum
- **Weak** levels serve as reference but can break easily`
      },
      {
        id: "liquidity-ladder",
        icon: Waves,
        title: "Liquidity Ladder",
        content: `The **Liquidity Ladder** analyzes where liquidity exists in the market and predicts where price might go to "hunt" stops.

**Key concept:** Price tends to move toward liquidity zones to fill orders and liquidate positions.

**Elements analyzed:**
- Liquidity above current price (sell orders)
- Liquidity below current price (buy orders)
- Distance from current price
- Total value in each zone

**Interpretation:**
- **More liquidity above**: Price might rise to hunt short stops
- **More liquidity below**: Price might fall to hunt long stops
- **Balanced**: No clear direction, possible consolidation

**Sweep Expectation:**
The system predicts if there will be a "sweep" (quick move to liquidate positions) before the main move.`
      }
    ],
    tradingGuide: {
      title: "Trading Guide",
      subtitle: "How to use CryptoRadar for BTC trading",
      sections: [
        {
          title: "Interpreting LONG Signals",
          content: `**When the system shows LONG (OPERATIONAL):**

1. **Check Bias**: Should be BULLISH or at least NEUTRAL
2. **Check Confidence**: >65% is good, >75% is strong
3. **Look at Entry Zone**: Suggested range for entry
4. **Set Stop Loss**: Use indicated value (beyond sweep zone)
5. **Plan Targets**: Target 1 for partial, Target 2 for the rest

**When NOT to enter even if it says LONG:**
- Confidence <55%
- Contradictions from whale activity
- High volatility signaled
- Risk/Reward <1.5:1`
        },
        {
          title: "Understanding Confidence",
          content: `**Confidence %** indicates how aligned the factors are:

**90-100%**: All factors agree - very strong signal
**75-89%**: Most agree - reliable signal
**60-74%**: Some factors disagree - proceed with caution
**50-59%**: Mixed signals - reduce size or wait
**<50%**: Too much uncertainty - better NO TRADE

**What lowers confidence:**
- Exchanges disagreeing
- Contrary whale activity
- Extreme funding rate
- Contradictory patterns`
        }
      ]
    },
    downloadPdf: "Download PDF",
    systemManual: "System Manual",
    tradingManual: "Trading Guide",
    operationalRules: {
      title: "Operational Rules",
      subtitle: "5 practical rules for using CryptoRadar effectively",
      rules: [
        {
          number: 1,
          title: "Avoid Weekend Trading",
          icon: "calendar",
          content: `**Rule:** Avoid trading on weekends when possible.

**Why:** Recent data shows high expired rates and weaker signal quality during weekends.

**Evidence from data:**
- Weekend win rate: ~0%
- Weekend expired rate: ~100%
- Weekday win rate: ~50%

**Practical action:** If you see an OPERATIONAL signal during Saturday or Sunday, consider waiting until Monday before acting. Reduced weekend volatility often prevents signals from reaching targets.`
        },
        {
          number: 2,
          title: "Prefer LONG Setups",
          icon: "trending-up",
          content: `**Rule:** Prefer LONG setups over SHORT setups, for now.

**Why:** Current reliability data shows significantly better performance for LONG signals.

**Evidence from data:**
- LONG win rate: ~80%
- SHORT win rate: ~4%
- LONG profit factor: >1
- SHORT profit factor: ~0

**Practical action:** When you see a SHORT signal, treat it with extra caution. You might reduce size or wait for additional confirmations. LONG signals have historically performed much better.

**Note:** This preference may change as we collect more data in different market conditions.`
        },
        {
          number: 3,
          title: "Only OPERATIONAL Signals",
          icon: "check-circle",
          content: `**Rule:** Only enter trades when signal status is OPERATIONAL.

**Why:** "NO TRADE" and "IN CONFIRMATION" states indicate the system hasn't fully validated the setup yet.

**Signal states:**
- **NO TRADE**: No valid setup - DO NOT trade
- **IN CONFIRMATION**: Potential setup but not confirmed - WAIT
- **OPERATIONAL**: Confirmed setup ready - OK to enter

**Practical action:** Before every trade, verify the signal badge shows "OPERATIONAL" (green). If you see "IN CONFIRMATION" (yellow), wait for it to become operational. Entering early increases false signal risk.`
        },
        {
          number: 4,
          title: "Check Urgency and Validity",
          icon: "clock",
          content: `**Rule:** Always check signal_urgency and valid_for_minutes before acting. Don't chase expired or late signals.

**Why:** Every signal has a validity window. Entering too late significantly reduces success probability.

**Indicators to check:**
- **Urgency**: LOW / MEDIUM / HIGH
- **Valid for**: XX minutes remaining
- **Timestamp**: When it was generated

**Practical action:** 
- If urgency is HIGH and few minutes remain, act quickly or skip
- If signal is already "old" by hours, price has likely moved already
- Don't "chase" a trade if price is far from the suggested entry zone`
        },
        {
          number: 5,
          title: "Use Heatmap as Filter",
          icon: "bar-chart",
          content: `**Rule:** Use the reliability heatmap (Reliability Analytics) as a decision filter. If a signal type has weak historical performance, treat it with extra caution.

**Why:** Not all signals are equal. The heatmap shows which combinations (direction + confidence) have worked historically.

**How to use it:**
1. Go to "Reliability Analytics" in the menu
2. Check the Direction × Confidence heatmap
3. Verify the color of the cell matching your signal

**Color interpretation:**
- 🟢 Green (60%+): Reliable combination - proceed
- 🟡 Yellow (40-60%): Caution - reduce size
- 🟠 Orange (20-40%): High risk - consider skipping
- 🔴 Red (<20%): Avoid this combination

**Practical action:** Before every trade, do a quick heatmap check. If your signal's combination is red or orange, you might want to wait for a better opportunity.`
        }
      ]
    }
  },
  de: {
    title: "CryptoRadar Handbuch",
    subtitle: "Komplette Anleitung zum BTC-Trading-Intelligence-System",
    sections: [
      {
        id: "trade-signal",
        icon: Zap,
        title: "Handelssignal",
        content: `Das **Handelssignal** ist das Herzstück von CryptoRadar. Es synthetisiert 9 Intelligence-Faktoren für Trading-Empfehlungen:

**Signal-Zustände:**
- **KEIN HANDEL**: Kein klares Setup erkannt
- **IN BESTÄTIGUNG**: Setup erkannt, warte auf Bestätigung (erfordert 2 aufeinanderfolgende Signale)
- **OPERATIV**: Bestätigtes Signal, bereit zum Handeln

**Wie die Bestätigung funktioniert:**
1. Das System erkennt ein potenzielles LONG- oder SHORT-Setup
2. Wartet auf mindestens 2 aufeinanderfolgende Signale in dieselbe Richtung
3. Überprüft, dass keine Widersprüche von anderen Faktoren vorliegen
4. Erst nach Bestätigung wird das Signal OPERATIV

**Zeitrahmen:**
Das System verwendet 4-Stunden-Kerzen (4H) als Hauptbetriebskontext.`
      }
    ],
    tradingGuide: {
      title: "Trading-Leitfaden",
      subtitle: "Wie man CryptoRadar für BTC-Trading nutzt",
      sections: [
        {
          title: "LONG-Signale interpretieren",
          content: `**Wenn das System LONG (OPERATIV) zeigt:**

1. **Bias prüfen**: Sollte BULLISCH oder zumindest NEUTRAL sein
2. **Konfidenz prüfen**: >65% ist gut, >75% ist stark
3. **Einstiegszone beachten**: Vorgeschlagener Bereich für den Einstieg
4. **Stop Loss setzen**: Verwende den angegebenen Wert (jenseits der Sweep-Zone)
5. **Ziele planen**: Target 1 für Teilverkauf, Target 2 für den Rest`
        }
      ]
    },
    downloadPdf: "PDF herunterladen",
    systemManual: "System-Handbuch",
    tradingManual: "Trading-Leitfaden"
  },
  pl: {
    title: "Podręcznik CryptoRadar",
    subtitle: "Kompletny przewodnik po systemie intelligence tradingowego BTC",
    sections: [
      {
        id: "trade-signal",
        icon: Zap,
        title: "Sygnał Handlowy",
        content: `**Sygnał Handlowy** jest sercem CryptoRadar. Syntetyzuje 9 czynników intelligence do generowania rekomendacji tradingowych:

**Stany Sygnału:**
- **BRAK HANDLU**: Brak wyraźnego setup
- **W POTWIERDZENIU**: Setup wykryty, oczekiwanie na potwierdzenie (wymaga 2 kolejnych sygnałów)
- **OPERACYJNY**: Potwierdzony sygnał, gotowy do tradingu

**Jak działa potwierdzenie:**
1. System wykrywa potencjalny setup LONG lub SHORT
2. Czeka na co najmniej 2 kolejne sygnały w tym samym kierunku
3. Sprawdza brak sprzeczności z innymi czynnikami
4. Dopiero po potwierdzeniu sygnał staje się OPERACYJNY

**Timeframe:**
System używa świec 4-godzinnych (4H) jako głównego kontekstu operacyjnego.`
      }
    ],
    tradingGuide: {
      title: "Przewodnik Tradingowy",
      subtitle: "Jak używać CryptoRadar do tradingu BTC",
      sections: [
        {
          title: "Interpretacja sygnałów LONG",
          content: `**Gdy system pokazuje LONG (OPERACYJNY):**

1. **Sprawdź Bias**: Powinien być BYCZY lub przynajmniej NEUTRALNY
2. **Sprawdź Pewność**: >65% jest dobra, >75% jest silna
3. **Patrz na Strefę Wejścia**: Sugerowany zakres dla wejścia
4. **Ustaw Stop Loss**: Użyj wskazanej wartości (poza strefą sweep)
5. **Planuj Cele**: Target 1 dla części, Target 2 dla reszty`
        }
      ]
    },
    downloadPdf: "Pobierz PDF",
    systemManual: "Podręcznik Systemu",
    tradingManual: "Przewodnik Tradingowy"
  }
};

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-crypto-border rounded-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-crypto-card/60 hover:bg-crypto-card/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5 text-crypto-accent" />}
          <span className="font-heading font-semibold">{title}</span>
        </div>
        {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </button>
      {isOpen && (
        <div className="p-4 bg-crypto-surface/30 prose prose-invert prose-sm max-w-none">
          {children}
        </div>
      )}
    </div>
  );
}

function ManualPage() {
  const { language } = useApp();
  const [activeTab, setActiveTab] = useState('system');
  
  const content = manualContent[language] || manualContent.en;
  const API_URL = process.env.REACT_APP_BACKEND_URL;
  
  const renderMarkdown = (text) => {
    // Simple markdown rendering
    return text.split('\n').map((line, i) => {
      // Bold
      line = line.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-crypto-accent">$1</strong>');
      // Headers
      if (line.startsWith('**') && line.endsWith('**')) {
        return <h4 key={i} className="text-white font-semibold mt-4 mb-2" dangerouslySetInnerHTML={{ __html: line }} />;
      }
      // List items
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return <li key={i} className="ml-4 text-zinc-300" dangerouslySetInnerHTML={{ __html: line.substring(2) }} />;
      }
      // Numbered items
      if (/^\d+\./.test(line)) {
        return <li key={i} className="ml-4 text-zinc-300 list-decimal" dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\.\s*/, '') }} />;
      }
      // Empty line
      if (line.trim() === '') return <br key={i} />;
      // Regular paragraph
      return <p key={i} className="text-zinc-300 mb-2" dangerouslySetInnerHTML={{ __html: line }} />;
    });
  };
  
  return (
    <div className="space-y-6" data-testid="manual-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-crypto-accent" />
          <div>
            <h1 className="text-2xl font-heading font-bold">{content.title}</h1>
            <p className="text-sm text-zinc-500">{content.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`${API_URL}/CRYPTORADAR_SYSTEM_MANUAL_${language.toUpperCase()}.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-crypto-card border border-crypto-border rounded-sm hover:border-crypto-accent transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            {content.systemManual}
          </a>
          <a
            href={`${API_URL}/CRYPTORADAR_TRADING_GUIDE_${language.toUpperCase()}.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-crypto-accent text-black rounded-sm hover:bg-crypto-accent/80 transition-colors text-sm font-semibold"
          >
            <Download className="w-4 h-4" />
            {content.tradingManual}
          </a>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2 border-b border-crypto-border pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('system')}
          className={cn(
            "px-4 py-2 rounded-t-sm transition-colors whitespace-nowrap",
            activeTab === 'system' 
              ? "bg-crypto-card border-b-2 border-crypto-accent text-white" 
              : "text-zinc-400 hover:text-white"
          )}
        >
          {content.systemManual}
        </button>
        <button
          onClick={() => setActiveTab('trading')}
          className={cn(
            "px-4 py-2 rounded-t-sm transition-colors whitespace-nowrap",
            activeTab === 'trading' 
              ? "bg-crypto-card border-b-2 border-crypto-accent text-white" 
              : "text-zinc-400 hover:text-white"
          )}
        >
          {content.tradingManual}
        </button>
        {content.operationalRules && (
          <button
            onClick={() => setActiveTab('rules')}
            className={cn(
              "px-4 py-2 rounded-t-sm transition-colors whitespace-nowrap flex items-center gap-2",
              activeTab === 'rules' 
                ? "bg-crypto-accent text-black font-semibold" 
                : "text-zinc-400 hover:text-white"
            )}
          >
            <ListChecks className="w-4 h-4" />
            {content.operationalRules.title}
          </button>
        )}
      </div>
      
      {/* Content */}
      {activeTab === 'system' && (
        <div className="space-y-3">
          {content.sections.map((section) => (
            <CollapsibleSection
              key={section.id}
              title={section.title}
              icon={section.icon}
              defaultOpen={section.id === 'trade-signal'}
            >
              {renderMarkdown(section.content)}
            </CollapsibleSection>
          ))}
        </div>
      )}
      
      {activeTab === 'trading' && content.tradingGuide && (
        <div className="space-y-3">
          <div className="p-4 bg-crypto-card/60 border border-crypto-border rounded-sm">
            <h3 className="font-heading font-bold text-lg mb-2">{content.tradingGuide.title}</h3>
            <p className="text-sm text-zinc-400">{content.tradingGuide.subtitle}</p>
          </div>
          {content.tradingGuide.sections.map((section, idx) => (
            <CollapsibleSection
              key={idx}
              title={section.title}
              icon={idx === 0 ? TrendingUp : idx === 1 ? TrendingDown : CheckCircle}
              defaultOpen={idx === 0}
            >
              {renderMarkdown(section.content)}
            </CollapsibleSection>
          ))}
        </div>
      )}

      {activeTab === 'rules' && content.operationalRules && (
        <div className="space-y-4">
          {/* Header */}
          <div className="p-4 bg-crypto-accent/10 border border-crypto-accent/30 rounded-sm">
            <div className="flex items-center gap-3 mb-2">
              <ListChecks className="w-6 h-6 text-crypto-accent" />
              <h3 className="font-heading font-bold text-lg text-crypto-accent">{content.operationalRules.title}</h3>
            </div>
            <p className="text-sm text-zinc-400">{content.operationalRules.subtitle}</p>
          </div>

          {/* Rules */}
          {content.operationalRules.rules.map((rule, idx) => {
            const iconMap = {
              'calendar': Clock,
              'trending-up': TrendingUp,
              'check-circle': CheckCircle,
              'clock': Clock,
              'bar-chart': BarChart3
            };
            const IconComponent = iconMap[rule.icon] || CheckCircle;
            
            return (
              <div 
                key={idx}
                className="bg-crypto-card/60 border border-crypto-border rounded-sm overflow-hidden"
              >
                {/* Rule Header */}
                <div className="flex items-center gap-4 p-4 bg-crypto-surface/30 border-b border-crypto-border">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-crypto-accent text-black font-bold text-lg">
                    {rule.number}
                  </div>
                  <div className="flex items-center gap-2">
                    <IconComponent className="w-5 h-5 text-crypto-accent" />
                    <h4 className="font-heading font-semibold text-lg">{rule.title}</h4>
                  </div>
                </div>
                
                {/* Rule Content */}
                <div className="p-4">
                  {renderMarkdown(rule.content)}
                </div>
              </div>
            );
          })}

          {/* Footer Note */}
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-zinc-300">
                <strong className="text-yellow-500">
                  {language === 'it' ? 'Nota Importante' : 'Important Note'}:
                </strong>{' '}
                {language === 'it' 
                  ? 'Queste regole sono basate sui dati storici raccolti finora. Man mano che raccoglieremo più dati in diverse condizioni di mercato, le raccomandazioni potrebbero essere aggiornate. Consulta regolarmente la sezione "Analisi Affidabilità" per i dati più recenti.'
                  : 'These rules are based on historical data collected so far. As we collect more data in different market conditions, recommendations may be updated. Regularly check the "Reliability Analytics" section for the latest data.'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManualPage;
