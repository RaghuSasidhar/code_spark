import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Import components
import RequestForm from './components/RequestForm';
import RequestsList from './components/RequestsList';
import OfferForm from './components/OfferForm';

// Context for global state
const AppContext = createContext();

// API configuration
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Configure axios defaults
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Auth hook
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('aid_connect_token'));

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserProfile();
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      logout();
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token, user_id } = response.data;
      
      localStorage.setItem('aid_connect_token', access_token);
      setToken(access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${API}/auth/register`, userData);
      const { access_token } = response.data;
      
      localStorage.setItem('aid_connect_token', access_token);
      setToken(access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('aid_connect_token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  return { user, token, login, register, logout, isAuthenticated: !!token };
};

// Header Component
const Header = () => {
  const { user, logout, isAuthenticated, currentView, setCurrentView } = useContext(AppContext);

  return (
    <header className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div 
            className="flex items-center cursor-pointer"
            onClick={() => setCurrentView('dashboard')}
          >
            <h1 className="text-2xl font-bold">🤝 Aid-Connect</h1>
            <span className="ml-2 text-blue-200 text-sm">Community Help Platform</span>
          </div>
          
          {isAuthenticated && (
            <nav className="flex items-center space-x-6">
              <button 
                onClick={() => setCurrentView('dashboard')}
                className={`hover:text-blue-200 transition-colors ${currentView === 'dashboard' ? 'text-white font-medium' : 'text-blue-200'}`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => setCurrentView('requests')}
                className={`hover:text-blue-200 transition-colors ${currentView === 'requests' ? 'text-white font-medium' : 'text-blue-200'}`}
              >
                Requests
              </button>
              <button 
                onClick={() => setCurrentView('offers')}
                className={`hover:text-blue-200 transition-colors ${currentView === 'offers' ? 'text-white font-medium' : 'text-blue-200'}`}
              >
                Offers
              </button>
              <button 
                onClick={() => setCurrentView('create-request')}
                className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded-md text-sm transition-colors"
              >
                Request Help
              </button>
              <button 
                onClick={() => setCurrentView('create-offer')}
                className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded-md text-sm transition-colors"
              >
                Offer Help
              </button>
              <div className="flex items-center space-x-3">
                <div className="text-sm">
                  <div className="font-medium">{user?.profile?.name || 'User'}</div>
                  <div className="text-blue-200">⭐ {user?.stats?.community_rating?.toFixed(1) || '5.0'}</div>
                </div>
                <button
                  onClick={logout}
                  className="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded-md text-sm transition-colors"
                >
                  Logout
                </button>
              </div>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
};

// Login Component
const LoginForm = () => {
  const { login } = useContext(AppContext);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(formData.email, formData.password);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">Login to Aid-Connect</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <button className="text-blue-600 hover:text-blue-800 font-medium">
          Sign up here
        </button>
      </p>
    </div>
  );
};

// Registration Component
const RegisterForm = () => {
  const { register } = useContext(AppContext);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    profile: {
      name: '',
      location: {
        latitude: 0,
        longitude: 0,
        address: ''
      }
    }
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await register(formData);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setFormData({
          ...formData,
          profile: {
            ...formData.profile,
            location: {
              ...formData.profile.location,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }
          }
        });
      });
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">Join Aid-Connect</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.profile.name}
            onChange={(e) => setFormData({
              ...formData,
              profile: { ...formData.profile, name: e.target.value }
            })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone (Optional)</label>
          <input
            type="tel"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <div className="flex space-x-2">
            <input
              type="text"
              required
              placeholder="Enter your address"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.profile.location.address}
              onChange={(e) => setFormData({
                ...formData,
                profile: {
                  ...formData.profile,
                  location: { ...formData.profile.location, address: e.target.value }
                }
              })}
            />
            <button
              type="button"
              onClick={getLocation}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md text-sm"
            >
              📍 GPS
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const { user } = useContext(AppContext);
  const [requests, setRequests] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [requestsRes, offersRes] = await Promise.all([
        axios.get(`${API}/requests?limit=5`),
        axios.get(`${API}/offers?limit=5`)
      ]);
      
      setRequests(requestsRes.data);
      setOffers(offersRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Welcome back, {user?.profile?.name}!</h2>
        <p className="text-gray-600 mt-2">Here's what's happening in your community</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              🤝
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Help Provided</p>
              <p className="text-2xl font-bold text-gray-900">{user?.stats?.help_provided || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              ⭐
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Community Rating</p>
              <p className="text-2xl font-bold text-gray-900">{user?.stats?.community_rating?.toFixed(1) || '5.0'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              📝
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Requests Made</p>
              <p className="text-2xl font-bold text-gray-900">{user?.stats?.requests_made || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              💝
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Offers Made</p>
              <p className="text-2xl font-bold text-gray-900">{user?.stats?.offers_made || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
          <h3 className="text-xl font-bold mb-2">Need Help?</h3>
          <p className="mb-4 opacity-90">Connect with helpers in your community</p>
          <button className="bg-white text-blue-600 px-4 py-2 rounded-md font-medium hover:bg-gray-100 transition-colors">
            Create Request
          </button>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white">
          <h3 className="text-xl font-bold mb-2">Want to Help?</h3>
          <p className="mb-4 opacity-90">Offer your skills and time to others</p>
          <button className="bg-white text-green-600 px-4 py-2 rounded-md font-medium hover:bg-gray-100 transition-colors">
            Create Offer
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Recent Requests</h3>
          </div>
          <div className="p-6">
            {requests.length > 0 ? (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div key={request.request_id} className="border-l-4 border-blue-500 pl-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{request.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{request.description.substring(0, 100)}...</p>
                        <div className="flex items-center mt-2 space-x-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            request.priority === 'emergency' ? 'bg-red-100 text-red-800' :
                            request.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            request.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {request.priority}
                          </span>
                          <span className="text-xs text-gray-500">{request.category}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-blue-600">{request.urgency_score}/10</div>
                        <div className="text-xs text-gray-500">urgency</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No recent requests</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Available Offers</h3>
          </div>
          <div className="p-6">
            {offers.length > 0 ? (
              <div className="space-y-4">
                {offers.map((offer) => (
                  <div key={offer.offer_id} className="border-l-4 border-green-500 pl-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{offer.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{offer.description.substring(0, 100)}...</p>
                        <div className="flex items-center mt-2 space-x-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {offer.category}
                          </span>
                          <span className="text-xs text-gray-500">
                            {offer.capacity - offer.current_matches} spots available
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No available offers</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  const auth = useAuth();
  const [currentView, setCurrentView] = useState('login');

  return (
    <AppContext.Provider value={auth}>
      <div className="min-h-screen bg-gray-50">
        <BrowserRouter>
          <Header />
          
          {!auth.isAuthenticated ? (
            <div className="container mx-auto px-4 py-8">
              {currentView === 'login' ? (
                <div>
                  <LoginForm />
                  <div className="text-center mt-4">
                    <button
                      onClick={() => setCurrentView('register')}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Don't have an account? Sign up here
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <RegisterForm />
                  <div className="text-center mt-4">
                    <button
                      onClick={() => setCurrentView('login')}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Already have an account? Login here
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          )}
        </BrowserRouter>
      </div>
    </AppContext.Provider>
  );
};

export default App;