# CryptoRadar - Manuale Operativo
## Guida per il Trader all'Intelligence di Mercato BTC

**Versione:** 1.7  
**Timeframe Principale:** 4H (4 Ore)  
**Ultimo Aggiornamento:** Dicembre 2025

---

## Indice

1. [Introduzione](#introduzione)
2. [Comprendere il Segnale Operativo](#comprendere-il-segnale-operativo)
3. [Moduli di Intelligence](#moduli-di-intelligence)
4. [Leggere un Segnale Completo](#leggere-un-segnale-completo)
5. [Linee Guida Operative](#linee-guida-operative)
6. [Il Timeframe 4H](#il-timeframe-4h)
7. [Gestione del Rischio](#gestione-del-rischio)

---

## Introduzione

CryptoRadar è un sistema professionale di intelligence di mercato BTC progettato per analizzare molteplici segnali di mercato e sintetizzarli in raccomandazioni di trading azionabili. Il sistema opera sul **timeframe a 4 ore (4H)**, rendendolo adatto allo swing trading e alla gestione delle posizioni.

### Cosa Fa CryptoRadar

- Aggrega dati dell'order book da **3 exchange** (Kraken, Coinbase, Bitstamp)
- Analizza dati dei derivati da **CoinGlass** (Open Interest, Funding Rate, Liquidazioni)
- Rileva pattern di attività istituzionale (balene)
- Mappa i livelli di liquidità sopra e sotto il prezzo corrente
- Produce una raccomandazione finale **LONG / SHORT / NESSUNA OPERAZIONE**

### Cosa NON Fa CryptoRadar

- Eseguire trade automaticamente (richiesta esecuzione manuale)
- Garantire trade profittevoli (tutto il trading comporta rischi)
- Sostituire l'analisi fondamentale o la consapevolezza delle notizie
- Funzionare per timeframe diversi dal 4H senza aggiustamenti

---

## Comprendere il Segnale Operativo

Il **Segnale Operativo** è l'output centrale di CryptoRadar. Sintetizza tutti i moduli di intelligence in una raccomandazione azionabile.

### Direzioni del Segnale

| Direzione | Significato | Azione |
|-----------|-------------|--------|
| **LONG** | Setup rialzista rilevato | Considerare l'apertura di una posizione long |
| **SHORT** | Setup ribassista rilevato | Considerare l'apertura di una posizione short |
| **NESSUNA OPERAZIONE** | Edge insufficiente | Rimanere flat, attendere setup più chiari |

### Percentuale di Fiducia

La **Fiducia %** indica quanto fortemente i fattori si allineano in una direzione.

| Fiducia | Interpretazione |
|---------|-----------------|
| **80-95%** | Allineamento forte - setup ad alta convinzione |
| **65-79%** | Allineamento moderato - setup accettabile |
| **50-64%** | Allineamento debole - procedere con cautela |
| **Sotto 50%** | Molto debole - tipicamente NESSUNA OPERAZIONE |

**Importante:** Un'alta fiducia NON garantisce che il trade funzionerà. Indica l'allineamento dei fattori, non l'accuratezza della previsione.

### Calcolo della Zona di Entrata

La **Zona di Entrata** fornisce un range di prezzo per l'ingresso in posizione:

- **Per segnali LONG:**
  - Zona Entrata Bassa = Supporto più vicino
  - Zona Entrata Alta = Prezzo corrente
  - *Interpretazione:* Cercare di entrare tra il supporto e il prezzo corrente

- **Per segnali SHORT:**
  - Zona Entrata Bassa = Prezzo corrente
  - Zona Entrata Alta = Resistenza più vicina
  - *Interpretazione:* Cercare di entrare tra il prezzo corrente e la resistenza

### Posizionamento Smart dello Stop Loss (Protezione Sweep)

CryptoRadar utilizza un **posizionamento intelligente dello stop loss** progettato per sopravvivere agli sweep di liquidità:

#### Il Problema degli Stop Ovvi
La maggior parte dei trader posiziona gli stop appena sotto il supporto (per i long) o sopra la resistenza (per gli short). I market maker lo sanno e spesso "spazzano" questi livelli prima del vero movimento.

#### La Soluzione di CryptoRadar
1. **Identificare la zona di stop ovvia** - dove la maggior parte dei trader ha gli stop
2. **Calcolare la zona di sweep** - 0.3% oltre il livello ovvio
3. **Posizionare lo stop oltre la zona di sweep** - usando il secondo livello S/R come vera invalidazione

**Esempio (LONG):**
```
Prezzo Corrente:       $70,000
Primo Supporto:        $69,500 (zona di stop ovvia)
Zona Sweep:            $69,291 (0.3% sotto il primo supporto)
Secondo Supporto:      $68,800
Stop Intelligente:     $68,456 (0.5% sotto il secondo supporto)
```

Questo approccio significa:
- Il tuo stop sopravvive alla maggior parte degli sweep di liquidità
- Esci solo quando la struttura è veramente rotta
- Stop più ampi richiedono size di posizione più piccole

### Calcolo dei Target

I target si basano sulla prossima resistenza significativa (per i long) o supporto (per gli short):

- **Target 1:** Primo livello importante nella direzione del trade
- **Target 2:** Secondo livello importante (per lo scaling out)

Il **Rapporto Rischio/Rendimento** è calcolato come:
```
R:R = (Target 1 - Entrata) / (Entrata - Stop Loss)
```

| Rapporto R:R | Qualità |
|--------------|---------|
| ≥ 2.0:1 | Buono - rapporto rischio/rendimento favorevole |
| 1.5-2.0:1 | Accettabile - procedere con disciplina |
| < 1.5:1 | Scarso - riconsiderare o saltare |

### Filtro Movimento Minimo (≥ 0.50%)

CryptoRadar NON genererà un segnale LONG o SHORT se il movimento atteso verso il Target 1 è inferiore allo **0.50%**.

**Perché è importante:**
- BTC comunemente si muove dello 0.3-0.5% solo per rumore
- Dopo commissioni e slippage, movimenti sotto lo 0.5% raramente generano profitto
- Questo filtro previene il "trading del rumore"

**Se vedi:** "Movimento troppo piccolo: 0.35% < 0.50% minimo"  
**Significato:** Il setup potrebbe essere tecnicamente valido, ma il potenziale rendimento non giustifica il rischio.

---

## Moduli di Intelligence

### Bias di Mercato

**Cosa misura:** Il sentiment generale del mercato basato sullo squilibrio dell'order book e sulla recente price action.

| Bias | Significato |
|------|-------------|
| RIALZISTA | Più pressione di acquisto che di vendita |
| RIBASSISTA | Più pressione di vendita che di acquisto |
| NEUTRALE | Mercato bilanciato o indeciso |

**Metriche Chiave:**
- **Fiducia %** - Forza del bias
- **Consenso Exchange** - Breakdown per exchange (Kraken/Coinbase/Bitstamp)
- **Prossimo Target** - Livello di prezzo verso cui punta il bias

**Come usarlo:**
- Bias RIALZISTA supporta segnali LONG
- Bias RIBASSISTA supporta segnali SHORT
- NEUTRALE suggerisce di attendere o aspettarsi lateralità

### Direzione Liquidità

**Cosa misura:** Dove il prezzo è probabile che si muova basandosi sulla distribuzione della liquidità.

| Direzione | Significato |
|-----------|-------------|
| SU | Più liquidità sopra - prezzo attratto verso l'alto |
| GIÙ | Più liquidità sotto - prezzo attratto verso il basso |
| BILANCIATO | Liquidità simile su entrambi i lati |

**Principio:** Il prezzo tende a cercare la liquidità. Se c'è significativamente più liquidità sopra, il prezzo spesso si muove verso l'alto per "riempire" quella liquidità prima di invertire.

### Scala Liquidità (Liquidity Ladder)

**Cosa misura:** La sequenza dei livelli di liquidità sopra e sotto il prezzo corrente.

**Componenti:**
- **Livelli Sopra** - Livelli di resistenza/liquidità di vendita classificati per distanza
- **Livelli Sotto** - Livelli di supporto/liquidità di acquisto classificati per distanza
- **Lato Più Attraente** - Quale lato ha più liquidità da spazzare
- **Aspettativa Sweep** - Direzione di sweep prevista prima del vero movimento

| Aspettativa Sweep | Significato |
|-------------------|-------------|
| sweep_sopra_prima | Prezzo probabile che schizzi su prima di muoversi giù |
| sweep_sotto_prima | Prezzo probabile che scenda prima di muoversi su |
| nessun_sweep_chiaro | Nessun setup di sweep ovvio |
| bilanciato | Distribuzione di liquidità equilibrata |

**Come usarlo:**
- Se ti aspetti "sweep_sotto_prima" e vuoi andare LONG, attendi lo sweep prima di entrare
- L'aspettativa di sweep aiuta con il timing dell'entrata

### Attività Balene

**Cosa misura:** Attività istituzionale o di grandi trader basata su volume, order book e dati di liquidazione.

| Direzione | Significato |
|-----------|-------------|
| ACQUISTO | I grandi player stanno accumulando |
| VENDITA | I grandi player stanno distribuendo |
| NEUTRALE | Nessun bias istituzionale chiaro |

**Indicatori Chiave:**
- **Forza %** - Quanto è forte l'attività delle balene (0-100)
- **Pressione Acquisto** - Punteggio dei segnali di acquisto (0-100)
- **Pressione Vendita** - Punteggio dei segnali di vendita (0-100)
- **Picco Volume** - Se il volume corrente è 2.5x+ la media
- **Bias Liquidazioni** - Se i long o gli short vengono liquidati
- **Aggressività Order Book** - Acquisto o vendita aggressiva nell'order book

**Come usarlo:**
- Balene in ACQUISTO durante un segnale LONG = conferma
- Balene in VENDITA durante un segnale LONG = cautela
- Picco di volume + allineamento direzionale = maggiore convinzione

### Supporto e Resistenza

**Cosa misura:** Livelli di prezzo chiave dove storicamente si è verificata pressione di acquisto o vendita.

**Tipi di Livello:**
| Tipo | Fonte | Affidabilità |
|------|-------|--------------|
| 4H | Rilevamento pivot di prezzo | Reazione storica del prezzo |
| Multi-Exchange | Muri dell'order book | Liquidità corrente |

**Valutazioni di Forza:**
| Forza | Significato |
|-------|-------------|
| Forte | Multipli tocchi, alto volume |
| Moderato | Un po' di storia o volume moderato |
| Debole | Singolo tocco, può rompersi facilmente |

### Open Interest (CoinGlass)

**Cosa misura:** Valore totale dei contratti futures aperti.

**Tendenze:**
| Tendenza OI | Con Prezzo in Salita | Con Prezzo in Discesa |
|-------------|---------------------|----------------------|
| In Aumento | Nuovi long in entrata (rialzista) | Nuovi short in entrata (ribassista) |
| In Diminuzione | Long che prendono profitto | Short che ricoprono |
| Stabile | Consolidamento | Consolidamento |

### Funding Rate (CoinGlass)

**Cosa misura:** Il pagamento periodico tra trader long e short nei futures perpetui.

| Funding Rate | Pagante | Sentiment di Mercato |
|--------------|---------|---------------------|
| Positivo | Long pagano short | Rialzista (long affollati) |
| Negativo | Short pagano long | Ribassista (short affollati) |
| Vicino a zero | Bilanciato | Neutrale |

**Letture Estreme:**
- **Molto positivo (>0.05%)** - Long sovraffollati, potenziale squeeze GIÙ
- **Molto negativo (<-0.05%)** - Short sovraffollati, potenziale squeeze SU

---

## Leggere un Segnale Completo

### Esempio di Analisi del Segnale

```
═══════════════════════════════════════════════════
SEGNALE OPERATIVO: LONG
═══════════════════════════════════════════════════

Direzione:            LONG
Fiducia:              72%
Tipo Setup:           SWEEP_REVERSAL
Movimento Atteso:     +2.35%

Zona Entrata:         $69,200 - $69,450
Stop Intelligente:    $68,150
Target 1:             $71,000
Target 2:             $72,500
Rischio/Rendimento:   2.4:1

ZONA SWEEP LIQUIDITÀ:
Zona Caccia Stop:     $69,050
Invalidazione Sicura: $68,150

FATTORI:
• Bias di Mercato: RIALZISTA (+3/3)
• Liquidità: SU (+2/2)
• Consenso Exchange: 3/3 rialzista (+2/2)
• Funding Rate: Neutrale (0/1)
• Open Interest: In Aumento (+1/1)
• Pattern: Higher Low rilevato (+1/2)
• Attività Balene: ACQUISTO (+2/2)
• Scala Liquidità: Sotto (+1/1)

Punteggio Totale: +12/15

RAGIONAMENTO:
Forte allineamento rialzista attraverso i fattori. Prezzo in
avvicinamento al supporto $69,200 con forte liquidità bid.
Sweep atteso a $69,050 prima della continuazione verso l'alto.
Attendere che il prezzo recuperi $69,200 dopo lo sweep per
conferma dell'entrata.

AVVERTENZE:
⚠️ Sweep atteso: Il prezzo potrebbe scendere a $69,050 prima di salire
═══════════════════════════════════════════════════
```

### Piano di Esecuzione
1. Imposta alert a $69,050 (zona sweep)
2. Attendi che il prezzo spazzi sotto $69,200
3. Entra quando il prezzo recupera $69,200
4. Stop loss a $68,150
5. Prendi profitto parziale a $71,000
6. Trail il resto verso $72,500

---

## Linee Guida Operative

### Quando il Segnale Mostra: LONG

**Fai:**
- Identifica la zona di entrata
- Nota l'avvertenza di sweep se presente
- Calcola la size della posizione basata sulla distanza dello stop
- Imposta alert per i livelli di entrata e stop
- Attendi conferma dell'entrata se sweep atteso

**Non Fare:**
- Entrare immediatamente senza controllare l'aspettativa di sweep
- Usare uno stop più stretto di quello raccomandato (rischio sweep)
- Sovralevarti basandoti sull'alta fiducia

### Quando il Segnale Mostra: SHORT

**Fai:**
- Stesso processo del LONG ma invertito
- Presta attenzione al funding rate (short affollati = rischio squeeze)
- Nota che BTC ha un bias rialzista a lungo termine (short sono contro-trend)

**Non Fare:**
- Shortare in condizioni di ipervenduto
- Ignorare gli avvertimenti di short squeeze
- Tenere short attraverso candele rialziste ad alto volume

### Quando il Segnale Mostra: NESSUNA OPERAZIONE

**Fai:**
- Rimanere flat e preservare il capitale
- Rivedere perché non c'è segnale (fattori misti? movimento piccolo?)
- Impostare alert per quando le condizioni cambiano
- Usare il tempo per analizzare il mercato senza pressione

**Non Fare:**
- Forzare un trade perché ti annoi
- Sovrascrivere il sistema con il tuo bias
- Assumere che NESSUNA OPERAZIONE significa "non sta succedendo nulla"

### Quando il Segnale Mostra: Sweep Atteso

**Cosa significa:** Il prezzo probabilmente attiverà gli stop loss a un livello ovvio prima del vero movimento.

**Fai:**
- Attendi che lo sweep si completi
- Entra dopo che il prezzo recupera il livello
- Usa lo stop intelligente (oltre la zona di sweep)

**Non Fare:**
- Entrare prima dello sweep
- Posizionare stop a livelli ovvi
- Farti prendere dal panico se il prezzo spazza la tua entrata prevista

### Quando il Segnale Mostra: Alto Rischio Trappola

**Cosa significa:** Il setup potrebbe essere un falso segnale progettato per intrappolare i trader.

**Fai:**
- Riduci la size della posizione
- Usa stop più ampi
- Attendi conferma aggiuntiva
- Considera di saltare completamente il trade

---

## Il Timeframe 4H

### Perché 4H?

CryptoRadar è calibrato per il **timeframe a 4 ore** perché:

1. **Riduzione del Rumore** - Le candele 4H filtrano il rumore intraday
2. **Movimenti Significativi** - I livelli 4H rappresentano struttura di mercato significativa
3. **Monitoraggio Gestibile** - Devi controllare solo ogni 4 ore
4. **Swing Trading** - Adatto per tenere posizioni da giorni a settimane
5. **Pronto per Bot** - I segnali cambiano abbastanza lentamente per l'automazione

### Validità del Segnale

Ogni segnale operativo è valido per circa **4 ore** (fino alla chiusura della prossima candela 4H).

**Timing dei Controlli:**
- Nuova candela 4H: 00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC
- Meglio valutare i segnali poco dopo l'apertura di una nuova candela

---

## Gestione del Rischio

### Dimensionamento della Posizione

**Non rischiare mai più dell'1-2% del tuo conto su un singolo trade.**

Formula:
```
Size Posizione = (Conto × Rischio %) / (Entrata - Stop Loss)

Esempio:
Conto:          $10,000
Rischio:        1% ($100)
Entrata:        $70,000
Stop:           $68,500 (2.14% di distanza)

Posizione = $100 / ($70,000 - $68,500)
Posizione = $100 / $1,500
Posizione = 0.067 BTC ($4,690 a $70,000)
```

### Esposizione Massima

- **Singolo trade:** Max 1-2% di rischio sul conto
- **Rischio totale aperto:** Max 5% su tutte le posizioni
- **Correlazione:** I trade BTC sono 100% correlati - non impilare

### Disciplina dello Stop Loss

- **Usa sempre gli stop** - Nessuna eccezione
- **Usa lo stop intelligente** - Non avvicinarlo
- **Accetta le perdite** - Fanno parte del trading

---

## Scheda di Riferimento Rapido

```
╔═══════════════════════════════════════════════════════════════╗
║            CRYPTORADAR - RIFERIMENTO RAPIDO                   ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  AZIONI SUI SEGNALI:                                          ║
║  • LONG + Alta Fid. + Buon R:R = Setup forte di acquisto      ║
║  • SHORT + Alta Fid. + Buon R:R = Setup forte di vendita      ║
║  • NESSUNA OPERAZIONE = Attendi, preserva capitale            ║
║                                                               ║
║  REGOLE DI ENTRATA:                                           ║
║  • Controlla aspettativa sweep prima di entrare               ║
║  • Entra nella zona di entrata, non agli estremi              ║
║  • Se sweep atteso, attendi conferma del recupero             ║
║                                                               ║
║  REGOLE DI STOP:                                              ║
║  • Usa lo stop intelligente (oltre la zona sweep)             ║
║  • Mai avvicinare lo stop                                     ║
║  • Accetta gli stop-out come costo del business               ║
║                                                               ║
║  REGOLE DI PROFITTO:                                          ║
║  • Prendi parziale al Target 1                                ║
║  • Trail il resto verso Target 2                              ║
║  • Non essere avido oltre il Target 2                         ║
║                                                               ║
║  REGOLE DI RISCHIO:                                           ║
║  • Max 1-2% per trade                                         ║
║  • Max 5% esposizione totale                                  ║
║  • Calcola la size PRIMA di entrare                           ║
║                                                               ║
║  TIMEFRAME: 4H - Controlla i segnali ogni 4 ore               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

*Versione Documento: 1.7*  
*Sistema: CryptoRadar BTC Intelligence*  
*Disclaimer: Il trading comporta rischi sostanziali. Le performance passate non garantiscono risultati futuri. Usa questo sistema come uno degli input nelle tue decisioni di trading, non come unica base per operare.*
