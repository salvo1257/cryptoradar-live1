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
        success, created_alert = self.run_test("Create Alert", "POST", "alerts", 200, data=alert_data)
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
        success, created_note = self.run_test("Create Note", "POST", "notes", 200, data=note_data)
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
    
    def test_kraken_data_sources(self):
        """Test that APIs are returning real Kraken data"""
        print("\n🔍 Testing Real Kraken Data Sources...")
        
        # Test market status has Kraken data source
        success, data = self.run_test("Market Status - Kraken Source", "GET", "market/status")
        if success and isinstance(data, dict):
            data_source = data.get('data_source')
            if data_source != 'Kraken':
                self.log_result("Market Status Kraken Source Check", False, None, f"Expected 'Kraken', got '{data_source}'")
                return False
            else:
                print(f"   ✅ Data source: {data_source}")
        
        # Test chart candles has Kraken data source  
        success, data = self.run_test("Chart Candles - Kraken Source", "GET", "chart/candles")
        if success and isinstance(data, dict):
            data_source = data.get('data_source')
            if data_source != 'Kraken':
                self.log_result("Chart Candles Kraken Source Check", False, None, f"Expected 'Kraken', got '{data_source}'")
                return False
            else:
                print(f"   ✅ Data source: {data_source}")
        
        # Test orderbook has Kraken data source
        success, data = self.run_test("Orderbook - Kraken Source", "GET", "orderbook")
        if success and isinstance(data, dict):
            data_source = data.get('data_source')
            if data_source != 'Kraken':
                self.log_result("Orderbook Kraken Source Check", False, None, f"Expected 'Kraken', got '{data_source}'")
                return False
            else:
                print(f"   ✅ Data source: {data_source}")
        
        # Test news has CryptoCompare data source
        success, data = self.run_test("News - CryptoCompare Source", "GET", "news")
        if success and isinstance(data, dict):
            data_source = data.get('data_source')
            if data_source != 'CryptoCompare':
                self.log_result("News CryptoCompare Source Check", False, None, f"Expected 'CryptoCompare', got '{data_source}'")
                return False
            else:
                print(f"   ✅ Data source: {data_source}")
        
        return True

    def test_real_market_data_validity(self):
        """Test that market data contains valid real values"""
        print("\n🔍 Testing Real Market Data Validity...")
        
        # Test market status has realistic BTC values
        success, data = self.run_test("Market Status - Data Validity", "GET", "market/status")
        if success and isinstance(data, dict):
            price = data.get('price', 0)
            volume = data.get('volume_24h', 0)
            
            # BTC should be between reasonable ranges
            if price < 20000 or price > 200000:
                self.log_result("Market Status Price Range Check", False, None, f"Price {price} seems unrealistic")
                return False
            
            if volume < 0:
                self.log_result("Market Status Volume Check", False, None, f"Volume {volume} should be positive")
                return False
                
            print(f"   ✅ BTC Price: ${price:,.2f}")
            print(f"   ✅ 24h Volume: {volume:,.0f}")
        
        # Test candles have realistic OHLC data
        success, data = self.run_test("Candles - Data Validity", "GET", "chart/candles")
        if success and isinstance(data, dict):
            candles = data.get('candles', [])
            if len(candles) > 0:
                recent_candle = candles[-1]
                ohlc = [recent_candle.get(k, 0) for k in ['open', 'high', 'low', 'close']]
                
                # Basic OHLC validation
                if not all(20000 <= val <= 200000 for val in ohlc):
                    self.log_result("Candles OHLC Range Check", False, None, f"OHLC values seem unrealistic: {ohlc}")
                    return False
                
                if recent_candle.get('high') < recent_candle.get('low'):
                    self.log_result("Candles High/Low Check", False, None, "High should be >= Low")
                    return False
                    
                print(f"   ✅ Recent candle OHLC valid")
        
        return True

    def test_orderbook_real_data(self):
        """Test that orderbook contains real bid/ask walls"""
        print("\n🔍 Testing Real Orderbook Data...")
        
        success, data = self.run_test("Orderbook - Real Walls", "GET", "orderbook")
        if success and isinstance(data, dict):
            bid_wall = data.get('top_bid_wall', {})
            ask_wall = data.get('top_ask_wall', {})
            
            bid_price = bid_wall.get('price', 0)
            ask_price = ask_wall.get('price', 0)
            
            # Bid should be lower than ask
            if bid_price >= ask_price:
                self.log_result("Orderbook Spread Check", False, None, f"Bid {bid_price} should be < Ask {ask_price}")
                return False
                
            # Prices should be realistic
            if bid_price < 20000 or ask_price > 200000:
                self.log_result("Orderbook Price Range Check", False, None, f"Bid/Ask prices seem unrealistic")
                return False
                
            print(f"   ✅ Bid: ${bid_price}, Ask: ${ask_price}")
            print(f"   ✅ Spread: ${ask_price - bid_price:.2f}")
        
        return True

    def test_market_bias_orderbook_integration(self):
        """Test that market bias includes real orderbook data"""
        print("\n🔍 Testing Market Bias Orderbook Integration...")
        
        success, data = self.run_test("Market Bias - Orderbook Integration", "GET", "market/bias")
        if success and isinstance(data, dict):
            inputs = data.get('inputs', {})
            
            # Check if orderbook score and imbalance are included
            if 'orderbook_score' not in inputs:
                self.log_result("Market Bias Orderbook Score Check", False, None, "Missing orderbook_score in inputs")
                return False
                
            if 'orderbook_imbalance' not in inputs:
                self.log_result("Market Bias Orderbook Imbalance Check", False, None, "Missing orderbook_imbalance in inputs")
                return False
                
            ob_score = inputs.get('orderbook_score')
            ob_imbalance = inputs.get('orderbook_imbalance')
            
            print(f"   ✅ Orderbook Score: {ob_score}")
            print(f"   ✅ Orderbook Imbalance: {ob_imbalance}%")
        
        return True

    def test_support_resistance_orderbook_levels(self):
        """Test that S/R includes orderbook-based levels"""
        print("\n🔍 Testing S/R Orderbook Levels...")
        
        success, data = self.run_test("S/R - Orderbook Levels", "GET", "support-resistance")
        if success and isinstance(data, dict):
            levels = data.get('levels', [])
            
            # Check for orderbook-based levels
            orderbook_levels = [level for level in levels if level.get('timeframe') == 'OrderBook']
            
            if len(orderbook_levels) == 0:
                print("   ⚠️  No orderbook-based S/R levels found (may be normal)")
            else:
                print(f"   ✅ Found {len(orderbook_levels)} orderbook-based S/R levels")
        
        return True

    def test_liquidity_orderbook_clusters(self):
        """Test that liquidity uses real orderbook for clusters"""
        print("\n🔍 Testing Liquidity Orderbook Clusters...")
        
        success, data = self.run_test("Liquidity - Orderbook Clusters", "GET", "liquidity")
        if success and isinstance(data, dict):
            data_source = data.get('data_source')
            if 'Kraken' not in data_source and 'OrderBook' not in data_source:
                self.log_result("Liquidity Data Source Check", False, None, f"Expected Kraken/OrderBook source, got '{data_source}'")
                return False
                
            clusters = data.get('clusters', [])
            direction = data.get('direction', {})
            
            print(f"   ✅ Data source: {data_source}")
            print(f"   ✅ Found {len(clusters)} liquidity clusters")
            print(f"   ✅ Direction: {direction.get('direction', 'N/A')}")
        
        return True

    def test_whale_alerts_real_volume(self):
        """Test that whale alerts detect real volume spikes"""
        print("\n🔍 Testing Whale Alerts Real Volume Detection...")
        
        success, data = self.run_test("Whale Alerts - Real Volume", "GET", "whale-alerts")
        if success and isinstance(data, dict):
            alerts = data.get('alerts', [])
            data_source = data.get('data_source')
            
            if data_source != 'Kraken':
                self.log_result("Whale Alerts Data Source Check", False, None, f"Expected 'Kraken', got '{data_source}'")
                return False
                
            print(f"   ✅ Data source: {data_source}")
            print(f"   ✅ Found {len(alerts)} whale alerts")
            
            # Check alert structure if any exist
            for alert in alerts[:2]:  # Check first 2
                if alert.get('confidence', 0) < 50:
                    print(f"   ⚠️  Low confidence alert: {alert.get('confidence')}%")
        
        return True

    def test_news_sentiment_analysis(self):
        """Test that news includes sentiment analysis"""
        print("\n🔍 Testing News Sentiment Analysis...")
        
        success, data = self.run_test("News - Sentiment Analysis", "GET", "news")
        if success and isinstance(data, dict):
            news_items = data.get('news', [])
            
            if len(news_items) == 0:
                print("   ⚠️  No news items found")
                return True
                
            sentiments_found = set()
            for item in news_items:
                sentiment = item.get('sentiment')
                if sentiment:
                    sentiments_found.add(sentiment)
                    
            if len(sentiments_found) == 0:
                self.log_result("News Sentiment Check", False, None, "No sentiment found in news items")
                return False
                
            print(f"   ✅ Found sentiments: {list(sentiments_found)}")
            print(f"   ✅ Total news items: {len(news_items)}")
        
        return True

    def run_all_tests(self):
        """Run all API tests including new real data validation"""
        print("🚀 Starting CryptoRadar v1.1 API Tests")
        print(f"🌐 Base URL: {self.base_url}")
        print("=" * 60)
        
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
        
        # CRUD operations (fix expected status codes)
        self.test_alerts_crud()
        self.test_notes_crud()
        self.test_alert_history()
        
        # Settings
        self.test_settings()
        
        # NEW: Real data validation tests
        print("\n" + "=" * 60)
        print("🔍 REAL DATA VALIDATION TESTS")
        print("=" * 60)
        
        self.test_kraken_data_sources()
        self.test_real_market_data_validity()
        self.test_orderbook_real_data()
        self.test_market_bias_orderbook_integration()
        self.test_support_resistance_orderbook_levels()
        self.test_liquidity_orderbook_clusters()
        self.test_whale_alerts_real_volume()
        self.test_news_sentiment_analysis()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} test(s) failed")
            
        # Check for critical failures
        critical_endpoints = ["health", "market/status", "chart/candles", "kraken", "data source"]
        critical_failures = []
        
        for result in self.test_results:
            if not result["success"]:
                endpoint = result["test"].lower()
                if any(critical in endpoint for critical in critical_endpoints):
                    critical_failures.append(result["test"])
        
        if critical_failures:
            print(f"🚨 Critical failures detected: {', '.join(critical_failures)}")
            return False
            
        return self.tests_passed >= self.tests_run * 0.85  # 85% success rate for v1.1
        
def main():
    tester = CryptoRadarAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/test_reports/backend_api_results.json', 'w') as f:
        json.dump(tester.test_results, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())