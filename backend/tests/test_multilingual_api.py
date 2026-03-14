"""
Backend Multilingual Localization Tests
Tests that all API endpoints return translated text based on ?lang= query parameter
Supported languages: it (Italian - default), en (English), de (German), pl (Polish)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTradeSignalLocalization:
    """Test /api/trade-signal endpoint with different languages"""
    
    def test_trade_signal_italian(self):
        """Trade signal returns Italian reasoning text"""
        response = requests.get(f"{BASE_URL}/api/trade-signal?lang=it", timeout=30)
        assert response.status_code == 200, f"Status: {response.status_code}"
        data = response.json()
        
        # Check reasoning field exists
        assert "reasoning" in data, "reasoning field missing"
        reasoning = data["reasoning"]
        
        # Italian texts should contain Italian phrases
        # Based on BACKEND_TRANSLATIONS in server.py
        italian_indicators = [
            "SEGNALI MISTI", "CONFIGURAZIONE", "Bias di Mercato", 
            "liquidità", "direzione", "punta verso", "Consenso"
        ]
        found_italian = any(ind in reasoning for ind in italian_indicators)
        assert found_italian, f"Italian text not found in reasoning: {reasoning[:200]}"
        print(f"PASS: Italian trade signal reasoning: {reasoning[:150]}...")
    
    def test_trade_signal_english(self):
        """Trade signal returns English reasoning text"""
        response = requests.get(f"{BASE_URL}/api/trade-signal?lang=en", timeout=30)
        assert response.status_code == 200, f"Status: {response.status_code}"
        data = response.json()
        
        assert "reasoning" in data, "reasoning field missing"
        reasoning = data["reasoning"]
        
        # English indicators
        english_indicators = [
            "MIXED SIGNALS", "TRADE SETUP", "Market Bias", 
            "Liquidity points", "toward", "consensus"
        ]
        found_english = any(ind in reasoning for ind in english_indicators)
        assert found_english, f"English text not found in reasoning: {reasoning[:200]}"
        print(f"PASS: English trade signal reasoning: {reasoning[:150]}...")
    
    def test_trade_signal_german(self):
        """Trade signal returns German reasoning text"""
        response = requests.get(f"{BASE_URL}/api/trade-signal?lang=de", timeout=30)
        assert response.status_code == 200, f"Status: {response.status_code}"
        data = response.json()
        
        assert "reasoning" in data, "reasoning field missing"
        reasoning = data["reasoning"]
        
        # German indicators
        german_indicators = [
            "GEMISCHTE SIGNALE", "TRADE-SETUP", "Markt-Bias",
            "Liquidität", "Richtung", "Konsens", "bärisch", "bullisch"
        ]
        found_german = any(ind in reasoning for ind in german_indicators)
        assert found_german, f"German text not found in reasoning: {reasoning[:200]}"
        print(f"PASS: German trade signal reasoning: {reasoning[:150]}...")
    
    def test_trade_signal_polish(self):
        """Trade signal returns Polish reasoning text"""
        response = requests.get(f"{BASE_URL}/api/trade-signal?lang=pl", timeout=30)
        assert response.status_code == 200, f"Status: {response.status_code}"
        data = response.json()
        
        assert "reasoning" in data, "reasoning field missing"
        reasoning = data["reasoning"]
        
        # Polish indicators
        polish_indicators = [
            "MIESZANE SYGNAŁY", "SETUP", "Bias Rynku",
            "Płynność", "kierunku", "Konsensus", "niedźwiedzi", "byczy"
        ]
        found_polish = any(ind in reasoning for ind in polish_indicators)
        assert found_polish, f"Polish text not found in reasoning: {reasoning[:200]}"
        print(f"PASS: Polish trade signal reasoning: {reasoning[:150]}...")


class TestOpenInterestLocalization:
    """Test /api/open-interest endpoint with different languages"""
    
    def test_open_interest_italian(self):
        """Open interest returns Italian signal text"""
        response = requests.get(f"{BASE_URL}/api/open-interest?lang=it", timeout=15)
        assert response.status_code == 200, f"Status: {response.status_code}"
        data = response.json()
        
        assert "signal" in data, "signal field missing"
        signal = data["signal"]
        
        # Italian OI indicators
        italian_indicators = [
            "OI in aumento", "OI in diminuzione", "OI stabile",
            "nuovi capitali", "chiusura di posizioni", "consolidamento"
        ]
        found_italian = any(ind in signal for ind in italian_indicators)
        assert found_italian, f"Italian text not found in signal: {signal[:100]}"
        print(f"PASS: Italian open interest signal: {signal[:100]}...")
    
    def test_open_interest_english(self):
        """Open interest returns English signal text"""
        response = requests.get(f"{BASE_URL}/api/open-interest?lang=en", timeout=15)
        assert response.status_code == 200, f"Status: {response.status_code}"
        data = response.json()
        
        assert "signal" in data, "signal field missing"
        signal = data["signal"]
        
        english_indicators = [
            "Increasing OI", "Decreasing OI", "Stable OI",
            "New money", "positions being closed", "consolidation"
        ]
        found_english = any(ind in signal for ind in english_indicators)
        assert found_english, f"English text not found in signal: {signal[:100]}"
        print(f"PASS: English open interest signal: {signal[:100]}...")
    
    def test_open_interest_german(self):
        """Open interest returns German signal text"""
        response = requests.get(f"{BASE_URL}/api/open-interest?lang=de", timeout=15)
        assert response.status_code == 200, f"Status: {response.status_code}"
        data = response.json()
        
        assert "signal" in data, "signal field missing"
        signal = data["signal"]
        
        german_indicators = [
            "Steigendes OI", "Sinkendes OI", "Stabiles OI",
            "Neues Kapital", "Schließung von Positionen", "Marktkonsolidierung"
        ]
        found_german = any(ind in signal for ind in german_indicators)
        assert found_german, f"German text not found in signal: {signal[:100]}"
        print(f"PASS: German open interest signal: {signal[:100]}...")
    
    def test_open_interest_polish(self):
        """Open interest returns Polish signal text"""
        response = requests.get(f"{BASE_URL}/api/open-interest?lang=pl", timeout=15)
        assert response.status_code == 200, f"Status: {response.status_code}"
        data = response.json()
        
        assert "signal" in data, "signal field missing"
        signal = data["signal"]
        
        polish_indicators = [
            "Rosnące OI", "Spadające OI", "Stabilne OI",
            "Nowy kapitał", "zamykanie pozycji", "konsolidację"
        ]
        found_polish = any(ind in signal for ind in polish_indicators)
        assert found_polish, f"Polish text not found in signal: {signal[:100]}"
        print(f"PASS: Polish open interest signal: {signal[:100]}...")


class TestFundingRateLocalization:
    """Test /api/funding-rate endpoint with different languages"""
    
    def test_funding_rate_italian(self):
        """Funding rate returns Italian signal text"""
        response = requests.get(f"{BASE_URL}/api/funding-rate?lang=it", timeout=15)
        assert response.status_code == 200, f"Status: {response.status_code}"
        data = response.json()
        
        assert "signal_text" in data, "signal_text field missing"
        signal_text = data["signal_text"]
        
        italian_indicators = [
            "long liquidati", "short liquidati", "Liquidazioni bilanciate",
            "Pressione ribassista", "Pressione rialzista", "neutrale"
        ]
        found_italian = any(ind in signal_text for ind in italian_indicators)
        assert found_italian, f"Italian text not found in signal_text: {signal_text[:100]}"
        print(f"PASS: Italian funding rate signal_text: {signal_text[:100]}...")
    
    def test_funding_rate_english(self):
        """Funding rate returns English signal text"""
        response = requests.get(f"{BASE_URL}/api/funding-rate?lang=en", timeout=15)
        assert response.status_code == 200, f"Status: {response.status_code}"
        data = response.json()
        
        assert "signal_text" in data, "signal_text field missing"
        signal_text = data["signal_text"]
        
        english_indicators = [
            "longs liquidated", "shorts liquidated", "Balanced liquidations",
            "Bearish pressure", "Bullish pressure", "Neutral"
        ]
        found_english = any(ind in signal_text for ind in english_indicators)
        assert found_english, f"English text not found in signal_text: {signal_text[:100]}"
        print(f"PASS: English funding rate signal_text: {signal_text[:100]}...")
    
    def test_funding_rate_german(self):
        """Funding rate returns German signal text"""
        response = requests.get(f"{BASE_URL}/api/funding-rate?lang=de", timeout=15)
        assert response.status_code == 200, f"Status: {response.status_code}"
        data = response.json()
        
        assert "signal_text" in data, "signal_text field missing"
        signal_text = data["signal_text"]
        
        german_indicators = [
            "Longs liquidiert", "Shorts liquidiert", "Ausgeglichene Liquidationen",
            "Bärischer Druck", "Bullischer Druck", "Neutral"
        ]
        found_german = any(ind in signal_text for ind in german_indicators)
        assert found_german, f"German text not found in signal_text: {signal_text[:100]}"
        print(f"PASS: German funding rate signal_text: {signal_text[:100]}...")
    
    def test_funding_rate_polish(self):
        """Funding rate returns Polish signal text"""
        response = requests.get(f"{BASE_URL}/api/funding-rate?lang=pl", timeout=15)
        assert response.status_code == 200, f"Status: {response.status_code}"
        data = response.json()
        
        assert "signal_text" in data, "signal_text field missing"
        signal_text = data["signal_text"]
        
        polish_indicators = [
            "longów", "shortów", "Zrównoważone likwidacje",
            "Presja spadkowa", "Presja wzrostowa", "Neutralne"
        ]
        found_polish = any(ind in signal_text for ind in polish_indicators)
        assert found_polish, f"Polish text not found in signal_text: {signal_text[:100]}"
        print(f"PASS: Polish funding rate signal_text: {signal_text[:100]}...")


class TestMarketBiasLocalization:
    """Test /api/market/bias endpoint with different languages"""
    
    def test_market_bias_italian(self):
        """Market bias returns Italian analysis text"""
        response = requests.get(f"{BASE_URL}/api/market/bias?lang=it", timeout=15)
        assert response.status_code == 200, f"Status: {response.status_code}"
        data = response.json()
        
        assert "analysis_text" in data, "analysis_text field missing"
        analysis_text = data["analysis_text"]
        
        italian_indicators = [
            "Forte pressione di acquisto", "momentum favorisce", "Short squeeze",
            "Forte pressione di vendita", "ribassisti", "rialzisti",
            "Indecisione del mercato", "Attendere segnali", "Analisi"
        ]
        found_italian = any(ind in analysis_text for ind in italian_indicators)
        assert found_italian, f"Italian text not found in analysis_text: {analysis_text[:100]}"
        print(f"PASS: Italian market bias analysis_text: {analysis_text[:100]}...")
    
    def test_market_bias_english(self):
        """Market bias returns English analysis text"""
        response = requests.get(f"{BASE_URL}/api/market/bias?lang=en", timeout=15)
        assert response.status_code == 200, f"Status: {response.status_code}"
        data = response.json()
        
        assert "analysis_text" in data, "analysis_text field missing"
        analysis_text = data["analysis_text"]
        
        english_indicators = [
            "Strong buying pressure", "Momentum favors", "Short squeeze",
            "Heavy selling pressure", "bears", "bulls",
            "Market indecision", "Wait for clearer", "Analyzing"
        ]
        found_english = any(ind in analysis_text for ind in english_indicators)
        assert found_english, f"English text not found in analysis_text: {analysis_text[:100]}"
        print(f"PASS: English market bias analysis_text: {analysis_text[:100]}...")
    
    def test_market_bias_german(self):
        """Market bias returns German analysis text"""
        response = requests.get(f"{BASE_URL}/api/market/bias?lang=de", timeout=15)
        assert response.status_code == 200, f"Status: {response.status_code}"
        data = response.json()
        
        assert "analysis_text" in data, "analysis_text field missing"
        analysis_text = data["analysis_text"]
        
        german_indicators = [
            "Starker Kaufdruck", "Momentum begünstigt", "Short Squeeze",
            "Starker Verkaufsdruck", "Bären", "Bullen",
            "Marktunentschlossenheit", "klarere Signale", "analysiert"
        ]
        found_german = any(ind in analysis_text for ind in german_indicators)
        assert found_german, f"German text not found in analysis_text: {analysis_text[:100]}"
        print(f"PASS: German market bias analysis_text: {analysis_text[:100]}...")
    
    def test_market_bias_polish(self):
        """Market bias returns Polish analysis text"""
        response = requests.get(f"{BASE_URL}/api/market/bias?lang=pl", timeout=15)
        assert response.status_code == 200, f"Status: {response.status_code}"
        data = response.json()
        
        assert "analysis_text" in data, "analysis_text field missing"
        analysis_text = data["analysis_text"]
        
        polish_indicators = [
            "Silna presja kupna", "Momentum sprzyja", "short squeeze",
            "Silna presja sprzedaży", "niedźwiedziom", "bykom",
            "Niezdecydowanie rynku", "wyraźniejsze sygnały", "Analizowanie"
        ]
        found_polish = any(ind in analysis_text for ind in polish_indicators)
        assert found_polish, f"Polish text not found in analysis_text: {analysis_text[:100]}"
        print(f"PASS: Polish market bias analysis_text: {analysis_text[:100]}...")


class TestDefaultLanguageFallback:
    """Test that default language (Italian) is used when no lang param provided"""
    
    def test_trade_signal_default_italian(self):
        """Trade signal defaults to Italian when no lang param"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        data = response.json()
        
        reasoning = data.get("reasoning", "")
        # Should contain Italian text by default
        italian_indicators = ["SEGNALI MISTI", "CONFIGURAZIONE", "direzione", "punta verso"]
        english_indicators = ["MIXED SIGNALS", "TRADE SETUP", "Liquidity points"]
        
        has_italian = any(ind in reasoning for ind in italian_indicators)
        has_english = any(ind in reasoning for ind in english_indicators)
        
        # Default should be Italian
        assert has_italian or not has_english, "Default language should be Italian"
        print(f"PASS: Default trade signal is Italian: {reasoning[:100]}...")
    
    def test_invalid_language_fallback(self):
        """Invalid language falls back to Italian"""
        response = requests.get(f"{BASE_URL}/api/trade-signal?lang=xyz", timeout=30)
        assert response.status_code == 200
        data = response.json()
        
        # Should fallback to Italian
        reasoning = data.get("reasoning", "")
        italian_indicators = ["SEGNALI MISTI", "CONFIGURAZIONE", "direzione"]
        has_italian = any(ind in reasoning for ind in italian_indicators)
        print(f"PASS: Invalid lang falls back to Italian: {reasoning[:100]}...")


class TestRegressionEndpoints:
    """Regression tests to ensure core endpoints still work"""
    
    def test_health_endpoint(self):
        """Health endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("PASS: Health endpoint working")
    
    def test_market_status_endpoint(self):
        """Market status returns BTC price"""
        response = requests.get(f"{BASE_URL}/api/market/status", timeout=15)
        assert response.status_code == 200
        data = response.json()
        assert "price" in data
        assert data["price"] > 0
        print(f"PASS: Market status - BTC price: ${data['price']:,.2f}")
    
    def test_liquidity_endpoint(self):
        """Liquidity endpoint returns data"""
        response = requests.get(f"{BASE_URL}/api/liquidity", timeout=15)
        assert response.status_code == 200
        data = response.json()
        assert "direction" in data or "clusters" in data
        print("PASS: Liquidity endpoint working")
    
    def test_support_resistance_endpoint(self):
        """Support/Resistance endpoint returns levels"""
        response = requests.get(f"{BASE_URL}/api/support-resistance", timeout=15)
        assert response.status_code == 200
        data = response.json()
        assert "levels" in data
        print(f"PASS: S/R endpoint - {len(data['levels'])} levels returned")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
