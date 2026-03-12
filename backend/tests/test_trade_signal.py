"""
Test suite for Trade Signal module and regression tests for Market Bias and Liquidity endpoints.
Tests the new TradeSignal endpoint that synthesizes all intelligence into LONG/SHORT/NO TRADE recommendations.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ============== TRADE SIGNAL TESTS ==============

class TestTradeSignal:
    """Tests for /api/trade-signal endpoint"""
    
    def test_trade_signal_returns_valid_response(self):
        """Test that trade signal endpoint returns valid response with all required fields"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify required fields exist
        required_fields = [
            "direction", "confidence", "estimated_move", 
            "entry_zone_low", "entry_zone_high", "stop_loss",
            "invalidation_reason", "target_1", "target_2",
            "risk_reward_ratio", "reasoning", "factors",
            "timestamp", "valid_for", "warnings"
        ]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"✓ Trade signal returned with direction: {data['direction']}")
    
    def test_trade_signal_direction_is_valid(self):
        """Test that direction is one of LONG, SHORT, or NO TRADE"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        valid_directions = ["LONG", "SHORT", "NO TRADE"]
        assert data["direction"] in valid_directions, f"Invalid direction: {data['direction']}"
        
        print(f"✓ Direction '{data['direction']}' is valid")
    
    def test_trade_signal_confidence_range(self):
        """Test that confidence is within valid range 0-100"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        assert 0 <= data["confidence"] <= 100, f"Confidence {data['confidence']} out of range"
        
        print(f"✓ Confidence {data['confidence']}% is within valid range")
    
    def test_trade_signal_factors_structure(self):
        """Test that factors breakdown contains required intelligence components"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        factors = data.get("factors", {})
        
        # Required factors from all intelligence modules
        required_factors = [
            "market_bias", "liquidity", "exchange_consensus",
            "funding_rate", "open_interest", "patterns", "whale_alerts"
        ]
        
        for factor in required_factors:
            assert factor in factors, f"Missing factor: {factor}"
            
            # Each factor should have score and max
            factor_data = factors[factor]
            assert "score" in factor_data, f"Factor {factor} missing 'score'"
            assert "max" in factor_data, f"Factor {factor} missing 'max'"
        
        print(f"✓ All {len(required_factors)} factors present with scores")
    
    def test_trade_signal_market_bias_factor(self):
        """Test market_bias factor contains bias and confidence"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        market_bias = data["factors"].get("market_bias", {})
        
        assert "bias" in market_bias, "market_bias missing 'bias' field"
        assert "confidence" in market_bias, "market_bias missing 'confidence' field"
        assert market_bias["bias"] in ["BULLISH", "BEARISH", "NEUTRAL"], f"Invalid bias: {market_bias['bias']}"
        
        print(f"✓ Market bias factor: {market_bias['bias']} ({market_bias['confidence']:.1f}% conf)")
    
    def test_trade_signal_liquidity_factor(self):
        """Test liquidity factor contains direction and imbalance_ratio"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        liquidity = data["factors"].get("liquidity", {})
        
        assert "direction" in liquidity, "liquidity missing 'direction' field"
        assert "imbalance_ratio" in liquidity, "liquidity missing 'imbalance_ratio' field"
        assert liquidity["direction"] in ["UP", "DOWN", "BALANCED"], f"Invalid direction: {liquidity['direction']}"
        
        print(f"✓ Liquidity factor: {liquidity['direction']} (imbalance: {liquidity['imbalance_ratio']:.2f})")
    
    def test_trade_signal_exchange_consensus_factor(self):
        """Test exchange_consensus factor contains description"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        consensus = data["factors"].get("exchange_consensus", {})
        
        assert "description" in consensus, "exchange_consensus missing 'description' field"
        assert "score" in consensus, "exchange_consensus missing 'score' field"
        
        print(f"✓ Exchange consensus: {consensus['description']}")
    
    def test_trade_signal_funding_rate_factor(self):
        """Test funding_rate factor contains rate and sentiment"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        funding = data["factors"].get("funding_rate", {})
        
        assert "rate" in funding, "funding_rate missing 'rate' field"
        assert "sentiment" in funding, "funding_rate missing 'sentiment' field"
        
        print(f"✓ Funding rate factor: {funding['rate']} ({funding['sentiment']})")
    
    def test_trade_signal_open_interest_factor(self):
        """Test open_interest factor contains total, trend, and change_24h"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        oi = data["factors"].get("open_interest", {})
        
        assert "total" in oi, "open_interest missing 'total' field"
        assert "trend" in oi, "open_interest missing 'trend' field"
        assert "change_24h" in oi, "open_interest missing 'change_24h' field"
        
        print(f"✓ Open Interest factor: ${oi['total']}B ({oi['trend']}, {oi['change_24h']:.2f}% 24h)")
    
    def test_trade_signal_patterns_factor(self):
        """Test patterns factor contains count and top_pattern"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        patterns = data["factors"].get("patterns", {})
        
        assert "count" in patterns, "patterns missing 'count' field"
        assert "top_pattern" in patterns, "patterns missing 'top_pattern' field"
        
        print(f"✓ Patterns factor: {patterns['count']} patterns, top: {patterns['top_pattern']}")
    
    def test_trade_signal_whale_alerts_factor(self):
        """Test whale_alerts factor contains count"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        whales = data["factors"].get("whale_alerts", {})
        
        assert "count" in whales, "whale_alerts missing 'count' field"
        assert "score" in whales, "whale_alerts missing 'score' field"
        
        print(f"✓ Whale alerts factor: {whales['count']} alerts")
    
    def test_trade_signal_entry_stop_targets_valid(self):
        """Test that entry zone, stop loss, and targets are valid numbers"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        
        # For LONG/SHORT signals, these should be > 0
        if data["direction"] != "NO TRADE":
            assert data["entry_zone_low"] > 0, "entry_zone_low should be > 0"
            assert data["entry_zone_high"] > 0, "entry_zone_high should be > 0"
            assert data["stop_loss"] > 0, "stop_loss should be > 0"
            assert data["target_1"] > 0, "target_1 should be > 0"
            assert data["target_2"] > 0, "target_2 should be > 0"
            
            print(f"✓ Entry: ${data['entry_zone_low']:,.0f} - ${data['entry_zone_high']:,.0f}")
            print(f"✓ Stop Loss: ${data['stop_loss']:,.0f}")
            print(f"✓ Targets: ${data['target_1']:,.0f} / ${data['target_2']:,.0f}")
        else:
            print(f"✓ NO TRADE signal - skipping price level validation")
    
    def test_trade_signal_risk_reward_ratio(self):
        """Test risk/reward ratio for trade signals"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        
        assert isinstance(data["risk_reward_ratio"], (int, float)), "risk_reward_ratio should be numeric"
        
        if data["direction"] != "NO TRADE":
            print(f"✓ Risk/Reward ratio: {data['risk_reward_ratio']:.2f}:1")
        else:
            print(f"✓ NO TRADE - R/R ratio: {data['risk_reward_ratio']}")
    
    def test_trade_signal_reasoning_not_empty(self):
        """Test that reasoning explanation is provided"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        
        assert data["reasoning"], "reasoning should not be empty"
        assert len(data["reasoning"]) > 50, "reasoning should be detailed (>50 chars)"
        
        print(f"✓ Reasoning provided ({len(data['reasoning'])} chars)")
    
    def test_trade_signal_warnings_is_list(self):
        """Test that warnings is a list"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        
        assert isinstance(data["warnings"], list), "warnings should be a list"
        
        if data["warnings"]:
            print(f"✓ Warnings present: {len(data['warnings'])} warning(s)")
            for warning in data["warnings"]:
                print(f"  - {warning}")
        else:
            print(f"✓ No warnings (clean signal)")
    
    def test_trade_signal_timestamp_and_validity(self):
        """Test timestamp and valid_for fields"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        
        assert data["timestamp"], "timestamp should not be empty"
        assert data["valid_for"], "valid_for should not be empty"
        
        print(f"✓ Signal timestamp: {data['timestamp']}")
        print(f"✓ Valid for: {data['valid_for']}")


# ============== REGRESSION TESTS ==============

class TestMarketBiasRegression:
    """Regression tests for /api/market/bias endpoint"""
    
    def test_market_bias_endpoint_works(self):
        """Test that market bias endpoint returns valid response"""
        response = requests.get(f"{BASE_URL}/api/market/bias", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        required_fields = ["bias", "confidence", "estimated_move", "trap_risk", 
                          "squeeze_probability", "inputs", "exchange_consensus"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"✓ Market bias: {data['bias']} ({data['confidence']:.1f}%)")
    
    def test_market_bias_exchange_consensus(self):
        """Test that exchange_consensus contains per-exchange bias"""
        response = requests.get(f"{BASE_URL}/api/market/bias", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        consensus = data.get("exchange_consensus", {})
        
        # Should have data from exchanges
        assert isinstance(consensus, dict), "exchange_consensus should be dict"
        
        for exchange, bias in consensus.items():
            assert bias in ["BULLISH", "BEARISH", "NEUTRAL"], f"Invalid bias for {exchange}: {bias}"
        
        print(f"✓ Exchange consensus: {consensus}")
    
    def test_market_bias_inputs_structure(self):
        """Test that inputs contains all scoring components"""
        response = requests.get(f"{BASE_URL}/api/market/bias", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        inputs = data.get("inputs", {})
        
        expected_inputs = ["trend_score", "volume_score", "momentum_score", 
                          "orderbook_score", "rsi", "orderbook_imbalance"]
        
        for inp in expected_inputs:
            assert inp in inputs, f"Missing input: {inp}"
        
        print(f"✓ Inputs structure valid: RSI={inputs['rsi']:.1f}, OB imbalance={inputs['orderbook_imbalance']:.2f}")


class TestLiquidityRegression:
    """Regression tests for /api/liquidity endpoint"""
    
    def test_liquidity_endpoint_works(self):
        """Test that liquidity endpoint returns valid response"""
        response = requests.get(f"{BASE_URL}/api/liquidity", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        required_fields = ["clusters", "direction", "current_price", "data_source", "exchange_stats"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"✓ Liquidity direction: {data['direction'].get('direction', 'N/A')}")
        print(f"✓ Data source: {data['data_source']}")
    
    def test_liquidity_clusters_structure(self):
        """Test that clusters have required fields"""
        response = requests.get(f"{BASE_URL}/api/liquidity", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        clusters = data.get("clusters", [])
        
        if clusters:
            cluster = clusters[0]
            required_cluster_fields = ["price", "strength", "distance_percent", 
                                       "side", "estimated_value"]
            for field in required_cluster_fields:
                assert field in cluster, f"Cluster missing field: {field}"
            
            print(f"✓ Clusters structure valid: {len(clusters)} clusters found")
        else:
            print(f"✓ No clusters (expected if market is quiet)")
    
    def test_liquidity_exchange_stats(self):
        """Test that exchange_stats contains per-exchange data"""
        response = requests.get(f"{BASE_URL}/api/liquidity", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        exchange_stats = data.get("exchange_stats")
        
        if exchange_stats:
            for exchange, stats in exchange_stats.items():
                assert "bid_depth" in stats, f"{exchange} missing bid_depth"
                assert "ask_depth" in stats, f"{exchange} missing ask_depth"
                assert "imbalance" in stats, f"{exchange} missing imbalance"
            
            print(f"✓ Exchange stats: {list(exchange_stats.keys())}")
        else:
            print(f"✓ exchange_stats is None (may be normal)")
    
    def test_liquidity_direction_structure(self):
        """Test that direction object has required fields"""
        response = requests.get(f"{BASE_URL}/api/liquidity", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        direction = data.get("direction", {})
        
        required_direction_fields = ["direction", "next_target", "distance_percent", "imbalance_ratio"]
        for field in required_direction_fields:
            assert field in direction, f"Direction missing field: {field}"
        
        assert direction["direction"] in ["UP", "DOWN", "BALANCED"], f"Invalid direction: {direction['direction']}"
        
        print(f"✓ Direction: {direction['direction']} toward ${direction['next_target']:,.0f}")


# ============== HEALTH CHECK ==============

class TestHealthCheck:
    """Basic health check tests"""
    
    def test_health_endpoint(self):
        """Test health check endpoint"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200
        print("✓ Health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
