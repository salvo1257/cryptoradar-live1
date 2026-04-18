"""
Test Suite for The Sentinel - Multi-Timeframe Pattern Detection Engine
Tests all /api/sentinel/* endpoints for CryptoRadar
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://btc-intelligence.preview.emergentagent.com').rstrip('/')


class TestSentinelStatus:
    """Tests for GET /api/sentinel/status endpoint"""
    
    def test_sentinel_status_returns_200(self):
        """Test that status endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/sentinel/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✅ Sentinel status endpoint returns 200")
    
    def test_sentinel_status_has_required_fields(self):
        """Test that status response has all required fields"""
        response = requests.get(f"{BASE_URL}/api/sentinel/status")
        data = response.json()
        
        required_fields = [
            "running", "scan_count", "error_count", "current_price",
            "patterns_detected", "confluences_active", "high_probability_setups",
            "last_scan_times", "timeframes_monitored"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"✅ Status has all required fields: {required_fields}")
    
    def test_sentinel_scanner_is_running(self):
        """Test that the scanner is actively running"""
        response = requests.get(f"{BASE_URL}/api/sentinel/status")
        data = response.json()
        
        assert data["running"] == True, "Scanner should be running"
        assert data["patterns_detected"] > 0, "Should have detected patterns"
        print(f"✅ Scanner running: {data['running']}, patterns detected: {data['patterns_detected']}")
    
    def test_sentinel_monitors_all_timeframes(self):
        """Test that all 6 timeframes are monitored"""
        response = requests.get(f"{BASE_URL}/api/sentinel/status")
        data = response.json()
        
        expected_timeframes = ["15m", "1h", "4h", "1d", "1w", "1M"]
        assert data["timeframes_monitored"] == expected_timeframes, \
            f"Expected {expected_timeframes}, got {data['timeframes_monitored']}"
        print(f"✅ All 6 timeframes monitored: {expected_timeframes}")


class TestSentinelPatterns:
    """Tests for GET /api/sentinel/patterns endpoint"""
    
    def test_patterns_endpoint_returns_200(self):
        """Test that patterns endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/sentinel/patterns")
        assert response.status_code == 200
        print("✅ Patterns endpoint returns 200")
    
    def test_patterns_response_structure(self):
        """Test patterns response has correct structure"""
        response = requests.get(f"{BASE_URL}/api/sentinel/patterns?lang=it")
        data = response.json()
        
        required_fields = [
            "patterns", "patterns_count", "confluences", "confluences_count",
            "high_probability_setups", "high_probability_count", "current_price",
            "scanner_running", "last_scan_times", "timeframes"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✅ Patterns response has all required fields")
    
    def test_patterns_have_psychology_in_italian(self):
        """Test that patterns include Italian psychological explanations"""
        response = requests.get(f"{BASE_URL}/api/sentinel/patterns?lang=it")
        data = response.json()
        
        if data["patterns"]:
            pattern = data["patterns"][0]
            assert "psychology" in pattern, "Pattern should have psychology field"
            
            psychology = pattern["psychology"]
            # Check for Italian format (Cosa succede / Perché / Azione)
            assert "cosa_succede" in psychology, "Missing 'cosa_succede' in psychology"
            assert "perche" in psychology, "Missing 'perche' in psychology"
            assert "azione" in psychology, "Missing 'azione' in psychology"
            
            print(f"✅ Pattern has Italian psychology: cosa_succede, perche, azione")
            print(f"   Sample: {psychology['cosa_succede'][:80]}...")
        else:
            pytest.skip("No patterns available to test")
    
    def test_patterns_have_timeframe_and_bias(self):
        """Test that patterns have timeframe and bias information"""
        response = requests.get(f"{BASE_URL}/api/sentinel/patterns?lang=it")
        data = response.json()
        
        if data["patterns"]:
            pattern = data["patterns"][0]
            assert "timeframe" in pattern, "Pattern should have timeframe"
            assert "bias" in pattern, "Pattern should have bias"
            assert "color" in pattern, "Pattern should have color"
            assert "weight" in pattern, "Pattern should have weight"
            
            assert pattern["bias"] in ["BULLISH", "BEARISH", "NEUTRAL"], \
                f"Invalid bias: {pattern['bias']}"
            
            print(f"✅ Pattern has timeframe={pattern['timeframe']}, bias={pattern['bias']}")
        else:
            pytest.skip("No patterns available to test")
    
    def test_patterns_sorted_by_weight(self):
        """Test that patterns are sorted by weight (higher timeframe first)"""
        response = requests.get(f"{BASE_URL}/api/sentinel/patterns?lang=it")
        data = response.json()
        
        patterns = data["patterns"]
        if len(patterns) >= 2:
            weights = [p.get("weight", 0) for p in patterns]
            # Should be sorted descending
            assert weights == sorted(weights, reverse=True), \
                "Patterns should be sorted by weight descending"
            print(f"✅ Patterns sorted by weight (first: {weights[0]}, last: {weights[-1]})")
        else:
            pytest.skip("Not enough patterns to test sorting")


class TestSentinelConfluences:
    """Tests for GET /api/sentinel/confluences endpoint"""
    
    def test_confluences_endpoint_returns_200(self):
        """Test that confluences endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/sentinel/confluences")
        assert response.status_code == 200
        print("✅ Confluences endpoint returns 200")
    
    def test_confluences_response_structure(self):
        """Test confluences response has correct structure"""
        response = requests.get(f"{BASE_URL}/api/sentinel/confluences?lang=it")
        data = response.json()
        
        assert "confluences" in data, "Missing 'confluences' field"
        assert "total" in data, "Missing 'total' field"
        assert "high_probability" in data, "Missing 'high_probability' field"
        assert "scanner_running" in data, "Missing 'scanner_running' field"
        
        print(f"✅ Confluences response structure valid, total: {data['total']}")
    
    def test_confluences_have_multi_timeframe_data(self):
        """Test that confluences show patterns across multiple timeframes"""
        response = requests.get(f"{BASE_URL}/api/sentinel/confluences?lang=it")
        data = response.json()
        
        if data["confluences"]:
            confluence = data["confluences"][0]
            assert "timeframes" in confluence, "Confluence should have timeframes"
            assert "pattern_type" in confluence, "Confluence should have pattern_type"
            assert "total_weight" in confluence, "Confluence should have total_weight"
            assert "confluence_score" in confluence, "Confluence should have confluence_score"
            assert "is_high_probability" in confluence, "Confluence should have is_high_probability"
            
            # Should have multiple timeframes
            assert len(confluence["timeframes"]) >= 2, \
                f"Confluence should span multiple timeframes, got {len(confluence['timeframes'])}"
            
            print(f"✅ Confluence spans {len(confluence['timeframes'])} timeframes: {confluence['timeframes']}")
        else:
            pytest.skip("No confluences available to test")
    
    def test_confluences_have_psychology(self):
        """Test that confluences include psychological explanations"""
        response = requests.get(f"{BASE_URL}/api/sentinel/confluences?lang=it")
        data = response.json()
        
        if data["confluences"]:
            confluence = data["confluences"][0]
            assert "psychology" in confluence, "Confluence should have psychology"
            
            psychology = confluence["psychology"]
            assert "cosa_succede" in psychology, "Missing 'cosa_succede'"
            assert "perche" in psychology, "Missing 'perche'"
            assert "azione" in psychology, "Missing 'azione'"
            
            print(f"✅ Confluence has Italian psychology")
        else:
            pytest.skip("No confluences available to test")
    
    def test_high_probability_setups_detected(self):
        """Test that high probability setups are identified"""
        response = requests.get(f"{BASE_URL}/api/sentinel/confluences?lang=it")
        data = response.json()
        
        high_prob_count = data["high_probability"]
        print(f"✅ High probability setups detected: {high_prob_count}")
        
        # Check if any confluence is marked as high probability
        high_prob_confluences = [c for c in data["confluences"] if c.get("is_high_probability")]
        assert len(high_prob_confluences) == high_prob_count, \
            f"Mismatch: {len(high_prob_confluences)} marked vs {high_prob_count} reported"


class TestSentinelChartOverlay:
    """Tests for GET /api/sentinel/chart-overlay endpoint"""
    
    def test_chart_overlay_returns_200(self):
        """Test that chart overlay endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/sentinel/chart-overlay")
        assert response.status_code == 200
        print("✅ Chart overlay endpoint returns 200")
    
    def test_chart_overlay_structure(self):
        """Test chart overlay response has correct structure"""
        response = requests.get(f"{BASE_URL}/api/sentinel/chart-overlay")
        data = response.json()
        
        assert "chart_data" in data, "Missing 'chart_data' field"
        assert "current_price" in data, "Missing 'current_price' field"
        assert "patterns_total" in data, "Missing 'patterns_total' field"
        assert "legend" in data, "Missing 'legend' field"
        
        print(f"✅ Chart overlay structure valid, patterns_total: {data['patterns_total']}")
    
    def test_chart_data_categories(self):
        """Test that chart_data has all drawing categories"""
        response = requests.get(f"{BASE_URL}/api/sentinel/chart-overlay")
        data = response.json()
        
        chart_data = data["chart_data"]
        expected_categories = ["patterns", "trendlines", "markers", "zones"]
        
        for category in expected_categories:
            assert category in chart_data, f"Missing category: {category}"
        
        print(f"✅ Chart data has all categories: {expected_categories}")
    
    def test_legend_has_all_timeframes(self):
        """Test that legend includes all 6 timeframes with colors"""
        response = requests.get(f"{BASE_URL}/api/sentinel/chart-overlay")
        data = response.json()
        
        legend = data["legend"]
        expected_timeframes = ["15m", "1h", "4h", "1d", "1w", "1M"]
        
        for tf in expected_timeframes:
            assert tf in legend, f"Missing timeframe in legend: {tf}"
            assert "color" in legend[tf], f"Missing color for {tf}"
            assert "weight" in legend[tf], f"Missing weight for {tf}"
        
        print(f"✅ Legend has all timeframes with colors and weights")


class TestSentinelPatternPsychology:
    """Tests for GET /api/sentinel/pattern-psychology/{pattern_type} endpoint"""
    
    def test_psychology_for_double_top(self):
        """Test psychology endpoint for double_top pattern"""
        response = requests.get(f"{BASE_URL}/api/sentinel/pattern-psychology/double_top?lang=it")
        assert response.status_code == 200
        
        data = response.json()
        assert data["pattern_type"] == "double_top"
        assert data["language"] == "it"
        assert "psychology" in data
        
        psychology = data["psychology"]
        assert "cosa_succede" in psychology
        assert "perche" in psychology
        assert "azione" in psychology
        
        # Verify Italian content
        assert "prezzo" in psychology["cosa_succede"].lower() or "resistenza" in psychology["cosa_succede"].lower(), \
            "Psychology should be in Italian"
        
        print(f"✅ Double top psychology in Italian: {psychology['cosa_succede'][:60]}...")
    
    def test_psychology_for_double_bottom(self):
        """Test psychology endpoint for double_bottom pattern"""
        response = requests.get(f"{BASE_URL}/api/sentinel/pattern-psychology/double_bottom?lang=it")
        assert response.status_code == 200
        
        data = response.json()
        assert data["pattern_type"] == "double_bottom"
        assert "psychology" in data
        
        print(f"✅ Double bottom psychology retrieved")
    
    def test_psychology_for_head_and_shoulders(self):
        """Test psychology endpoint for head_and_shoulders pattern"""
        response = requests.get(f"{BASE_URL}/api/sentinel/pattern-psychology/head_and_shoulders?lang=it")
        assert response.status_code == 200
        
        data = response.json()
        assert data["pattern_type"] == "head_and_shoulders"
        
        print(f"✅ Head and shoulders psychology retrieved")
    
    def test_psychology_invalid_pattern_returns_404(self):
        """Test that invalid pattern type returns 404"""
        response = requests.get(f"{BASE_URL}/api/sentinel/pattern-psychology/invalid_pattern_xyz")
        assert response.status_code == 404
        
        print(f"✅ Invalid pattern returns 404 as expected")
    
    def test_psychology_english_language(self):
        """Test psychology endpoint with English language"""
        response = requests.get(f"{BASE_URL}/api/sentinel/pattern-psychology/double_top?lang=en")
        assert response.status_code == 200
        
        data = response.json()
        assert data["language"] == "en"
        
        # Should have English content
        psychology = data["psychology"]
        assert "price" in psychology["cosa_succede"].lower() or "resistance" in psychology["cosa_succede"].lower(), \
            "Psychology should be in English"
        
        print(f"✅ English psychology: {psychology['cosa_succede'][:60]}...")


class TestSentinelIntegration:
    """Integration tests for The Sentinel feature"""
    
    def test_scanner_detects_patterns_across_timeframes(self):
        """Test that scanner detects patterns across multiple timeframes"""
        response = requests.get(f"{BASE_URL}/api/sentinel/patterns?lang=it")
        data = response.json()
        
        patterns = data["patterns"]
        timeframes_with_patterns = set(p["timeframe"] for p in patterns)
        
        assert len(timeframes_with_patterns) >= 2, \
            f"Should detect patterns in multiple timeframes, got {timeframes_with_patterns}"
        
        print(f"✅ Patterns detected in {len(timeframes_with_patterns)} timeframes: {timeframes_with_patterns}")
    
    def test_confluence_detection_working(self):
        """Test that confluence detection is working"""
        response = requests.get(f"{BASE_URL}/api/sentinel/confluences?lang=it")
        data = response.json()
        
        assert data["total"] > 0, "Should have detected confluences"
        
        # Verify confluence has patterns from multiple timeframes
        if data["confluences"]:
            confluence = data["confluences"][0]
            assert len(confluence["timeframes"]) >= 2, \
                "Confluence should span multiple timeframes"
        
        print(f"✅ Confluence detection working: {data['total']} confluences found")
    
    def test_current_price_consistent_across_endpoints(self):
        """Test that current price is consistent across endpoints"""
        status_response = requests.get(f"{BASE_URL}/api/sentinel/status")
        patterns_response = requests.get(f"{BASE_URL}/api/sentinel/patterns")
        overlay_response = requests.get(f"{BASE_URL}/api/sentinel/chart-overlay")
        
        status_price = status_response.json()["current_price"]
        patterns_price = patterns_response.json()["current_price"]
        overlay_price = overlay_response.json()["current_price"]
        
        # Prices should be within 1% of each other (allowing for slight timing differences)
        assert abs(status_price - patterns_price) / status_price < 0.01, \
            f"Price mismatch: status={status_price}, patterns={patterns_price}"
        assert abs(status_price - overlay_price) / status_price < 0.01, \
            f"Price mismatch: status={status_price}, overlay={overlay_price}"
        
        print(f"✅ Current price consistent across endpoints: ~${status_price:,.0f}")
    
    def test_pattern_types_are_valid(self):
        """Test that all detected pattern types are valid"""
        response = requests.get(f"{BASE_URL}/api/sentinel/patterns?lang=it")
        data = response.json()
        
        valid_pattern_types = [
            "head_and_shoulders", "inverse_head_and_shoulders",
            "double_top", "double_bottom", "triple_top", "triple_bottom",
            "symmetrical_triangle", "ascending_triangle", "descending_triangle",
            "rising_wedge", "falling_wedge", "bull_flag", "bear_flag", "pennant",
            "support_line", "resistance_line", "trendline_up", "trendline_down",
            "bullish_engulfing", "bearish_engulfing", "doji", "hammer",
            "shooting_star", "morning_star", "evening_star"
        ]
        
        for pattern in data["patterns"]:
            assert pattern["type"] in valid_pattern_types, \
                f"Invalid pattern type: {pattern['type']}"
        
        print(f"✅ All {len(data['patterns'])} patterns have valid types")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
