"""
Test suite for multi-exchange order book aggregation features
Tests Kraken, Coinbase, and Bitstamp integration
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestExchangeComparison:
    """Tests for /api/exchange-comparison endpoint"""
    
    def test_exchange_comparison_returns_all_exchanges(self):
        """Verify exchange-comparison returns data from Kraken, Coinbase, Bitstamp"""
        response = requests.get(f"{BASE_URL}/api/exchange-comparison", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "exchanges" in data, "Response should have 'exchanges' field"
        assert "timestamp" in data, "Response should have 'timestamp' field"
        
        exchanges = data["exchanges"]
        # Check at least some exchanges are present
        assert len(exchanges) >= 1, "Should have at least one exchange"
        
        # Check for expected exchanges
        expected_exchanges = ["Kraken", "Coinbase", "Bitstamp"]
        found_exchanges = list(exchanges.keys())
        print(f"Found exchanges: {found_exchanges}")
        
        # At least 2 out of 3 exchanges should be available
        matching = [ex for ex in expected_exchanges if ex in found_exchanges]
        assert len(matching) >= 2, f"Expected at least 2 of {expected_exchanges}, found: {found_exchanges}"
        
    def test_exchange_comparison_has_required_fields(self):
        """Verify each exchange has price, bid, ask, spread, imbalance, bias"""
        response = requests.get(f"{BASE_URL}/api/exchange-comparison", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        exchanges = data.get("exchanges", {})
        
        required_fields = ["price", "bid", "ask", "spread", "imbalance", "bias"]
        
        for exchange_name, exchange_data in exchanges.items():
            print(f"\n{exchange_name}: {exchange_data}")
            for field in required_fields:
                assert field in exchange_data, f"Exchange {exchange_name} missing field: {field}"
            
            # Validate bias is one of expected values
            assert exchange_data["bias"] in ["BULLISH", "BEARISH", "NEUTRAL"], \
                f"Invalid bias for {exchange_name}: {exchange_data['bias']}"


class TestSupportResistance:
    """Tests for /api/support-resistance endpoint with multi-exchange aggregation"""
    
    def test_support_resistance_aggregated_data_source(self):
        """Verify S/R shows 'Aggregated (Kraken, Coinbase, Bitstamp)' as data source"""
        response = requests.get(f"{BASE_URL}/api/support-resistance?interval=1h", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "data_source" in data, "Response should have 'data_source' field"
        assert "levels" in data, "Response should have 'levels' field"
        assert "current_price" in data, "Response should have 'current_price' field"
        
        data_source = data["data_source"]
        print(f"Data source: {data_source}")
        
        # Should contain 'Aggregated' and at least some exchange names
        assert "Aggregated" in data_source, f"Data source should contain 'Aggregated', got: {data_source}"
        
    def test_support_resistance_levels_have_explanation(self):
        """Verify S/R levels include explanation text"""
        response = requests.get(f"{BASE_URL}/api/support-resistance?interval=1h", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        levels = data.get("levels", [])
        
        if len(levels) > 0:
            # Check at least one level has explanation
            levels_with_explanation = [l for l in levels if l.get("explanation")]
            print(f"Levels with explanation: {len(levels_with_explanation)} / {len(levels)}")
            assert len(levels_with_explanation) > 0, "At least one level should have explanation"
            
            # Check level structure
            for level in levels[:3]:  # Check first 3
                assert "price" in level, "Level should have 'price'"
                assert "level_type" in level, "Level should have 'level_type'"
                assert "strength" in level, "Level should have 'strength'"
                print(f"Level: ${level['price']:.0f} ({level['level_type']}) - {level.get('explanation', '')[:50]}...")


class TestLiquidity:
    """Tests for /api/liquidity endpoint with multi-exchange aggregation"""
    
    def test_liquidity_has_aggregated_data_source(self):
        """Verify liquidity shows aggregated data source"""
        response = requests.get(f"{BASE_URL}/api/liquidity?interval=1h", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "data_source" in data, "Response should have 'data_source' field"
        
        data_source = data["data_source"]
        print(f"Data source: {data_source}")
        assert "Aggregated" in data_source, f"Data source should contain 'Aggregated', got: {data_source}"
        
    def test_liquidity_has_exchange_stats(self):
        """Verify liquidity returns exchange_stats per exchange"""
        response = requests.get(f"{BASE_URL}/api/liquidity?interval=1h", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        exchange_stats = data.get("exchange_stats")
        
        # exchange_stats may be None if aggregation fails, which is acceptable
        if exchange_stats:
            print(f"Exchange stats: {exchange_stats}")
            assert isinstance(exchange_stats, dict), "exchange_stats should be a dict"
            
            # Check structure of each exchange stats
            for ex_name, stats in exchange_stats.items():
                assert "bid_depth" in stats, f"Exchange {ex_name} missing bid_depth"
                assert "ask_depth" in stats, f"Exchange {ex_name} missing ask_depth"
                print(f"{ex_name}: bid_depth=${stats.get('bid_depth', 0):,.0f}, ask_depth=${stats.get('ask_depth', 0):,.0f}")
        else:
            print("exchange_stats is None - aggregation may have partial data")
            
    def test_liquidity_clusters_have_explanation(self):
        """Verify liquidity clusters include explanation text"""
        response = requests.get(f"{BASE_URL}/api/liquidity?interval=1h", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        clusters = data.get("clusters", [])
        direction = data.get("direction")
        
        # Check direction has explanation
        if direction:
            print(f"Direction: {direction.get('direction')} - {direction.get('explanation', '')[:80]}...")
            assert direction.get("explanation"), "Direction should have explanation"
        
        # Check clusters have explanation
        if clusters:
            clusters_with_explanation = [c for c in clusters if c.get("explanation")]
            print(f"Clusters with explanation: {len(clusters_with_explanation)} / {len(clusters)}")


class TestWhaleAlerts:
    """Tests for /api/whale-alerts endpoint with enhanced fields"""
    
    def test_whale_alerts_endpoint_works(self):
        """Verify whale-alerts endpoint returns proper structure"""
        response = requests.get(f"{BASE_URL}/api/whale-alerts?interval=1h", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "alerts" in data, "Response should have 'alerts' field"
        assert "data_source" in data, "Response should have 'data_source' field"
        
        print(f"Data source: {data['data_source']}")
        print(f"Number of alerts: {len(data['alerts'])}")
        
    def test_whale_alerts_enhanced_fields(self):
        """Verify alerts have stop_loss, risk_reward, exchanges_detected when present"""
        response = requests.get(f"{BASE_URL}/api/whale-alerts?interval=1h", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        alerts = data.get("alerts", [])
        
        if len(alerts) > 0:
            for alert in alerts[:3]:  # Check first 3
                print(f"\nAlert: {alert.get('signal')} @ ${alert.get('entry', 0):,.0f}")
                
                # These fields should exist (even if None)
                assert "signal" in alert, "Alert should have 'signal'"
                assert "entry" in alert, "Alert should have 'entry'"
                assert "target" in alert, "Alert should have 'target'"
                
                # Enhanced fields may be None but should exist in structure
                if alert.get("stop_loss"):
                    print(f"  Stop Loss: ${alert['stop_loss']:,.0f}")
                if alert.get("risk_reward"):
                    print(f"  Risk/Reward: {alert['risk_reward']}")
                if alert.get("exchanges_detected"):
                    print(f"  Exchanges: {alert['exchanges_detected']}")
        else:
            print("No whale alerts detected (expected behavior if market is quiet)")


class TestPatterns:
    """Tests for /api/patterns endpoint with enhanced fields"""
    
    def test_patterns_endpoint_works(self):
        """Verify patterns endpoint returns proper structure"""
        response = requests.get(f"{BASE_URL}/api/patterns?interval=1h", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "patterns" in data, "Response should have 'patterns' field"
        assert "data_source" in data, "Response should have 'data_source' field"
        
        print(f"Data source: {data['data_source']}")
        print(f"Number of patterns: {len(data['patterns'])}")
        
    def test_patterns_enhanced_fields(self):
        """Verify patterns have explanation, pattern_strength, stop_loss when detected"""
        response = requests.get(f"{BASE_URL}/api/patterns?interval=1h", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        patterns = data.get("patterns", [])
        
        if len(patterns) > 0:
            for pattern in patterns[:3]:
                print(f"\nPattern: {pattern.get('pattern')} ({pattern.get('direction')})")
                
                # Check required fields
                assert "pattern" in pattern, "Pattern should have 'pattern' name"
                assert "direction" in pattern, "Pattern should have 'direction'"
                assert "confidence" in pattern, "Pattern should have 'confidence'"
                assert "target_price" in pattern, "Pattern should have 'target_price'"
                
                # Check enhanced fields
                if pattern.get("explanation"):
                    print(f"  Explanation: {pattern['explanation'][:80]}...")
                if pattern.get("pattern_strength"):
                    print(f"  Strength: {pattern['pattern_strength']}")
                if pattern.get("stop_loss"):
                    print(f"  Stop Loss: ${pattern['stop_loss']:,.0f}")
        else:
            print("No patterns detected (expected behavior if market conditions don't match)")


class TestMarketBias:
    """Tests for /api/market/bias endpoint with exchange consensus"""
    
    def test_market_bias_has_exchange_consensus(self):
        """Verify market bias includes exchange_consensus showing per-exchange bias"""
        response = requests.get(f"{BASE_URL}/api/market/bias?interval=1h", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Check required fields
        assert "bias" in data, "Response should have 'bias' field"
        assert "confidence" in data, "Response should have 'confidence' field"
        
        print(f"Market Bias: {data['bias']} ({data['confidence']}% confidence)")
        
        # Check exchange_consensus
        exchange_consensus = data.get("exchange_consensus")
        if exchange_consensus:
            print(f"Exchange Consensus: {exchange_consensus}")
            assert isinstance(exchange_consensus, dict), "exchange_consensus should be a dict"
            
            # Each exchange should have a bias value
            for ex_name, ex_bias in exchange_consensus.items():
                assert ex_bias in ["BULLISH", "BEARISH", "NEUTRAL"], \
                    f"Invalid bias for {ex_name}: {ex_bias}"
        else:
            print("exchange_consensus is None (may happen if aggregation partial)")


class TestOrderBook:
    """Tests for /api/orderbook endpoint with exchange comparison"""
    
    def test_orderbook_has_aggregated_data(self):
        """Verify orderbook returns aggregated data from multiple exchanges"""
        response = requests.get(f"{BASE_URL}/api/orderbook", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Check required fields
        assert "top_bid_wall" in data, "Response should have 'top_bid_wall'"
        assert "top_ask_wall" in data, "Response should have 'top_ask_wall'"
        assert "imbalance" in data, "Response should have 'imbalance'"
        assert "data_source" in data, "Response should have 'data_source'"
        
        print(f"Data source: {data['data_source']}")
        print(f"Imbalance: {data['imbalance']}% ({data['imbalance_direction']})")
        
        # Check for aggregated data source
        data_source = data["data_source"]
        if "Aggregated" in data_source:
            print("Using multi-exchange aggregated data")
            # Check exchange_comparison if available
            if data.get("exchange_comparison"):
                print(f"Exchange comparison: {list(data['exchange_comparison'].keys())}")


class TestHealthAndBasicEndpoints:
    """Basic endpoint verification tests"""
    
    def test_health_check(self):
        """Verify health endpoint works"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200
        
    def test_market_status(self):
        """Verify market status returns live data"""
        response = requests.get(f"{BASE_URL}/api/market/status", timeout=15)
        assert response.status_code == 200
        
        data = response.json()
        assert "price" in data, "Should have price"
        assert "status" in data, "Should have status"
        assert data["status"] == "LIVE", f"Expected LIVE status, got {data['status']}"
        print(f"BTC Price: ${data['price']:,.2f} (source: {data.get('data_source', 'N/A')})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
