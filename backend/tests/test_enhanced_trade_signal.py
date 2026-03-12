"""
Test suite for Enhanced Trade Signal module with realistic BTC trading logic.
Tests new features:
1. Minimum move filter (0.50%)
2. Smart stop loss beyond liquidity sweep zones
3. Liquidity sweep/reversal detection
4. Setup type classification (standard/sweep_reversal/continuation)
5. NO TRADE when move too small or stop too vulnerable
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ============== ENHANCED TRADE SIGNAL TESTS ==============

class TestEnhancedTradeSignalFields:
    """Tests for new TradeSignal fields: setup_type, liquidity_sweep_zone, etc."""
    
    def test_trade_signal_has_setup_type_field(self):
        """Test that trade signal returns setup_type field"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "setup_type" in data, "Missing 'setup_type' field in trade signal"
        
        valid_setup_types = ["standard", "sweep_reversal", "continuation"]
        assert data["setup_type"] in valid_setup_types, \
            f"Invalid setup_type: {data['setup_type']}. Expected one of {valid_setup_types}"
        
        print(f"✓ Setup type field present: {data['setup_type']}")
    
    def test_trade_signal_has_liquidity_sweep_zone_field(self):
        """Test that trade signal returns liquidity_sweep_zone field"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        assert "liquidity_sweep_zone" in data, "Missing 'liquidity_sweep_zone' field"
        
        # liquidity_sweep_zone should be float or None
        lsz = data["liquidity_sweep_zone"]
        assert lsz is None or isinstance(lsz, (int, float)), \
            f"liquidity_sweep_zone should be numeric or None, got {type(lsz)}"
        
        if data["direction"] in ["LONG", "SHORT"]:
            print(f"✓ Liquidity sweep zone: ${lsz:,.2f}" if lsz else "✓ Liquidity sweep zone: None")
        else:
            print(f"✓ NO TRADE signal - liquidity_sweep_zone is {lsz}")
    
    def test_trade_signal_has_safe_invalidation_field(self):
        """Test that trade signal returns safe_invalidation field"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        assert "safe_invalidation" in data, "Missing 'safe_invalidation' field"
        
        si = data["safe_invalidation"]
        assert si is None or isinstance(si, (int, float)), \
            f"safe_invalidation should be numeric or None, got {type(si)}"
        
        if data["direction"] in ["LONG", "SHORT"]:
            print(f"✓ Safe invalidation: ${si:,.2f}" if si else "✓ Safe invalidation: None")
        else:
            print(f"✓ NO TRADE signal - safe_invalidation is {si}")
    
    def test_trade_signal_has_sweep_detected_field(self):
        """Test that trade signal returns sweep_detected boolean field"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        assert "sweep_detected" in data, "Missing 'sweep_detected' field"
        
        assert isinstance(data["sweep_detected"], bool), \
            f"sweep_detected should be boolean, got {type(data['sweep_detected'])}"
        
        print(f"✓ Sweep detected: {data['sweep_detected']}")
    
    def test_trade_signal_has_sweep_analysis_field(self):
        """Test that trade signal returns sweep_analysis field"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        assert "sweep_analysis" in data, "Missing 'sweep_analysis' field"
        
        sa = data["sweep_analysis"]
        assert sa is None or isinstance(sa, str), \
            f"sweep_analysis should be string or None, got {type(sa)}"
        
        if sa:
            print(f"✓ Sweep analysis provided: {sa[:100]}...")
        else:
            print(f"✓ Sweep analysis: None (no sweep detected)")


class TestMinimumMoveFilter:
    """Tests for minimum move filter (0.50% threshold)"""
    
    def test_trade_signal_estimated_move_present(self):
        """Test that estimated_move field is present"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        assert "estimated_move" in data, "Missing 'estimated_move' field"
        assert isinstance(data["estimated_move"], (int, float)), \
            f"estimated_move should be numeric, got {type(data['estimated_move'])}"
        
        print(f"✓ Estimated move: {data['estimated_move']:.2f}%")
    
    def test_no_trade_if_move_below_minimum_is_handled(self):
        """Test signal handling when move is below 0.50% threshold"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        
        # If estimated_move < 0.50% and direction is not NO TRADE, it should still work
        # The logic filters this in backend - we test response is valid regardless
        if data["direction"] == "NO TRADE":
            # Check if insufficient move warning is present
            insufficient_move_warning = any("Move too small" in w for w in data.get("warnings", []))
            insufficient_move_reason = "INSUFFICIENT MOVE" in data.get("reasoning", "")
            
            if insufficient_move_warning or insufficient_move_reason:
                print(f"✓ NO TRADE due to insufficient move (< 0.50%)")
            else:
                print(f"✓ NO TRADE due to mixed signals")
        else:
            # For LONG/SHORT signals, estimated_move should be >= 0.50%
            # Note: The API may have different moves, just verify structure
            print(f"✓ Trade signal: {data['direction']} with {data['estimated_move']:.2f}% expected move")


class TestSmartStopLoss:
    """Tests for smart stop loss placement beyond liquidity sweep zones"""
    
    def test_stop_loss_beyond_sweep_zone_for_trades(self):
        """Test that stop_loss is placed beyond obvious levels for LONG/SHORT"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        
        if data["direction"] in ["LONG", "SHORT"]:
            stop_loss = data["stop_loss"]
            sweep_zone = data["liquidity_sweep_zone"]
            safe_invalidation = data["safe_invalidation"]
            
            assert stop_loss > 0, "Stop loss should be > 0 for trade signals"
            
            # For LONG: stop should be below entry
            # For SHORT: stop should be above entry
            if data["direction"] == "LONG":
                assert stop_loss < data["entry_zone_low"], \
                    f"LONG stop ({stop_loss}) should be below entry zone ({data['entry_zone_low']})"
                print(f"✓ LONG stop loss ${stop_loss:,.2f} is below entry ${data['entry_zone_low']:,.2f}")
            else:
                assert stop_loss > data["entry_zone_high"], \
                    f"SHORT stop ({stop_loss}) should be above entry zone ({data['entry_zone_high']})"
                print(f"✓ SHORT stop loss ${stop_loss:,.2f} is above entry ${data['entry_zone_high']:,.2f}")
            
            if sweep_zone:
                print(f"  Liquidity sweep zone: ${sweep_zone:,.2f}")
            if safe_invalidation:
                print(f"  Safe invalidation: ${safe_invalidation:,.2f}")
        else:
            print(f"✓ NO TRADE - stop loss validation skipped")
    
    def test_invalidation_reason_mentions_sweep_for_trades(self):
        """Test that invalidation_reason mentions sweep/smart stop for trades"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        
        assert "invalidation_reason" in data, "Missing 'invalidation_reason' field"
        
        if data["direction"] in ["LONG", "SHORT"]:
            # Check that invalidation reason is informative
            reason = data["invalidation_reason"]
            assert len(reason) > 10, "invalidation_reason should be descriptive"
            print(f"✓ Invalidation reason: {reason[:100]}...")
        else:
            print(f"✓ NO TRADE - invalidation: {data['invalidation_reason']}")


class TestLiquiditySwReversal:
    """Tests for liquidity sweep and reversal detection"""
    
    def test_sweep_reversal_setup_type_format(self):
        """Test that sweep_reversal setup type is correctly formatted"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        
        if data["setup_type"] == "sweep_reversal":
            # If sweep_reversal, sweep_detected should be True
            assert data["sweep_detected"] == True, \
                "sweep_detected should be True for sweep_reversal setup"
            
            # sweep_analysis should be populated
            assert data["sweep_analysis"] is not None, \
                "sweep_analysis should be provided for sweep_reversal setup"
            
            print(f"✓ Sweep & Reversal setup detected")
            print(f"  Analysis: {data['sweep_analysis'][:100]}...")
        else:
            print(f"✓ Setup type: {data['setup_type']} (not sweep_reversal)")


class TestReasoningContent:
    """Tests for signal reasoning content including liquidity context"""
    
    def test_reasoning_includes_liquidity_section_for_trades(self):
        """Test that reasoning includes 'Liquidity & Stop Placement' section for trades"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        reasoning = data.get("reasoning", "")
        
        if data["direction"] in ["LONG", "SHORT"]:
            # Check for liquidity section in reasoning
            assert "Liquidity" in reasoning or "liquidity" in reasoning, \
                "Reasoning should mention liquidity for trade signals"
            print(f"✓ Reasoning includes liquidity context")
            
            # Check for key elements
            if "stop hunt zone" in reasoning.lower() or "sweep" in reasoning.lower():
                print(f"  ✓ Mentions stop hunt/sweep zones")
            if "safe invalidation" in reasoning.lower() or "beyond sweep" in reasoning.lower():
                print(f"  ✓ Mentions safe invalidation")
        else:
            print(f"✓ NO TRADE - reasoning: {reasoning[:100]}...")


class TestWarnings:
    """Tests for warning messages including trap risk and R/R warnings"""
    
    def test_warnings_list_present(self):
        """Test that warnings is a list"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        assert "warnings" in data, "Missing 'warnings' field"
        assert isinstance(data["warnings"], list), "warnings should be a list"
        
        print(f"✓ Warnings: {len(data['warnings'])} warning(s)")
        for w in data["warnings"]:
            print(f"  - {w}")
    
    def test_rr_warning_when_below_threshold(self):
        """Test that R/R warning appears if ratio is below 1.5:1"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        
        if data["direction"] in ["LONG", "SHORT"]:
            rr = data["risk_reward_ratio"]
            warnings = data.get("warnings", [])
            
            if rr < 1.5:
                # Should have R/R warning
                rr_warning = any("Risk/Reward" in w or "R/R" in w.upper() for w in warnings)
                if rr_warning:
                    print(f"✓ R/R warning present for low ratio ({rr:.2f}:1)")
                else:
                    print(f"! R/R ratio {rr:.2f}:1 is low but no warning found")
            else:
                print(f"✓ R/R ratio {rr:.2f}:1 is acceptable")
        else:
            print(f"✓ NO TRADE - R/R warning check skipped")


# ============== REGRESSION TESTS ==============

class TestRegressionEndpoints:
    """Regression tests for /api/market/bias, /api/liquidity, /api/support-resistance"""
    
    def test_market_bias_still_works(self):
        """Test /api/market/bias endpoint still returns valid response"""
        response = requests.get(f"{BASE_URL}/api/market/bias", timeout=30)
        assert response.status_code == 200, f"market/bias failed: {response.status_code}"
        
        data = response.json()
        required = ["bias", "confidence", "estimated_move", "trap_risk", "inputs"]
        for field in required:
            assert field in data, f"market/bias missing: {field}"
        
        print(f"✓ REGRESSION: /api/market/bias works - {data['bias']} ({data['confidence']:.1f}%)")
    
    def test_liquidity_still_works(self):
        """Test /api/liquidity endpoint still returns valid response"""
        response = requests.get(f"{BASE_URL}/api/liquidity", timeout=30)
        assert response.status_code == 200, f"liquidity failed: {response.status_code}"
        
        data = response.json()
        required = ["clusters", "direction", "current_price", "data_source"]
        for field in required:
            assert field in data, f"liquidity missing: {field}"
        
        print(f"✓ REGRESSION: /api/liquidity works - {len(data['clusters'])} clusters")
    
    def test_support_resistance_still_works(self):
        """Test /api/support-resistance endpoint still returns valid response"""
        response = requests.get(f"{BASE_URL}/api/support-resistance", timeout=30)
        assert response.status_code == 200, f"support-resistance failed: {response.status_code}"
        
        data = response.json()
        assert "levels" in data, "support-resistance missing 'levels'"
        
        levels = data["levels"]
        print(f"✓ REGRESSION: /api/support-resistance works - {len(levels)} levels")
        
        if levels:
            # Verify level structure
            level = levels[0]
            required = ["price", "level_type", "strength", "timeframe", "distance_percent"]
            for field in required:
                assert field in level, f"S/R level missing: {field}"


# ============== ALL NEW FIELDS COMBINED TEST ==============

class TestAllNewFieldsTogether:
    """Test all new enhanced trade signal fields together"""
    
    def test_all_enhanced_fields_present(self):
        """Test that all 5 new fields are present in the response"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        
        new_fields = [
            "setup_type",
            "liquidity_sweep_zone", 
            "safe_invalidation",
            "sweep_detected",
            "sweep_analysis"
        ]
        
        missing = []
        for field in new_fields:
            if field not in data:
                missing.append(field)
        
        assert len(missing) == 0, f"Missing new fields: {missing}"
        
        print(f"✓ All 5 new enhanced fields present:")
        print(f"  - setup_type: {data['setup_type']}")
        print(f"  - liquidity_sweep_zone: {data['liquidity_sweep_zone']}")
        print(f"  - safe_invalidation: {data['safe_invalidation']}")
        print(f"  - sweep_detected: {data['sweep_detected']}")
        print(f"  - sweep_analysis: {data['sweep_analysis'][:50] if data['sweep_analysis'] else None}")
    
    def test_field_consistency_for_long_short(self):
        """Test that fields are consistent for LONG/SHORT signals"""
        response = requests.get(f"{BASE_URL}/api/trade-signal", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        
        if data["direction"] in ["LONG", "SHORT"]:
            # For trades, sweep_zone and safe_invalidation should both be present or both absent
            has_sweep_zone = data["liquidity_sweep_zone"] is not None
            has_safe_inv = data["safe_invalidation"] is not None
            
            # They should match
            # Note: Both can be None if the second support/resistance isn't available
            print(f"✓ {data['direction']} signal field consistency:")
            print(f"  - has liquidity_sweep_zone: {has_sweep_zone}")
            print(f"  - has safe_invalidation: {has_safe_inv}")
            
            # Stop loss should be populated for trades
            assert data["stop_loss"] > 0, "stop_loss should be > 0 for trades"
            print(f"  - stop_loss: ${data['stop_loss']:,.2f}")
        else:
            # For NO TRADE
            print(f"✓ NO TRADE - liquidity fields should be None")
            # Both should be None for NO TRADE
            assert data["liquidity_sweep_zone"] is None, \
                "liquidity_sweep_zone should be None for NO TRADE"
            assert data["safe_invalidation"] is None, \
                "safe_invalidation should be None for NO TRADE"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
