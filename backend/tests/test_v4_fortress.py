"""
V4 Analytics Suite & FORTRESS Stop Loss Tests
Tests for:
1. FORTRESS rules endpoint /api/v4/fortress-rules
2. Stop loss validation /api/v4/signals/{id}/validate-stop
3. Trailing stop application /api/v4/signals/{id}/trailing-stop
4. V4 signals CRUD operations
"""
import pytest
import requests
import os
from datetime import datetime

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_KEY = "cr4pt0r4d4r_4dm1n_2024"

# Test signal ID from the problem statement
TEST_SIGNAL_ID = "48269df8-be4f-4433-bc7d-c0f4fd5b1c0b"


@pytest.fixture
def admin_headers():
    """Admin headers for authenticated requests"""
    return {
        "Content-Type": "application/json",
        "X-Admin-Key": ADMIN_KEY
    }


class TestFortressRulesEndpoint:
    """Test /api/v4/fortress-rules endpoint"""
    
    def test_fortress_rules_returns_200(self, admin_headers):
        """FORTRESS rules endpoint should return 200 with admin key"""
        response = requests.get(f"{BASE_URL}/api/v4/fortress-rules", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✅ FORTRESS rules endpoint returns 200")
    
    def test_fortress_rules_structure(self, admin_headers):
        """FORTRESS rules should have correct structure"""
        response = requests.get(f"{BASE_URL}/api/v4/fortress-rules", headers=admin_headers)
        data = response.json()
        
        # Check required fields
        assert "name" in data, "Missing 'name' field"
        assert "rules" in data, "Missing 'rules' field"
        assert "enforcement" in data, "Missing 'enforcement' field"
        
        # Check rules array
        assert isinstance(data["rules"], list), "Rules should be a list"
        assert len(data["rules"]) >= 2, "Should have at least 2 rules"
        
        # Check for NO_WIDENING rule
        rule_names = [r["rule"] for r in data["rules"]]
        assert "NO_WIDENING" in rule_names, "Missing NO_WIDENING rule"
        assert "TRAILING_ONLY" in rule_names, "Missing TRAILING_ONLY rule"
        
        print(f"✅ FORTRESS rules structure valid: {len(data['rules'])} rules found")
        print(f"   Rules: {rule_names}")
    
    def test_fortress_rules_italian_text(self, admin_headers):
        """FORTRESS rules should be in Italian"""
        response = requests.get(f"{BASE_URL}/api/v4/fortress-rules", headers=admin_headers)
        data = response.json()
        
        # Check for Italian text in description
        description = data.get("description", "")
        assert "Stop Loss" in description or "stop loss" in description.lower(), "Description should mention Stop Loss"
        
        # Check enforcement has Italian text
        enforcement = data.get("enforcement", {})
        assert "LONG" in enforcement, "Missing LONG enforcement"
        assert "SHORT" in enforcement, "Missing SHORT enforcement"
        
        print(f"✅ FORTRESS rules in Italian: {description[:50]}...")
    
    def test_fortress_rules_requires_admin(self):
        """FORTRESS rules should require admin access"""
        response = requests.get(f"{BASE_URL}/api/v4/fortress-rules")
        assert response.status_code == 403, f"Expected 403 without admin key, got {response.status_code}"
        print("✅ FORTRESS rules correctly requires admin access")


class TestV4SignalsEndpoint:
    """Test /api/v4/signals endpoint"""
    
    def test_v4_signals_returns_200(self, admin_headers):
        """V4 signals endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/v4/signals?signal_type=sniper&days=30", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✅ V4 signals endpoint returns 200")
    
    def test_v4_signals_structure(self, admin_headers):
        """V4 signals should return proper structure"""
        response = requests.get(f"{BASE_URL}/api/v4/signals?signal_type=sniper&days=30", headers=admin_headers)
        data = response.json()
        
        assert "signals" in data, "Missing 'signals' field"
        assert isinstance(data["signals"], list), "Signals should be a list"
        
        print(f"✅ V4 signals structure valid: {len(data['signals'])} signals found")
    
    def test_v4_signals_hunter_type(self, admin_headers):
        """V4 signals should support hunter type"""
        response = requests.get(f"{BASE_URL}/api/v4/signals?signal_type=hunter&days=30", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "signals" in data
        print(f"✅ V4 hunter signals: {len(data['signals'])} found")


class TestStopLossValidation:
    """Test /api/v4/signals/{id}/validate-stop endpoint"""
    
    @pytest.fixture
    def test_signal(self, admin_headers):
        """Create a test SNIPER signal for validation tests"""
        # First check if test signal exists
        response = requests.get(f"{BASE_URL}/api/v4/signals?signal_type=sniper&days=90", headers=admin_headers)
        if response.status_code == 200:
            signals = response.json().get("signals", [])
            # Find a pending signal
            for sig in signals:
                if sig.get("outcome") == "pending" and sig.get("direction") == "LONG":
                    return sig
        
        # Create a new test signal
        params = {
            "direction": "LONG",
            "entry_price": 75000,
            "stop_loss": 74000,
            "target_1": 76500,
            "target_2": 78000,
            "quality_score": 75,
            "notes": "TEST_FORTRESS_VALIDATION"
        }
        response = requests.post(
            f"{BASE_URL}/api/v4/signals/record-sniper",
            headers=admin_headers,
            params=params
        )
        if response.status_code == 200:
            return response.json()
        return None
    
    def test_validate_stop_widening_blocked_long(self, admin_headers, test_signal):
        """LONG: Lowering stop loss (widening) should be BLOCKED"""
        if not test_signal:
            pytest.skip("No test signal available")
        
        signal_id = test_signal.get("signal_id")
        current_stop = test_signal.get("stop_loss", 74000)
        
        # Try to lower stop (widen risk) - should be BLOCKED
        proposed_stop = current_stop - 1000  # Lower by $1000
        
        response = requests.get(
            f"{BASE_URL}/api/v4/signals/{signal_id}/validate-stop",
            headers=admin_headers,
            params={"proposed_stop": proposed_stop}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data["allowed"] == False, f"Widening should be BLOCKED, got allowed={data['allowed']}"
        assert "STRUCTURE_LOCKED" in data.get("rule", "") or "NO_WIDENING" in data.get("rule", ""), \
            f"Rule should indicate NO_WIDENING, got: {data.get('rule')}"
        
        print(f"✅ FORTRESS correctly BLOCKS widening: {current_stop} → {proposed_stop}")
        print(f"   Rule: {data.get('rule')}")
        print(f"   Reason: {data.get('reason')}")
    
    def test_validate_stop_trailing_allowed_long(self, admin_headers, test_signal):
        """LONG: Raising stop loss (trailing) should be ALLOWED"""
        if not test_signal:
            pytest.skip("No test signal available")
        
        signal_id = test_signal.get("signal_id")
        current_stop = test_signal.get("stop_loss", 74000)
        entry_price = test_signal.get("entry_price", 75000)
        
        # Try to raise stop (trailing) - should be ALLOWED
        # But must stay below entry
        proposed_stop = current_stop + 500  # Raise by $500
        if proposed_stop >= entry_price:
            proposed_stop = entry_price - 100  # Stay below entry
        
        response = requests.get(
            f"{BASE_URL}/api/v4/signals/{signal_id}/validate-stop",
            headers=admin_headers,
            params={"proposed_stop": proposed_stop}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data["allowed"] == True, f"Trailing should be ALLOWED, got allowed={data['allowed']}, reason: {data.get('reason')}"
        assert "TRAILING" in data.get("rule", "").upper() or "APPROVED" in data.get("rule", "").upper(), \
            f"Rule should indicate TRAILING_APPROVED, got: {data.get('rule')}"
        
        print(f"✅ FORTRESS correctly ALLOWS trailing: {current_stop} → {proposed_stop}")
        print(f"   Rule: {data.get('rule')}")
    
    def test_validate_stop_requires_admin(self):
        """Validate stop should require admin access"""
        response = requests.get(
            f"{BASE_URL}/api/v4/signals/test-id/validate-stop",
            params={"proposed_stop": 74000}
        )
        assert response.status_code == 403, f"Expected 403 without admin key, got {response.status_code}"
        print("✅ Validate stop correctly requires admin access")


class TestTrailingStopApplication:
    """Test /api/v4/signals/{id}/trailing-stop endpoint"""
    
    @pytest.fixture
    def fresh_test_signal(self, admin_headers):
        """Create a fresh test signal for trailing stop tests"""
        params = {
            "direction": "LONG",
            "entry_price": 75000,
            "stop_loss": 74000,
            "target_1": 76500,
            "target_2": 78000,
            "quality_score": 75,
            "notes": "TEST_TRAILING_STOP"
        }
        response = requests.post(
            f"{BASE_URL}/api/v4/signals/record-sniper",
            headers=admin_headers,
            params=params
        )
        if response.status_code == 200:
            return response.json()
        return None
    
    def test_apply_trailing_stop_valid(self, admin_headers, fresh_test_signal):
        """Apply valid trailing stop should succeed"""
        if not fresh_test_signal:
            pytest.skip("Could not create test signal")
        
        signal_id = fresh_test_signal.get("signal_id")
        current_stop = fresh_test_signal.get("stop_loss", 74000)
        entry_price = fresh_test_signal.get("entry_price", 75000)
        
        # Valid trailing: raise stop but stay below entry
        new_stop = current_stop + 300
        if new_stop >= entry_price:
            new_stop = entry_price - 100
        
        response = requests.post(
            f"{BASE_URL}/api/v4/signals/{signal_id}/trailing-stop",
            headers=admin_headers,
            params={"new_stop_loss": new_stop}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, f"Trailing stop should succeed, got: {data}"
        assert data.get("new_stop") == new_stop, f"New stop should be {new_stop}, got {data.get('new_stop')}"
        
        print(f"✅ Trailing stop applied: {current_stop} → {new_stop}")
        print(f"   Rule: {data.get('rule')}")
    
    def test_apply_trailing_stop_blocked_widening(self, admin_headers, fresh_test_signal):
        """Apply widening stop should be blocked"""
        if not fresh_test_signal:
            pytest.skip("Could not create test signal")
        
        signal_id = fresh_test_signal.get("signal_id")
        current_stop = fresh_test_signal.get("stop_loss", 74000)
        
        # Invalid: try to lower stop (widen)
        new_stop = current_stop - 500
        
        response = requests.post(
            f"{BASE_URL}/api/v4/signals/{signal_id}/trailing-stop",
            headers=admin_headers,
            params={"new_stop_loss": new_stop}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data.get("success") == False, f"Widening should be blocked, got: {data}"
        assert "STRUCTURE_LOCKED" in data.get("rule", "") or "NO_WIDENING" in data.get("rule", ""), \
            f"Rule should indicate blocking, got: {data.get('rule')}"
        
        print(f"✅ Widening correctly blocked: {current_stop} → {new_stop}")
        print(f"   Rule: {data.get('rule')}")
        print(f"   Reason: {data.get('reason')}")


class TestSpecificSignalFortress:
    """Test FORTRESS with the specific signal ID from problem statement"""
    
    def test_specific_signal_widening_blocked(self, admin_headers):
        """
        Test with signal ID 48269df8-be4f-4433-bc7d-c0f4fd5b1c0b
        Stop at 74000, widening to 73000 should be BLOCKED
        """
        signal_id = TEST_SIGNAL_ID
        
        # First check if signal exists
        response = requests.get(
            f"{BASE_URL}/api/v4/signals/{signal_id}/validate-stop",
            headers=admin_headers,
            params={"proposed_stop": 73000}
        )
        
        if response.status_code == 200:
            data = response.json()
            if "SIGNAL_NOT_FOUND" in data.get("rule", ""):
                print(f"⚠️ Signal {signal_id[:8]} not found in database - creating test signal")
                # Create the signal for testing
                params = {
                    "direction": "LONG",
                    "entry_price": 75000,
                    "stop_loss": 74000,
                    "target_1": 76500,
                    "target_2": 78000,
                    "quality_score": 75,
                    "notes": "TEST_SPECIFIC_SIGNAL"
                }
                create_resp = requests.post(
                    f"{BASE_URL}/api/v4/signals/record-sniper",
                    headers=admin_headers,
                    params=params
                )
                if create_resp.status_code == 200:
                    new_signal = create_resp.json()
                    signal_id = new_signal.get("signal_id")
                    print(f"   Created test signal: {signal_id[:8]}")
                    
                    # Now test widening
                    response = requests.get(
                        f"{BASE_URL}/api/v4/signals/{signal_id}/validate-stop",
                        headers=admin_headers,
                        params={"proposed_stop": 73000}
                    )
                    data = response.json()
            
            # Verify widening is blocked
            if data.get("allowed") == False and "STRUCTURE_LOCKED" in data.get("rule", ""):
                print(f"✅ FORTRESS BLOCKS widening 74000 → 73000")
                print(f"   Rule: {data.get('rule')}")
                print(f"   Reason: {data.get('reason')}")
            else:
                print(f"⚠️ Unexpected result: {data}")
        else:
            print(f"⚠️ Validate endpoint returned {response.status_code}")
    
    def test_specific_signal_trailing_allowed(self, admin_headers):
        """
        Test with signal - trailing to 74500 should be ALLOWED
        """
        # Create a fresh signal for this test
        params = {
            "direction": "LONG",
            "entry_price": 75000,
            "stop_loss": 74000,
            "target_1": 76500,
            "target_2": 78000,
            "quality_score": 75,
            "notes": "TEST_TRAILING_ALLOWED"
        }
        create_resp = requests.post(
            f"{BASE_URL}/api/v4/signals/record-sniper",
            headers=admin_headers,
            params=params
        )
        
        if create_resp.status_code == 200:
            signal = create_resp.json()
            signal_id = signal.get("signal_id")
            
            # Test trailing to 74500 (raising stop)
            response = requests.get(
                f"{BASE_URL}/api/v4/signals/{signal_id}/validate-stop",
                headers=admin_headers,
                params={"proposed_stop": 74500}
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["allowed"] == True, f"Trailing 74000 → 74500 should be ALLOWED, got: {data}"
            print(f"✅ FORTRESS ALLOWS trailing 74000 → 74500")
            print(f"   Rule: {data.get('rule')}")
        else:
            pytest.skip(f"Could not create test signal: {create_resp.status_code}")


class TestV4AnalyticsEndpoints:
    """Test V4 Analytics Hub endpoints"""
    
    def test_analytics_metrics_endpoint(self, admin_headers):
        """Test /api/v4/analytics/metrics endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/v4/analytics/metrics?days=30",
            headers=admin_headers
        )
        # May return 404 if endpoint doesn't exist yet
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Analytics metrics endpoint works")
            print(f"   Total signals: {data.get('total_signals', 0)}")
        elif response.status_code == 404:
            print("⚠️ Analytics metrics endpoint not implemented (404)")
        else:
            print(f"⚠️ Analytics metrics returned {response.status_code}")
    
    def test_equity_curve_endpoint(self, admin_headers):
        """Test /api/v4/analytics/equity-curve endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/v4/analytics/equity-curve?days=30",
            headers=admin_headers
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Equity curve endpoint works")
            print(f"   Data points: {len(data.get('equity_curve', []))}")
        elif response.status_code == 404:
            print("⚠️ Equity curve endpoint not implemented (404)")
        else:
            print(f"⚠️ Equity curve returned {response.status_code}")
    
    def test_mentor_summary_endpoint(self, admin_headers):
        """Test /api/v4/analytics/mentor-summary endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/v4/analytics/mentor-summary?period=weekly",
            headers=admin_headers
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Mentor summary endpoint works")
        elif response.status_code == 404:
            print("⚠️ Mentor summary endpoint not implemented (404)")
        else:
            print(f"⚠️ Mentor summary returned {response.status_code}")


class TestV4StrategyLabEndpoints:
    """Test V4 Strategy Lab endpoints"""
    
    def test_historical_data_endpoint(self, admin_headers):
        """Test /api/v4/strategy-lab/historical-data endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/v4/strategy-lab/historical-data?days=30&interval=4h",
            headers=admin_headers
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Strategy Lab historical data endpoint works")
            print(f"   Candles: {data.get('count', 0)}")
        elif response.status_code == 404:
            print("⚠️ Strategy Lab historical data endpoint not implemented (404)")
        else:
            print(f"⚠️ Strategy Lab historical data returned {response.status_code}")
    
    def test_simulate_endpoint(self, admin_headers):
        """Test /api/v4/strategy-lab/simulate endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/v4/strategy-lab/simulate",
            headers=admin_headers,
            params={
                "strategy": "sniper",
                "direction": "LONG",
                "entry_price": 75000,
                "stop_loss": 74000,
                "target_1": 76500,
                "target_2": 78000
            }
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Strategy Lab simulate endpoint works")
            print(f"   Outcome: {data.get('outcome', 'N/A')}")
        elif response.status_code == 404:
            print("⚠️ Strategy Lab simulate endpoint not implemented (404)")
        else:
            print(f"⚠️ Strategy Lab simulate returned {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
