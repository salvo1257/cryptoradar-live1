import requests
import sys
import json
from datetime import datetime
import time

class CryptoRadarAPITester:
    def __init__(self, base_url="https://btc-intelligence.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
    def log_result(self, name, success, response_data=None, error=None):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            
        result = {
            "test": name,
            "success": success,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data,
            "error": str(error) if error else None
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"\n{status} - {name}")
        if error:
            print(f"   Error: {error}")
        elif response_data:
            print(f"   Response keys: {list(response_data.keys()) if isinstance(response_data, dict) else 'Non-dict response'}")
    
    def run_test(self, name, method, endpoint, expected_status=200, params=None, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=15)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=15)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=15)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=15)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            success = response.status_code == expected_status
            response_data = None
            
            if success:
                try:
                    response_data = response.json()
                except:
                    response_data = response.text
                    
            self.log_result(name, success, response_data, 
                          f"Expected {expected_status}, got {response.status_code}" if not success else None)
            
            return success, response_data
            
        except Exception as e:
            self.log_result(name, False, None, e)
            return False, {}
    
    def test_health_check(self):
        """Test system health"""
        return self.run_test("Health Check", "GET", "health")
    
    def test_market_status(self):
        """Test market status endpoint"""
        return self.run_test("Market Status", "GET", "market/status")
    
    def test_chart_candles(self):
        """Test chart candles with different timeframes"""
        timeframes = ["15m", "1h", "4h", "1d"]
        all_passed = True
        
        for tf in timeframes:
            success, data = self.run_test(f"Chart Candles ({tf})", "GET", "chart/candles", params={"interval": tf})
            if not success:
                all_passed = False
                
        return all_passed
    
    def test_market_bias(self):
        """Test market bias analysis"""
        return self.run_test("Market Bias", "GET", "market/bias")
    
    def test_support_resistance(self):
        """Test support/resistance levels"""
        return self.run_test("Support/Resistance", "GET", "support-resistance")
    
    def test_liquidity(self):
        """Test liquidity analysis"""
        return self.run_test("Liquidity Analysis", "GET", "liquidity")
    
    def test_whale_alerts(self):
        """Test whale alerts"""
        return self.run_test("Whale Alerts", "GET", "whale-alerts")
    
    def test_patterns(self):
        """Test pattern detection"""
        return self.run_test("Pattern Detection", "GET", "patterns")
    
    def test_candlestick_patterns(self):
        """Test candlestick patterns"""
        return self.run_test("Candlestick Patterns", "GET", "candlesticks")
    
    def test_orderbook(self):
        """Test orderbook analysis"""
        return self.run_test("Orderbook Analysis", "GET", "orderbook")
    
    def test_news(self):
        """Test news endpoint"""
        return self.run_test("News", "GET", "news")
    
    def test_alerts_crud(self):
        """Test alerts CRUD operations"""
        # Get existing alerts
        success, alerts_data = self.run_test("Get Alerts", "GET", "alerts")
        if not success:
            return False
            
        # Create a new alert
        alert_data = {
            "price": 50000.0,
            "condition": "above",
            "send_telegram": False
        }
        success, created_alert = self.run_test("Create Alert", "POST", "alerts", 201, data=alert_data)
        if not success:
            return False
            
        alert_id = created_alert.get('id') if created_alert else None
        if not alert_id:
            print("   Warning: No alert ID returned from create")
            return False
            
        # Delete the alert
        success, _ = self.run_test("Delete Alert", "DELETE", f"alerts/{alert_id}")
        return success
    
    def test_notes_crud(self):
        """Test notes CRUD operations"""
        # Get existing notes
        success, notes_data = self.run_test("Get Notes", "GET", "notes")
        if not success:
            return False
            
        # Create a new note
        note_data = {"content": "Test note for API testing"}
        success, created_note = self.run_test("Create Note", "POST", "notes", 201, data=note_data)
        if not success:
            return False
            
        note_id = created_note.get('id') if created_note else None
        if not note_id:
            print("   Warning: No note ID returned from create")
            return False
            
        # Update the note
        update_data = {"content": "Updated test note"}
        success, _ = self.run_test("Update Note", "PUT", f"notes/{note_id}", data=update_data)
        if not success:
            return False
            
        # Delete the note
        success, _ = self.run_test("Delete Note", "DELETE", f"notes/{note_id}")
        return success
    
    def test_settings(self):
        """Test settings endpoints"""
        # Get settings
        success, settings_data = self.run_test("Get Settings", "GET", "settings")
        if not success:
            return False
            
        # Update settings
        updated_settings = {
            "language": "en",
            "telegram_enabled": False,
            "alert_sound": True,
            "notify_whale_alerts": True,
            "notify_patterns": True,
            "notify_candlesticks": True,
            "notify_price_alerts": True,
            "notify_sr_breaks": True
        }
        success, _ = self.run_test("Update Settings", "PUT", "settings", data=updated_settings)
        return success
    
    def test_alert_history(self):
        """Test alert history"""
        return self.run_test("Alert History", "GET", "alerts/history")
    
    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting CryptoRadar API Tests")
        print(f"🌐 Base URL: {self.base_url}")
        print("=" * 50)
        
        # Core system tests
        self.test_health_check()
        
        # Market data tests
        self.test_market_status()
        self.test_chart_candles()
        self.test_market_bias()
        
        # Analysis endpoints
        self.test_support_resistance()
        self.test_liquidity()
        self.test_whale_alerts()
        self.test_patterns()
        self.test_candlestick_patterns()
        self.test_orderbook()
        
        # Content endpoints
        self.test_news()
        
        # CRUD operations
        self.test_alerts_crud()
        self.test_notes_crud()
        self.test_alert_history()
        
        # Settings
        self.test_settings()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} test(s) failed")
            
        # Check for critical failures
        critical_endpoints = ["health", "market/status", "chart/candles"]
        critical_failures = []
        
        for result in self.test_results:
            if not result["success"]:
                endpoint = result["test"].lower()
                if any(critical in endpoint for critical in critical_endpoints):
                    critical_failures.append(result["test"])
        
        if critical_failures:
            print(f"🚨 Critical failures detected: {', '.join(critical_failures)}")
            return False
            
        return self.tests_passed >= self.tests_run * 0.8  # 80% success rate
        
def main():
    tester = CryptoRadarAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/test_reports/backend_api_results.json', 'w') as f:
        json.dump(tester.test_results, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())