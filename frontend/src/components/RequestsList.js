import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RequestCard = ({ request, onRespond }) => {
  const getPriorityColor = (priority) => {
    const colors = {
      emergency: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[priority] || colors.medium;
  };

  const getCategoryEmoji = (category) => {
    const emojis = {
      medical: '🏥',
      food: '🍽️',
      shelter: '🏠',
      transport: '🚗',
      safety: '🚨',
      education: '📚',
      elder_care: '👴',
      child_care: '👶',
      pet_care: '🐕',
      other: '🤝'
    };
    return emojis[category] || '🤝';
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getCategoryEmoji(request.category)}</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
            <div className="flex items-center space-x-3 mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(request.priority)}`}>
                {request.priority.toUpperCase()}
              </span>
              <span className="text-sm text-gray-500">{request.category.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-blue-600">{request.urgency_score}/10</div>
          <div className="text-xs text-gray-500">urgency</div>
        </div>
      </div>

      <p className="text-gray-700 mb-4 line-clamp-3">{request.description}</p>

      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
        <div className="flex items-center space-x-4">
          <span>📍 {request.location.address}</span>
          <span>🕒 {formatTimeAgo(request.created_at)}</span>
        </div>
        {request.estimated_response_time && (
          <span className="text-blue-600 font-medium">
            Response: {request.estimated_response_time}
          </span>
        )}
      </div>

      {request.matching?.ai_matches?.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">
            AI Matches ({request.matching.ai_matches.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {request.matching.ai_matches.slice(0, 3).map((match) => (
              <div key={match.offer_id} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                {match.title} • {match.distance}m • {match.match_score}
              </div>
            ))}
            {request.matching.ai_matches.length > 3 && (
              <div className="text-sm text-gray-500">
                +{request.matching.ai_matches.length - 3} more
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <span className={`px-2 py-1 rounded-full text-xs ${
            request.status === 'open' ? 'bg-green-100 text-green-800' :
            request.status === 'matched' ? 'bg-blue-100 text-blue-800' :
            request.status === 'fulfilled' ? 'bg-gray-100 text-gray-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {request.status.toUpperCase()}
          </span>
          <span className="text-xs text-gray-500">
            {request.matching?.respondents?.length || 0} responses
          </span>
        </div>

        {request.status === 'open' && onRespond && (
          <button
            onClick={() => onRespond(request)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Offer Help
          </button>
        )}
      </div>
    </div>
  );
};

const RequestsList = ({ filters = {}, showCreateButton = true }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentFilters, setCurrentFilters] = useState({
    category: '',
    status: 'open',
    ...filters
  });

  useEffect(() => {
    fetchRequests();
  }, [currentFilters]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (currentFilters.category) params.append('category', currentFilters.category);
      if (currentFilters.status) params.append('status', currentFilters.status);
      params.append('limit', '20');

      const response = await axios.get(`${API}/requests?${params}`);
      setRequests(response.data);
    } catch (error) {
      setError('Failed to fetch requests');
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = (request) => {
    // TODO: Implement response functionality
    console.log('Responding to request:', request);
    alert('Response functionality will be implemented in the next phase!');
  };

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'medical', label: '🏥 Medical' },
    { value: 'food', label: '🍽️ Food' },
    { value: 'shelter', label: '🏠 Shelter' },
    { value: 'transport', label: '🚗 Transport' },
    { value: 'safety', label: '🚨 Safety' },
    { value: 'education', label: '📚 Education' },
    { value: 'elder_care', label: '👴 Elder Care' },
    { value: 'child_care', label: '👶 Child Care' },
    { value: 'pet_care', label: '🐕 Pet Care' },
    { value: 'other', label: '🤝 Other' }
  ];

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'open', label: 'Open' },
    { value: 'matched', label: 'Matched' },
    { value: 'fulfilled', label: 'Fulfilled' }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Community Requests</h2>
          <p className="text-gray-600">Help your neighbors by responding to their requests</p>
        </div>
        {showCreateButton && (
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors">
            Create Request
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={currentFilters.category}
              onChange={(e) => setCurrentFilters({ ...currentFilters, category: e.target.value })}
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={currentFilters.status}
              onChange={(e) => setCurrentFilters({ ...currentFilters, status: e.target.value })}
            >
              {statusOptions.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchRequests}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Requests Grid */}
      {requests.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {requests.map((request) => (
            <RequestCard
              key={request.request_id}
              request={request}
              onRespond={handleRespond}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🤝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
          <p className="text-gray-600 mb-4">
            {currentFilters.category || currentFilters.status !== 'open' 
              ? 'Try adjusting your filters to see more requests.' 
              : 'Be the first to create a request in your community!'}
          </p>
          {showCreateButton && (
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors">
              Create First Request
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RequestsList;