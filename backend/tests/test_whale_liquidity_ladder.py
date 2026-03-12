"""
Test suite for Whale Activity Engine and Liquidity Ladder features
Added in v1.7 of CryptoRadar BTC Intelligence Dashboard

Tests:
1. Whale Activity Engine - direction, strength, buy/sell pressure, signals
2. Liquidity Ladder - levels above/below, sweep expectation, path analysis
3. Trade Signal integration - new factors and fields
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWhaleActivityEngine:
    """Tests for whale_activity object in trade signal response"""
    
    def test_whale_activity_exists_in_trade_signal(self):
        """Verify whale_activity object is present in trade signal response"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        data = response.json()
        
        assert "whale_activity" in data, "whale_activity field must be present"
        whale = data["whale_activity"]
        assert whale is not None, "whale_activity should not be None"
        print(f"✓ whale_activity present: direction={whale.get('direction')}")
        
    def test_whale_activity_has_required_fields(self):
        """Verify whale_activity contains all required fields"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        whale = response.json()["whale_activity"]
        
        required_fields = ["direction", "strength", "buy_pressure", "sell_pressure", "explanation"]
        for field in required_fields:
            assert field in whale, f"whale_activity missing required field: {field}"
        
        print(f"✓ All required fields present: {required_fields}")
        
    def test_whale_activity_direction_values(self):
        """Verify direction field has valid values (BUY/SELL/NEUTRAL)"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        whale = response.json()["whale_activity"]
        
        valid_directions = ["BUY", "SELL", "NEUTRAL"]
        assert whale["direction"] in valid_directions, f"Invalid direction: {whale['direction']}"
        print(f"✓ Direction is valid: {whale['direction']}")
        
    def test_whale_activity_strength_range(self):
        """Verify strength is in valid range 0-100"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        whale = response.json()["whale_activity"]
        
        assert 0 <= whale["strength"] <= 100, f"Strength out of range: {whale['strength']}"
        print(f"✓ Strength in range: {whale['strength']}%")
        
    def test_whale_activity_pressure_scores(self):
        """Verify buy_pressure and sell_pressure are numeric"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        whale = response.json()["whale_activity"]
        
        assert isinstance(whale["buy_pressure"], (int, float)), "buy_pressure must be numeric"
        assert isinstance(whale["sell_pressure"], (int, float)), "sell_pressure must be numeric"
        assert whale["buy_pressure"] >= 0, "buy_pressure must be non-negative"
        assert whale["sell_pressure"] >= 0, "sell_pressure must be non-negative"
        
        print(f"✓ Pressure scores: buy={whale['buy_pressure']}, sell={whale['sell_pressure']}")
        
    def test_whale_activity_explanation_populated(self):
        """Verify explanation field is a non-empty string"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        whale = response.json()["whale_activity"]
        
        assert isinstance(whale["explanation"], str), "explanation must be string"
        assert len(whale["explanation"]) > 0, "explanation should not be empty"
        print(f"✓ Explanation: {whale['explanation'][:100]}...")


class TestLiquidityLadder:
    """Tests for liquidity_ladder_summary object in trade signal response"""
    
    def test_liquidity_ladder_exists_in_trade_signal(self):
        """Verify liquidity_ladder_summary is present in trade signal response"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        data = response.json()
        
        assert "liquidity_ladder_summary" in data, "liquidity_ladder_summary field must be present"
        ladder = data["liquidity_ladder_summary"]
        assert ladder is not None, "liquidity_ladder_summary should not be None"
        print(f"✓ liquidity_ladder_summary present: more_attractive_side={ladder.get('more_attractive_side')}")
        
    def test_liquidity_ladder_has_required_fields(self):
        """Verify liquidity_ladder_summary contains all required fields"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        ladder = response.json()["liquidity_ladder_summary"]
        
        required_fields = ["more_attractive_side", "sweep_expectation", "nearest_above", "nearest_below", "path_analysis"]
        for field in required_fields:
            assert field in ladder, f"liquidity_ladder_summary missing required field: {field}"
        
        print(f"✓ All required fields present: {required_fields}")
        
    def test_liquidity_ladder_attractive_side_values(self):
        """Verify more_attractive_side has valid values"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        ladder = response.json()["liquidity_ladder_summary"]
        
        valid_sides = ["above", "below", "balanced"]
        assert ladder["more_attractive_side"] in valid_sides, f"Invalid side: {ladder['more_attractive_side']}"
        print(f"✓ More attractive side: {ladder['more_attractive_side']}")
        
    def test_liquidity_ladder_sweep_expectation_values(self):
        """Verify sweep_expectation has valid values"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        ladder = response.json()["liquidity_ladder_summary"]
        
        valid_expectations = ["sweep_below_first", "sweep_above_first", "no_clear_sweep", "balanced"]
        assert ladder["sweep_expectation"] in valid_expectations, f"Invalid sweep_expectation: {ladder['sweep_expectation']}"
        print(f"✓ Sweep expectation: {ladder['sweep_expectation']}")
        
    def test_liquidity_ladder_nearest_levels_structure(self):
        """Verify nearest_above and nearest_below have proper structure if present"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        ladder = response.json()["liquidity_ladder_summary"]
        
        # Check nearest_above
        if ladder["nearest_above"] is not None:
            assert "price" in ladder["nearest_above"], "nearest_above should have price field"
            assert "strength" in ladder["nearest_above"], "nearest_above should have strength field"
            print(f"✓ Nearest above: ${ladder['nearest_above']['price']:,.0f} ({ladder['nearest_above']['strength']})")
        else:
            print("✓ Nearest above is None (acceptable)")
            
        # Check nearest_below
        if ladder["nearest_below"] is not None:
            assert "price" in ladder["nearest_below"], "nearest_below should have price field"
            assert "strength" in ladder["nearest_below"], "nearest_below should have strength field"
            print(f"✓ Nearest below: ${ladder['nearest_below']['price']:,.0f} ({ladder['nearest_below']['strength']})")
        else:
            print("✓ Nearest below is None (acceptable)")
            
    def test_liquidity_ladder_path_analysis_populated(self):
        """Verify path_analysis is a non-empty string"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        ladder = response.json()["liquidity_ladder_summary"]
        
        assert isinstance(ladder["path_analysis"], str), "path_analysis must be string"
        assert len(ladder["path_analysis"]) > 0, "path_analysis should not be empty"
        print(f"✓ Path analysis: {ladder['path_analysis'][:100]}...")


class TestTradeSignalFactorsIntegration:
    """Tests for whale_engine and liquidity_ladder factors in trade signal"""
    
    def test_whale_engine_factor_in_factors(self):
        """Verify whale_engine factor is included in factors object"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        data = response.json()
        
        assert "factors" in data, "factors field must be present"
        assert "whale_engine" in data["factors"], "whale_engine factor must be in factors"
        
        whale_factor = data["factors"]["whale_engine"]
        assert "direction" in whale_factor, "whale_engine factor needs direction"
        assert "strength" in whale_factor, "whale_engine factor needs strength"
        assert "buy_pressure" in whale_factor, "whale_engine factor needs buy_pressure"
        assert "sell_pressure" in whale_factor, "whale_engine factor needs sell_pressure"
        assert "score" in whale_factor, "whale_engine factor needs score"
        assert "max" in whale_factor, "whale_engine factor needs max"
        
        print(f"✓ whale_engine factor present: score={whale_factor['score']}/{whale_factor['max']}")
        
    def test_liquidity_ladder_factor_in_factors(self):
        """Verify liquidity_ladder factor is included in factors object"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        data = response.json()
        
        assert "factors" in data, "factors field must be present"
        assert "liquidity_ladder" in data["factors"], "liquidity_ladder factor must be in factors"
        
        ladder_factor = data["factors"]["liquidity_ladder"]
        assert "more_attractive_side" in ladder_factor, "liquidity_ladder factor needs more_attractive_side"
        assert "sweep_expectation" in ladder_factor, "liquidity_ladder factor needs sweep_expectation"
        assert "nearest_above" in ladder_factor, "liquidity_ladder factor needs nearest_above"
        assert "nearest_below" in ladder_factor, "liquidity_ladder factor needs nearest_below"
        assert "score" in ladder_factor, "liquidity_ladder factor needs score"
        assert "max" in ladder_factor, "liquidity_ladder factor needs max"
        
        print(f"✓ liquidity_ladder factor present: score={ladder_factor['score']}/{ladder_factor['max']}")
        
    def test_whale_confirms_direction_field(self):
        """Verify whale_confirms_direction boolean field is present"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        data = response.json()
        
        assert "whale_confirms_direction" in data, "whale_confirms_direction field must be present"
        assert isinstance(data["whale_confirms_direction"], bool), "whale_confirms_direction must be boolean"
        print(f"✓ whale_confirms_direction: {data['whale_confirms_direction']}")
        
    def test_sweep_first_expected_field(self):
        """Verify sweep_first_expected boolean field is present"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        data = response.json()
        
        assert "sweep_first_expected" in data, "sweep_first_expected field must be present"
        assert isinstance(data["sweep_first_expected"], bool), "sweep_first_expected must be boolean"
        print(f"✓ sweep_first_expected: {data['sweep_first_expected']}")


class TestTradeSignalCompleteness:
    """Tests for overall trade signal response completeness"""
    
    def test_all_new_v17_fields_present(self):
        """Verify all new v1.7 fields are present in trade signal"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        data = response.json()
        
        new_v17_fields = [
            "whale_activity",
            "liquidity_ladder_summary",
            "sweep_first_expected",
            "whale_confirms_direction"
        ]
        
        for field in new_v17_fields:
            assert field in data, f"Missing v1.7 field: {field}"
            
        print(f"✓ All v1.7 fields present: {new_v17_fields}")
        
    def test_trade_signal_scoring_range(self):
        """Verify factor scores are within expected ranges"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        data = response.json()
        
        factors = data["factors"]
        
        # Verify scores are within max ranges
        for factor_name, factor_data in factors.items():
            if isinstance(factor_data, dict) and "score" in factor_data and "max" in factor_data:
                score = abs(factor_data["score"])
                max_score = factor_data["max"]
                assert score <= max_score, f"{factor_name} score {score} exceeds max {max_score}"
                print(f"✓ {factor_name}: score={factor_data['score']}/{max_score}")
                
    def test_reasoning_includes_whale_or_ladder_context(self):
        """Verify reasoning mentions whale or ladder when relevant"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        data = response.json()
        
        reasoning = data.get("reasoning", "")
        
        # Check if whale or liquidity context is mentioned when relevant
        whale_factor = data["factors"].get("whale_engine", {})
        ladder_factor = data["factors"].get("liquidity_ladder", {})
        
        if whale_factor.get("score", 0) != 0:
            # Whale had impact, should be in reasoning
            assert "Whale" in reasoning or "whale" in reasoning, "Reasoning should mention whale activity when it contributes to score"
            print("✓ Whale activity mentioned in reasoning")
        else:
            print("✓ Whale score is 0, not required in reasoning")
            
        if ladder_factor.get("score", 0) != 0:
            # Ladder had impact, should be in reasoning
            assert "Liquidity" in reasoning or "liquidity" in reasoning or "Ladder" in reasoning, "Reasoning should mention liquidity ladder when it contributes to score"
            print("✓ Liquidity ladder mentioned in reasoning")
        else:
            print("✓ Ladder score is 0, not required in reasoning")


class TestRegressionAPIs:
    """Regression tests to ensure other APIs still work correctly"""
    
    def test_market_bias_api(self):
        """Verify /api/market/bias endpoint still works"""
        response = requests.get(f"{BASE_URL}/api/market/bias", timeout=30)
        assert response.status_code == 200
        data = response.json()
        
        assert "bias" in data
        assert "confidence" in data
        print(f"✓ /api/market/bias working: {data['bias']} ({data['confidence']}% conf)")
        
    def test_liquidity_api(self):
        """Verify /api/liquidity endpoint still works"""
        response = requests.get(f"{BASE_URL}/api/liquidity", timeout=30)
        assert response.status_code == 200
        data = response.json()
        
        assert "direction" in data
        assert "clusters" in data
        print(f"✓ /api/liquidity working: {data['direction']['direction']}")
        
    def test_support_resistance_api(self):
        """Verify /api/support-resistance endpoint still works"""
        response = requests.get(f"{BASE_URL}/api/support-resistance", timeout=30)
        assert response.status_code == 200
        data = response.json()
        
        # API returns object with levels list
        assert "levels" in data, "Response should have 'levels' key"
        assert isinstance(data["levels"], list), "levels should be a list"
        print(f"✓ /api/support-resistance working: {len(data['levels'])} levels")
        
    def test_market_status_api(self):
        """Verify /api/market/status endpoint still works"""
        response = requests.get(f"{BASE_URL}/api/market/status", timeout=30)
        assert response.status_code == 200
        data = response.json()
        
        assert "price" in data
        assert "symbol" in data
        print(f"✓ /api/market/status working: ${data['price']:,.0f}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
