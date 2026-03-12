"""
CryptoRadar API Tests - CoinGlass Integration
Tests for verifying CoinGlass API integration for Open Interest, Funding Rate, and Liquidity data
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndBasics:
    """Health check and basic API tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "CryptoRadar API"
        assert data["version"] == "1.1.0"
        print(f"Health check passed: {data['status']}, version: {data['version']}")

    def test_market_status(self):
        """Test market status returns real Kraken data"""
        response = requests.get(f"{BASE_URL}/api/market/status")
        assert response.status_code == 200
        data = response.json()
        assert data["symbol"] == "BTCUSDT"
        assert data["price"] > 0
        assert data["status"] == "LIVE"
        assert data["data_source"] == "Kraken"
        print(f"Market status: ${data['price']}, source: {data['data_source']}")


class TestOpenInterestEndpoint:
    """Tests for /api/open-interest endpoint - CoinGlass integration"""
    
    def test_open_interest_returns_data(self):
        """Test open-interest endpoint returns valid data"""
        response = requests.get(f"{BASE_URL}/api/open-interest")
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields exist
        assert "total_oi" in data
        assert "change_1h" in data
        assert "change_4h" in data
        assert "change_24h" in data
        assert "trend" in data
        assert "exchanges" in data
        assert "signal" in data
        assert "data_source" in data
        
        print(f"Open Interest: ${data['total_oi']}B, source: {data['data_source']}")
        
    def test_open_interest_data_source_is_coinglass(self):
        """Verify data_source is 'CoinGlass' indicating real API integration"""
        response = requests.get(f"{BASE_URL}/api/open-interest")
        assert response.status_code == 200
        data = response.json()
        
        # CRITICAL: Verify CoinGlass integration is working
        assert data["data_source"] == "CoinGlass", f"Expected CoinGlass but got {data['data_source']}"
        print(f"CoinGlass integration verified: data_source={data['data_source']}")
    
    def test_open_interest_total_oi_reasonable(self):
        """Verify total OI is in reasonable range (billions of USD)"""
        response = requests.get(f"{BASE_URL}/api/open-interest")
        assert response.status_code == 200
        data = response.json()
        
        # BTC total OI typically ranges from 30B to 100B
        total_oi = data["total_oi"]
        assert total_oi > 20, f"Total OI ${total_oi}B seems too low"
        assert total_oi < 200, f"Total OI ${total_oi}B seems too high"
        print(f"Total OI validation passed: ${total_oi}B")
    
    def test_open_interest_change_percentages(self):
        """Verify change percentages are numeric and reasonable"""
        response = requests.get(f"{BASE_URL}/api/open-interest")
        assert response.status_code == 200
        data = response.json()
        
        # Verify percentages are numbers
        assert isinstance(data["change_1h"], (int, float))
        assert isinstance(data["change_4h"], (int, float))
        assert isinstance(data["change_24h"], (int, float))
        
        # Verify percentages are in reasonable range (-50% to +50%)
        assert -50 < data["change_1h"] < 50
        assert -50 < data["change_4h"] < 50
        assert -50 < data["change_24h"] < 50
        
        print(f"OI Changes - 1h: {data['change_1h']}%, 4h: {data['change_4h']}%, 24h: {data['change_24h']}%")
    
    def test_open_interest_exchanges_distribution(self):
        """Verify exchange distribution data"""
        response = requests.get(f"{BASE_URL}/api/open-interest")
        assert response.status_code == 200
        data = response.json()
        
        exchanges = data["exchanges"]
        assert len(exchanges) > 0, "Should have exchange distribution data"
        
        # Verify structure
        for ex in exchanges:
            assert "name" in ex
            assert "oi" in ex
            assert "share" in ex
        
        # Verify total share approximately equals 100%
        total_share = sum(ex["share"] for ex in exchanges)
        assert 95 <= total_share <= 105, f"Total share should be ~100%, got {total_share}%"
        
        print(f"Exchange distribution: {len(exchanges)} exchanges, total share: {total_share}%")
    
    def test_open_interest_trend_values(self):
        """Verify trend is one of expected values"""
        response = requests.get(f"{BASE_URL}/api/open-interest")
        assert response.status_code == 200
        data = response.json()
        
        valid_trends = ["increasing", "decreasing", "stable"]
        assert data["trend"] in valid_trends, f"Unexpected trend: {data['trend']}"
        print(f"Trend validation passed: {data['trend']}")


class TestFundingRateEndpoint:
    """Tests for /api/funding-rate endpoint - CoinGlass liquidation-derived data"""
    
    def test_funding_rate_returns_data(self):
        """Test funding-rate endpoint returns valid data"""
        response = requests.get(f"{BASE_URL}/api/funding-rate")
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields exist
        assert "current_rate" in data
        assert "annualized_rate" in data
        assert "payer" in data
        assert "sentiment" in data
        assert "signal_text" in data
        assert "data_source" in data
        
        print(f"Funding Rate: {data['current_rate']}, source: {data['data_source']}")
    
    def test_funding_rate_data_source_is_coinglass_derived(self):
        """Verify data_source indicates CoinGlass liquidation-derived data"""
        response = requests.get(f"{BASE_URL}/api/funding-rate")
        assert response.status_code == 200
        data = response.json()
        
        # CRITICAL: Verify CoinGlass integration
        assert "CoinGlass" in data["data_source"], f"Expected CoinGlass source but got {data['data_source']}"
        print(f"CoinGlass funding integration verified: {data['data_source']}")
    
    def test_funding_rate_values_reasonable(self):
        """Verify funding rate values are in reasonable range"""
        response = requests.get(f"{BASE_URL}/api/funding-rate")
        assert response.status_code == 200
        data = response.json()
        
        # Funding rate typically ranges from -0.5% to +0.5% per 8h
        current_rate = data["current_rate"]
        assert -0.01 < current_rate < 0.03, f"Funding rate {current_rate} seems unreasonable"
        
        print(f"Funding rate validation: {current_rate} ({current_rate*100:.4f}%)")
    
    def test_funding_rate_payer_valid(self):
        """Verify payer field is valid"""
        response = requests.get(f"{BASE_URL}/api/funding-rate")
        assert response.status_code == 200
        data = response.json()
        
        valid_payers = ["longs", "shorts"]
        assert data["payer"] in valid_payers, f"Unexpected payer: {data['payer']}"
        print(f"Payer validation passed: {data['payer']}")
    
    def test_funding_rate_sentiment_valid(self):
        """Verify sentiment field is valid"""
        response = requests.get(f"{BASE_URL}/api/funding-rate")
        assert response.status_code == 200
        data = response.json()
        
        valid_sentiments = ["bullish", "bearish", "neutral"]
        assert data["sentiment"] in valid_sentiments, f"Unexpected sentiment: {data['sentiment']}"
        print(f"Sentiment validation passed: {data['sentiment']}")


class TestLiquidityEndpoint:
    """Tests for /api/liquidity endpoint - Kraken OrderBook data"""
    
    def test_liquidity_returns_data(self):
        """Test liquidity endpoint returns valid data"""
        response = requests.get(f"{BASE_URL}/api/liquidity")
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields exist
        assert "clusters" in data
        assert "direction" in data
        assert "current_price" in data
        assert "data_source" in data
        
        print(f"Liquidity data: {len(data['clusters'])} clusters, source: {data['data_source']}")
    
    def test_liquidity_data_source_is_kraken_orderbook(self):
        """Verify data_source is 'Kraken OrderBook'"""
        response = requests.get(f"{BASE_URL}/api/liquidity")
        assert response.status_code == 200
        data = response.json()
        
        # CRITICAL: Verify Kraken OrderBook source
        assert data["data_source"] == "Kraken OrderBook", f"Expected 'Kraken OrderBook' but got {data['data_source']}"
        print(f"Kraken OrderBook source verified: {data['data_source']}")
    
    def test_liquidity_clusters_structure(self):
        """Verify liquidity clusters have correct structure"""
        response = requests.get(f"{BASE_URL}/api/liquidity")
        assert response.status_code == 200
        data = response.json()
        
        clusters = data["clusters"]
        assert len(clusters) > 0, "Should have at least one liquidity cluster"
        
        for cluster in clusters:
            assert "price" in cluster
            assert "strength" in cluster
            assert "distance_percent" in cluster
            assert "side" in cluster
            assert cluster["side"] in ["above", "below"]
            assert cluster["strength"] in ["high", "medium", "low"]
        
        print(f"Clusters structure validated: {len(clusters)} clusters")
    
    def test_liquidity_direction_structure(self):
        """Verify direction data has correct structure"""
        response = requests.get(f"{BASE_URL}/api/liquidity")
        assert response.status_code == 200
        data = response.json()
        
        direction = data["direction"]
        assert "direction" in direction
        assert "next_target" in direction
        assert "distance_percent" in direction
        assert "imbalance_ratio" in direction
        
        valid_directions = ["UP", "DOWN", "BALANCED"]
        assert direction["direction"] in valid_directions
        
        print(f"Direction: {direction['direction']}, target: ${direction['next_target']}")


class TestOtherExistingEndpoints:
    """Tests for other existing endpoints to ensure they still work"""
    
    def test_chart_candles(self):
        """Test chart candles endpoint"""
        response = requests.get(f"{BASE_URL}/api/chart/candles?interval=1h&limit=5")
        assert response.status_code == 200
        data = response.json()
        
        assert "candles" in data
        assert "interval" in data
        assert "data_source" in data
        assert len(data["candles"]) > 0
        assert data["data_source"] == "Kraken"
        
        # Verify candle structure
        candle = data["candles"][0]
        assert "time" in candle
        assert "open" in candle
        assert "high" in candle
        assert "low" in candle
        assert "close" in candle
        assert "volume" in candle
        
        print(f"Chart candles: {len(data['candles'])} candles, source: {data['data_source']}")
    
    def test_market_bias(self):
        """Test market bias endpoint"""
        response = requests.get(f"{BASE_URL}/api/market/bias")
        assert response.status_code == 200
        data = response.json()
        
        assert "bias" in data
        assert "confidence" in data
        assert "estimated_move" in data
        assert "next_target" in data
        assert "analysis_text" in data
        
        valid_biases = ["BULLISH", "BEARISH", "NEUTRAL"]
        assert data["bias"] in valid_biases
        
        print(f"Market bias: {data['bias']} ({data['confidence']}% confidence)")
    
    def test_support_resistance(self):
        """Test support resistance endpoint"""
        response = requests.get(f"{BASE_URL}/api/support-resistance")
        assert response.status_code == 200
        data = response.json()
        
        assert "levels" in data
        assert "current_price" in data
        assert "data_source" in data
        
        print(f"Support/Resistance: {len(data['levels'])} levels, source: {data['data_source']}")
    
    def test_orderbook(self):
        """Test orderbook analysis endpoint"""
        response = requests.get(f"{BASE_URL}/api/orderbook")
        assert response.status_code == 200
        data = response.json()
        
        assert "top_bid_wall" in data
        assert "top_ask_wall" in data
        assert "imbalance" in data
        assert "data_source" in data
        assert data["data_source"] == "Kraken"
        
        print(f"OrderBook: imbalance {data['imbalance']}%, source: {data['data_source']}")
    
    def test_whale_alerts(self):
        """Test whale alerts endpoint"""
        response = requests.get(f"{BASE_URL}/api/whale-alerts")
        assert response.status_code == 200
        data = response.json()
        
        assert "alerts" in data
        assert "data_source" in data
        
        print(f"Whale alerts: {len(data['alerts'])} alerts, source: {data['data_source']}")
    
    def test_patterns(self):
        """Test chart patterns endpoint"""
        response = requests.get(f"{BASE_URL}/api/patterns")
        assert response.status_code == 200
        data = response.json()
        
        assert "patterns" in data
        print(f"Patterns detected: {len(data['patterns'])}")
    
    def test_candlesticks(self):
        """Test candlestick patterns endpoint"""
        response = requests.get(f"{BASE_URL}/api/candlesticks")
        assert response.status_code == 200
        data = response.json()
        
        assert "patterns" in data
        print(f"Candlestick patterns: {len(data['patterns'])}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
