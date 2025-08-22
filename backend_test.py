#!/usr/bin/env python3
"""
Aid-Connect Backend API Testing Suite
Tests all API endpoints for the community help platform
"""

import requests
import sys
import json
from datetime import datetime, timedelta
import time

class AidConnectAPITester:
    def __init__(self, base_url="https://aid-connect-5.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_request_id = None
        self.created_offer_id = None

    def log(self, message, level="INFO"):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if not endpoint.startswith('http') else endpoint
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}", "PASS")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}", "FAIL")
                try:
                    error_detail = response.json()
                    self.log(f"   Error details: {error_detail}", "ERROR")
                except:
                    self.log(f"   Response text: {response.text[:200]}", "ERROR")
                return False, {}

        except requests.exceptions.Timeout:
            self.log(f"❌ {name} - Request timed out", "FAIL")
            return False, {}
        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}", "FAIL")
            return False, {}

    def test_health_check(self):
        """Test basic health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        if success:
            self.log(f"   Services status: {response.get('services', {})}")
        return success

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root Endpoint",
            "GET",
            "",
            200
        )
        if success:
            self.log(f"   Message: {response.get('message', 'No message')}")
        return success

    def test_user_registration(self):
        """Test user registration"""
        test_user_data = {
            "email": "test-user@example.com",
            "password": "testpass123",
            "phone": "+1234567890",
            "profile": {
                "name": "Test User",
                "location": {
                    "latitude": 40.7128,
                    "longitude": -74.0060,
                    "address": "New York, NY"
                },
                "bio": "Test user for API testing"
            }
        }

        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response.get('user_id')
            self.log(f"   Registered user ID: {self.user_id}")
            return True
        return False

    def test_user_login(self):
        """Test user login"""
        login_data = {
            "email": "test-user@example.com",
            "password": "testpass123"
        }

        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response.get('user_id')
            self.log(f"   Login successful for user: {self.user_id}")
            return True
        return False

    def test_get_user_profile(self):
        """Test getting current user profile"""
        if not self.token:
            self.log("❌ No token available for profile test", "FAIL")
            return False

        success, response = self.run_test(
            "Get User Profile",
            "GET",
            "auth/me",
            200
        )
        
        if success:
            self.log(f"   User name: {response.get('profile', {}).get('name', 'Unknown')}")
            self.log(f"   User stats: {response.get('stats', {})}")
        return success

    def test_create_help_request(self):
        """Test creating a help request"""
        if not self.token:
            self.log("❌ No token available for request creation", "FAIL")
            return False

        request_data = {
            "title": "Need help with groceries",
            "description": "I need someone to help me get groceries from the store. I have mobility issues and would appreciate assistance with shopping and carrying bags.",
            "category": "food",
            "location": {
                "latitude": 40.7128,
                "longitude": -74.0060,
                "address": "New York, NY"
            }
        }

        success, response = self.run_test(
            "Create Help Request",
            "POST",
            "requests",
            200,
            data=request_data
        )
        
        if success:
            self.created_request_id = response.get('request_id')
            self.log(f"   Created request ID: {self.created_request_id}")
            self.log(f"   AI classified category: {response.get('category')}")
            self.log(f"   AI urgency score: {response.get('urgency_score')}")
            self.log(f"   AI priority: {response.get('priority')}")
            self.log(f"   AI matches found: {len(response.get('matching', {}).get('ai_matches', []))}")
            
            # Verify AI classification is reasonable for grocery request
            if response.get('category') == 'food' and 1 <= response.get('urgency_score', 0) <= 6:
                self.log("   ✅ AI classification looks reasonable for grocery request")
            else:
                self.log("   ⚠️ AI classification might be unexpected for grocery request")
                
        return success

    def test_get_requests(self):
        """Test getting list of requests"""
        if not self.token:
            self.log("❌ No token available for requests list", "FAIL")
            return False

        success, response = self.run_test(
            "Get Requests List",
            "GET",
            "requests?limit=10",
            200
        )
        
        if success:
            requests_count = len(response) if isinstance(response, list) else 0
            self.log(f"   Found {requests_count} requests")
            if requests_count > 0:
                self.log(f"   First request: {response[0].get('title', 'No title')}")
        return success

    def test_get_specific_request(self):
        """Test getting a specific request by ID"""
        if not self.token or not self.created_request_id:
            self.log("❌ No token or request ID available", "FAIL")
            return False

        success, response = self.run_test(
            "Get Specific Request",
            "GET",
            f"requests/{self.created_request_id}",
            200
        )
        
        if success:
            self.log(f"   Request title: {response.get('title')}")
            self.log(f"   Request status: {response.get('status')}")
        return success

    def test_create_help_offer(self):
        """Test creating a help offer"""
        if not self.token:
            self.log("❌ No token available for offer creation", "FAIL")
            return False

        # Create availability times (next week)
        start_time = datetime.now() + timedelta(days=1)
        end_time = start_time + timedelta(hours=4)

        offer_data = {
            "title": "Can help with transportation",
            "description": "I have a car and can provide rides or help with transportation needs. Available for grocery runs, medical appointments, or general transport assistance.",
            "category": "transport",
            "skills": ["Driving", "Vehicle maintenance", "Local area knowledge"],
            "availability": {
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "recurring": False,
                "days_of_week": []
            },
            "location": {
                "latitude": 40.7128,
                "longitude": -74.0060,
                "address": "New York, NY"
            },
            "max_distance": 5000,
            "capacity": 2
        }

        success, response = self.run_test(
            "Create Help Offer",
            "POST",
            "offers",
            200,
            data=offer_data
        )
        
        if success:
            self.created_offer_id = response.get('offer_id')
            self.log(f"   Created offer ID: {self.created_offer_id}")
            self.log(f"   Offer category: {response.get('category')}")
            self.log(f"   Offer capacity: {response.get('capacity')}")
        return success

    def test_get_offers(self):
        """Test getting list of offers"""
        if not self.token:
            self.log("❌ No token available for offers list", "FAIL")
            return False

        success, response = self.run_test(
            "Get Offers List",
            "GET",
            "offers?limit=10",
            200
        )
        
        if success:
            offers_count = len(response) if isinstance(response, list) else 0
            self.log(f"   Found {offers_count} offers")
            if offers_count > 0:
                self.log(f"   First offer: {response[0].get('title', 'No title')}")
        return success

    def test_filtered_requests(self):
        """Test filtering requests by category"""
        if not self.token:
            self.log("❌ No token available for filtered requests", "FAIL")
            return False

        success, response = self.run_test(
            "Get Food Category Requests",
            "GET",
            "requests?category=food&limit=5",
            200
        )
        
        if success:
            food_requests = len(response) if isinstance(response, list) else 0
            self.log(f"   Found {food_requests} food category requests")
        return success

    def test_invalid_endpoints(self):
        """Test some invalid endpoints to ensure proper error handling"""
        # Test invalid request ID
        success, _ = self.run_test(
            "Invalid Request ID",
            "GET",
            "requests/invalid-id-123",
            404
        )
        
        # Test unauthorized access (without token)
        old_token = self.token
        self.token = None
        success2, _ = self.run_test(
            "Unauthorized Access",
            "GET",
            "auth/me",
            401
        )
        self.token = old_token
        
        return success and success2

    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("🚀 Starting Aid-Connect API Test Suite")
        self.log(f"Testing against: {self.base_url}")
        
        # Basic connectivity tests
        self.test_health_check()
        self.test_root_endpoint()
        
        # Authentication tests
        if self.test_user_registration():
            self.test_get_user_profile()
        else:
            # If registration fails (user might exist), try login
            self.log("Registration failed, trying login...")
            if not self.test_user_login():
                self.log("❌ Both registration and login failed, skipping authenticated tests")
                return self.print_results()
            self.test_get_user_profile()
        
        # Request management tests
        self.test_create_help_request()
        self.test_get_requests()
        self.test_get_specific_request()
        self.test_filtered_requests()
        
        # Offer management tests
        self.test_create_help_offer()
        self.test_get_offers()
        
        # Error handling tests
        self.test_invalid_endpoints()
        
        return self.print_results()

    def print_results(self):
        """Print final test results"""
        self.log("=" * 50)
        self.log(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            self.log("🎉 All tests passed! Backend API is working correctly.")
            return 0
        else:
            failed = self.tests_run - self.tests_passed
            self.log(f"❌ {failed} tests failed. Backend needs attention.")
            return 1

def main():
    """Main test execution"""
    tester = AidConnectAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())