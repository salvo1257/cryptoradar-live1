"""
Test Suite for Sentinel v4.5 - 'Glued-to-Chart' SVG Overlay Anchoring
=====================================================================
Tests the backend API endpoints for pattern detection with proper
draw_data coordinates (start/end with index and price) for TradingView
chart anchoring during zoom/pan operations.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSentinelPatternsChartAPI:
    """Test /api/sentinel/patterns/chart endpoint for draw_data coordinates"""
    
    def test_patterns_chart_endpoint_returns_200(self):
        """Verify patterns/chart endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/sentinel/patterns/chart?lang=it")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✅ /api/sentinel/patterns/chart returns 200")
    
    def test_patterns_have_draw_data(self):
        """Verify all patterns have draw_data field"""
        response = requests.get(f"{BASE_URL}/api/sentinel/patterns/chart?lang=it")
        data = response.json()
        patterns = data.get('patterns', [])
        
        assert len(patterns) > 0, "No patterns returned"
        
        for pattern in patterns:
            assert 'draw_data' in pattern, f"Pattern {pattern.get('id')} missing draw_data"
        
        print(f"✅ All {len(patterns)} patterns have draw_data field")
    
    def test_draw_data_has_shape(self):
        """Verify draw_data includes shape type"""
        response = requests.get(f"{BASE_URL}/api/sentinel/patterns/chart?lang=it")
        data = response.json()
        patterns = data.get('patterns', [])
        
        valid_shapes = ['horizontal_line', 'diagonal_line', 'converging_lines', 'marker', 'elliott_wave', 'elliott_complete']
        
        for pattern in patterns:
            draw_data = pattern.get('draw_data', {})
            shape = draw_data.get('shape')
            assert shape is not None, f"Pattern {pattern.get('id')} missing shape"
            assert shape in valid_shapes, f"Invalid shape '{shape}' for pattern {pattern.get('id')}"
        
        print("✅ All patterns have valid shape in draw_data")
    
    def test_double_top_bottom_has_start_end_coordinates(self):
        """Verify double_top/double_bottom patterns have start/end with index and price"""
        response = requests.get(f"{BASE_URL}/api/sentinel/patterns/chart?lang=it")
        data = response.json()
        patterns = data.get('patterns', [])
        
        double_patterns = [p for p in patterns if p.get('type') in ['double_top', 'double_bottom']]
        
        if len(double_patterns) == 0:
            pytest.skip("No double_top/double_bottom patterns detected")
        
        for pattern in double_patterns:
            draw_data = pattern.get('draw_data', {})
            start = draw_data.get('start')
            end = draw_data.get('end')
            
            assert start is not None, f"Pattern {pattern.get('id')} missing start"
            assert end is not None, f"Pattern {pattern.get('id')} missing end"
            
            assert 'index' in start, f"Pattern {pattern.get('id')} start missing index"
            assert 'price' in start, f"Pattern {pattern.get('id')} start missing price"
            assert 'index' in end, f"Pattern {pattern.get('id')} end missing index"
            assert 'price' in end, f"Pattern {pattern.get('id')} end missing price"
        
        print(f"✅ {len(double_patterns)} double_top/double_bottom patterns have start/end coordinates")
    
    def test_trendline_has_start_end_coordinates(self):
        """Verify trendline patterns have start/end with index and price"""
        response = requests.get(f"{BASE_URL}/api/sentinel/patterns/chart?lang=it")
        data = response.json()
        patterns = data.get('patterns', [])
        
        trendline_patterns = [p for p in patterns if p.get('type') in ['trendline_up', 'trendline_down']]
        
        if len(trendline_patterns) == 0:
            pytest.skip("No trendline patterns detected")
        
        for pattern in trendline_patterns:
            draw_data = pattern.get('draw_data', {})
            start = draw_data.get('start')
            end = draw_data.get('end')
            
            assert start is not None, f"Pattern {pattern.get('id')} missing start"
            assert end is not None, f"Pattern {pattern.get('id')} missing end"
            
            # Trendlines should have diagonal_line shape
            assert draw_data.get('shape') == 'diagonal_line', f"Trendline should have diagonal_line shape"
        
        print(f"✅ {len(trendline_patterns)} trendline patterns have start/end coordinates")
    
    def test_support_resistance_has_price(self):
        """Verify support/resistance lines have price for horizontal drawing"""
        response = requests.get(f"{BASE_URL}/api/sentinel/patterns/chart?lang=it")
        data = response.json()
        patterns = data.get('patterns', [])
        
        sr_patterns = [p for p in patterns if p.get('type') in ['support_line', 'resistance_line']]
        
        if len(sr_patterns) == 0:
            pytest.skip("No support/resistance patterns detected")
        
        for pattern in sr_patterns:
            draw_data = pattern.get('draw_data', {})
            price = draw_data.get('price')
            
            assert price is not None, f"Pattern {pattern.get('id')} missing price"
            assert draw_data.get('shape') == 'horizontal_line', f"S/R should have horizontal_line shape"
        
        print(f"✅ {len(sr_patterns)} support/resistance patterns have price for horizontal line")


class TestSentinelChartOverlayAPI:
    """Test /api/sentinel/chart-overlay endpoint"""
    
    def test_chart_overlay_returns_200(self):
        """Verify chart-overlay endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/sentinel/chart-overlay")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✅ /api/sentinel/chart-overlay returns 200")
    
    def test_chart_overlay_has_required_fields(self):
        """Verify chart-overlay response has required structure"""
        response = requests.get(f"{BASE_URL}/api/sentinel/chart-overlay")
        data = response.json()
        
        assert 'chart_data' in data, "Missing chart_data field"
        assert 'legend' in data, "Missing legend field"
        
        chart_data = data.get('chart_data', {})
        assert 'patterns' in chart_data, "Missing patterns in chart_data"
        assert 'trendlines' in chart_data, "Missing trendlines in chart_data"
        
        print("✅ chart-overlay has required fields (chart_data, legend, patterns, trendlines)")


class TestSentinelGhostProjectionsAPI:
    """Test /api/sentinel/ghost-projections endpoint"""
    
    def test_ghost_projections_returns_200(self):
        """Verify ghost-projections endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/sentinel/ghost-projections?timeframe=4h&lang=it")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✅ /api/sentinel/ghost-projections returns 200")
    
    def test_ghost_projections_structure(self):
        """Verify ghost projections have proper structure"""
        response = requests.get(f"{BASE_URL}/api/sentinel/ghost-projections?timeframe=4h&lang=it")
        data = response.json()
        
        assert 'projections' in data, "Missing projections field"
        projections = data.get('projections', [])
        
        if len(projections) > 0:
            proj = projections[0]
            # Check for required fields
            assert 'start' in proj or 'target' in proj, "Projection missing start/target"
            assert 'direction' in proj, "Projection missing direction"
            print(f"✅ {len(projections)} ghost projections have proper structure")
        else:
            print("⚠️ No ghost projections currently available (this is normal)")


class TestSentinelItalianLocalization:
    """Test Italian localization in pattern responses"""
    
    def test_patterns_have_italian_psychology(self):
        """Verify patterns have Italian psychology text"""
        response = requests.get(f"{BASE_URL}/api/sentinel/patterns/chart?lang=it")
        data = response.json()
        patterns = data.get('patterns', [])
        
        if len(patterns) == 0:
            pytest.skip("No patterns to test")
        
        # Check first pattern with psychology
        for pattern in patterns:
            psychology = pattern.get('psychology', {})
            if psychology:
                # Check for Italian keys
                assert 'cosa_succede' in psychology, "Missing 'cosa_succede' in psychology"
                assert 'perche' in psychology, "Missing 'perche' in psychology"
                assert 'azione' in psychology, "Missing 'azione' in psychology"
                
                # Verify content is in Italian (check for common Italian words)
                cosa_succede = psychology.get('cosa_succede', '')
                italian_indicators = ['il', 'la', 'che', 'di', 'un', 'una', 'prezzo', 'livello']
                has_italian = any(word in cosa_succede.lower() for word in italian_indicators)
                assert has_italian, f"Psychology text doesn't appear to be in Italian: {cosa_succede[:100]}"
                
                print("✅ Patterns have Italian psychology (cosa_succede, perche, azione)")
                return
        
        pytest.skip("No patterns with psychology found")


class TestSentinelStatusAPI:
    """Test /api/sentinel/status endpoint"""
    
    def test_status_returns_200(self):
        """Verify status endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/sentinel/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✅ /api/sentinel/status returns 200")
    
    def test_status_scanner_running(self):
        """Verify scanner is running"""
        response = requests.get(f"{BASE_URL}/api/sentinel/status")
        data = response.json()
        
        assert data.get('running') == True, "Scanner should be running"
        assert data.get('patterns_detected', 0) > 0, "Should have detected patterns"
        
        print(f"✅ Scanner running with {data.get('patterns_detected')} patterns detected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
