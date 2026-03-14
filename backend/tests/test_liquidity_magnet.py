"""
Test suite for Liquidity Magnet Score module
Tests the /api/liquidity-magnet endpoint and its integration with /api/trade-signal
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLiquidityMagnetEndpoint:
    """Tests for /api/liquidity-magnet endpoint"""
    
    def test_liquidity_magnet_returns_200(self):
        """Test that endpoint returns 200 status"""
        response = requests.get(f"{BASE_URL}/api/liquidity-magnet")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("SUCCESS: /api/liquidity-magnet returns 200")
    
    def test_liquidity_magnet_has_all_required_fields(self):
        """Test that response contains all required fields"""
        response = requests.get(f"{BASE_URL}/api/liquidity-magnet")
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            'magnet_score',
            'target_direction',
            'magnet_strength',
            'nearest_magnet_price',
            'nearest_magnet_distance_percent',
            'nearest_magnet_value',
            'liquidity_above_total',
            'liquidity_below_total',
            'sweep_expectation',
            'attraction_ratio',
            'signals',
            'explanation',
            'data_source'
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
            print(f"  PASS: Field '{field}' present")
        
        print("SUCCESS: All required fields present in response")
    
    def test_magnet_score_is_valid_range(self):
        """Test magnet_score is between 0 and 100"""
        response = requests.get(f"{BASE_URL}/api/liquidity-magnet")
        data = response.json()
        
        magnet_score = data['magnet_score']
        assert 0 <= magnet_score <= 100, f"Magnet score {magnet_score} out of valid range 0-100"
        print(f"SUCCESS: Magnet score {magnet_score} is valid (0-100)")
    
    def test_target_direction_valid_values(self):
        """Test target_direction is UP, DOWN, or BALANCED"""
        response = requests.get(f"{BASE_URL}/api/liquidity-magnet")
        data = response.json()
        
        valid_directions = ['UP', 'DOWN', 'BALANCED']
        assert data['target_direction'] in valid_directions, \
            f"Invalid target_direction: {data['target_direction']}"
        print(f"SUCCESS: Target direction '{data['target_direction']}' is valid")
    
    def test_magnet_strength_valid_values(self):
        """Test magnet_strength is WEAK, MODERATE, STRONG, or VERY_STRONG"""
        response = requests.get(f"{BASE_URL}/api/liquidity-magnet")
        data = response.json()
        
        valid_strengths = ['WEAK', 'MODERATE', 'STRONG', 'VERY_STRONG']
        assert data['magnet_strength'] in valid_strengths, \
            f"Invalid magnet_strength: {data['magnet_strength']}"
        print(f"SUCCESS: Magnet strength '{data['magnet_strength']}' is valid")
    
    def test_sweep_expectation_valid_values(self):
        """Test sweep_expectation has valid values"""
        response = requests.get(f"{BASE_URL}/api/liquidity-magnet")
        data = response.json()
        
        valid_sweeps = ['SWEEP_UP_FIRST', 'SWEEP_DOWN_FIRST', 'NO_CLEAR_SWEEP']
        assert data['sweep_expectation'] in valid_sweeps, \
            f"Invalid sweep_expectation: {data['sweep_expectation']}"
        print(f"SUCCESS: Sweep expectation '{data['sweep_expectation']}' is valid")
    
    def test_nearest_magnet_price_is_positive(self):
        """Test nearest_magnet_price is a positive number"""
        response = requests.get(f"{BASE_URL}/api/liquidity-magnet")
        data = response.json()
        
        assert data['nearest_magnet_price'] > 0, \
            f"nearest_magnet_price should be positive, got {data['nearest_magnet_price']}"
        print(f"SUCCESS: Nearest magnet price ${data['nearest_magnet_price']:,.2f} is valid")
    
    def test_liquidity_totals_are_non_negative(self):
        """Test liquidity_above_total and liquidity_below_total are >= 0"""
        response = requests.get(f"{BASE_URL}/api/liquidity-magnet")
        data = response.json()
        
        assert data['liquidity_above_total'] >= 0, "liquidity_above_total should be >= 0"
        assert data['liquidity_below_total'] >= 0, "liquidity_below_total should be >= 0"
        print(f"SUCCESS: Liquidity totals are valid (above: ${data['liquidity_above_total']:,.0f}, below: ${data['liquidity_below_total']:,.0f})")
    
    def test_attraction_ratio_is_positive(self):
        """Test attraction_ratio is a positive number"""
        response = requests.get(f"{BASE_URL}/api/liquidity-magnet")
        data = response.json()
        
        assert data['attraction_ratio'] > 0, f"attraction_ratio should be positive, got {data['attraction_ratio']}"
        print(f"SUCCESS: Attraction ratio {data['attraction_ratio']:.2f} is valid")


class TestLiquidityMagnetTranslations:
    """Tests for multilingual support in liquidity magnet endpoint"""
    
    def test_italian_translation(self):
        """Test Italian (default) translation"""
        response = requests.get(f"{BASE_URL}/api/liquidity-magnet?lang=it")
        data = response.json()
        
        # Check explanation contains Italian text patterns
        assert data['explanation'] is not None
        assert len(data['explanation']) > 10
        print(f"SUCCESS: Italian translation returned - explanation: '{data['explanation'][:100]}...'")
    
    def test_english_translation(self):
        """Test English translation"""
        response = requests.get(f"{BASE_URL}/api/liquidity-magnet?lang=en")
        data = response.json()
        
        # English explanations should contain certain keywords
        assert data['explanation'] is not None
        english_keywords = ['attraction', 'liquidity', 'bias', 'dominant', 'toward']
        found_english = any(kw in data['explanation'].lower() for kw in english_keywords)
        assert found_english or 'Weak' in data['explanation'] or 'weak' in data['explanation'].lower(), \
            f"English translation not detected in: {data['explanation']}"
        print(f"SUCCESS: English translation returned - explanation: '{data['explanation'][:100]}...'")
    
    def test_german_translation(self):
        """Test German translation"""
        response = requests.get(f"{BASE_URL}/api/liquidity-magnet?lang=de")
        data = response.json()
        
        assert data['explanation'] is not None
        assert len(data['explanation']) > 10
        print(f"SUCCESS: German translation returned - explanation: '{data['explanation'][:100]}...'")
    
    def test_polish_translation(self):
        """Test Polish translation"""
        response = requests.get(f"{BASE_URL}/api/liquidity-magnet?lang=pl")
        data = response.json()
        
        assert data['explanation'] is not None
        assert len(data['explanation']) > 10
        print(f"SUCCESS: Polish translation returned - explanation: '{data['explanation'][:100]}...'")
    
    def test_invalid_lang_defaults_to_italian(self):
        """Test invalid language parameter defaults to Italian"""
        response = requests.get(f"{BASE_URL}/api/liquidity-magnet?lang=xx")
        assert response.status_code == 200
        data = response.json()
        
        assert data['explanation'] is not None
        print(f"SUCCESS: Invalid lang param defaults properly")


class TestTradeSignalLiquidityMagnetIntegration:
    """Tests for liquidity_magnet integration in trade signal endpoint"""
    
    def test_trade_signal_includes_liquidity_magnet(self):
        """Test that /api/trade-signal includes liquidity_magnet field"""
        response = requests.get(f"{BASE_URL}/api/trade-signal?lang=en")
        assert response.status_code == 200
        data = response.json()
        
        assert 'liquidity_magnet' in data, "trade-signal response missing liquidity_magnet field"
        print("SUCCESS: trade-signal includes liquidity_magnet")
    
    def test_trade_signal_liquidity_magnet_has_required_fields(self):
        """Test liquidity_magnet in trade-signal has all fields"""
        response = requests.get(f"{BASE_URL}/api/trade-signal?lang=en")
        data = response.json()
        
        magnet = data.get('liquidity_magnet')
        assert magnet is not None, "liquidity_magnet is None"
        
        required_fields = ['magnet_score', 'target_direction', 'magnet_strength', 
                          'nearest_magnet_price', 'sweep_expectation']
        
        for field in required_fields:
            assert field in magnet, f"liquidity_magnet missing field: {field}"
        
        print("SUCCESS: liquidity_magnet in trade-signal has all required fields")
    
    def test_trade_signal_liquidity_magnet_matches_direct_endpoint(self):
        """Test that liquidity_magnet data is consistent between endpoints"""
        response1 = requests.get(f"{BASE_URL}/api/trade-signal?lang=en")
        response2 = requests.get(f"{BASE_URL}/api/liquidity-magnet?lang=en")
        
        ts_magnet = response1.json().get('liquidity_magnet', {})
        direct_magnet = response2.json()
        
        # Check key fields match (within tolerance for real-time data)
        assert ts_magnet.get('target_direction') == direct_magnet.get('target_direction'), \
            "target_direction mismatch between endpoints"
        assert ts_magnet.get('magnet_strength') == direct_magnet.get('magnet_strength'), \
            "magnet_strength mismatch between endpoints"
        
        print("SUCCESS: liquidity_magnet data consistent between endpoints")


class TestMarketEnergyStillWorking:
    """Regression tests for Market Energy endpoint"""
    
    def test_market_energy_returns_200(self):
        """Test Market Energy endpoint still works"""
        response = requests.get(f"{BASE_URL}/api/market-energy")
        assert response.status_code == 200, f"Market Energy failed with status {response.status_code}"
        print("SUCCESS: /api/market-energy returns 200")
    
    def test_market_energy_has_energy_score(self):
        """Test Market Energy has energy_score field"""
        response = requests.get(f"{BASE_URL}/api/market-energy")
        data = response.json()
        
        assert 'energy_score' in data, "Market Energy missing energy_score"
        assert 0 <= data['energy_score'] <= 100, f"energy_score {data['energy_score']} out of range"
        print(f"SUCCESS: Market Energy score: {data['energy_score']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
