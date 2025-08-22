import React, { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CATEGORIES = [
  { value: 'medical', label: '🏥 Medical', description: 'Health emergencies, medication, doctor visits' },
  { value: 'food', label: '🍽️ Food', description: 'Meals, groceries, water, nutrition support' },
  { value: 'shelter', label: '🏠 Shelter', description: 'Temporary housing, accommodation, furniture' },
  { value: 'transport', label: '🚗 Transport', description: 'Rides, vehicle assistance, fuel help' },
  { value: 'safety', label: '🚨 Safety', description: 'Emergency assistance, security, escort' },
  { value: 'education', label: '📚 Education', description: 'Tutoring, study materials, skill learning' },
  { value: 'elder_care', label: '👴 Elder Care', description: 'Assistance for elderly, companionship' },
  { value: 'child_care', label: '👶 Child Care', description: 'Babysitting, school pickup, activities' },
  { value: 'pet_care', label: '🐕 Pet Care', description: 'Pet sitting, veterinary help, supplies' },
  { value: 'other', label: '🤝 Other', description: 'General assistance, miscellaneous needs' }
];

const RequestForm = ({ onRequestCreated, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    location: {
      latitude: 0,
      longitude: 0,
      address: ''
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            location: {
              ...formData.location,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to get your location. Please enter address manually.');
        }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API}/requests`, formData);
      onRequestCreated(response.data);
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step < 4) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const canProceedToNextStep = () => {
    switch (step) {
      case 1: return formData.category;
      case 2: return formData.title.trim() && formData.description.trim();
      case 3: return formData.location.address.trim();
      default: return true;
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Help</h2>
        <div className="flex items-center justify-between mb-4">
          <div className="flex space-x-2">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div
                key={stepNumber}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${step >= stepNumber ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}
              >
                {stepNumber}
              </div>
            ))}
          </div>
          <span className="text-sm text-gray-500">Step {step} of 4</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Step 1: Category Selection */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">What do you need help with?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CATEGORIES.map((category) => (
                <div
                  key={category.value}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all
                    ${formData.category === category.value 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'}`}
                  onClick={() => setFormData({ ...formData, category: category.value })}
                >
                  <div className="font-medium text-gray-900">{category.label}</div>
                  <div className="text-sm text-gray-600 mt-1">{category.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Description */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Describe your situation</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief title for your request"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Provide details about what help you need, when you need it, and any other relevant information..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <div className="text-sm text-gray-500 mt-1">
                Be specific about your needs. This helps match you with the right helpers.
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Location */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Where do you need help?</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address or Location <span className="text-red-500">*</span>
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  required
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter address or describe location"
                  value={formData.location.address}
                  onChange={(e) => setFormData({
                    ...formData,
                    location: { ...formData.location, address: e.target.value }
                  })}
                />
                <button
                  type="button"
                  onClick={getLocation}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  📍 Use GPS
                </button>
              </div>
              {formData.location.latitude !== 0 && (
                <div className="text-sm text-green-600 mt-1">
                  ✓ GPS location captured ({formData.location.latitude.toFixed(4)}, {formData.location.longitude.toFixed(4)})
                </div>
              )}
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-yellow-600">⚠️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Privacy Notice:</strong> For your safety, your exact location will be shared only with matched helpers. 
                    We recommend meeting in public places when possible.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Review your request</h3>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <span className="font-medium text-gray-700">Category:</span>
                <span className="ml-2">
                  {CATEGORIES.find(cat => cat.value === formData.category)?.label || formData.category}
                </span>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Title:</span>
                <span className="ml-2">{formData.title}</span>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Description:</span>
                <p className="mt-1 text-gray-600">{formData.description}</p>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Location:</span>
                <span className="ml-2">{formData.location.address}</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-blue-600">ℹ️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    Once posted, our AI will analyze your request for urgency and automatically match you with suitable helpers in your area. 
                    You'll receive notifications when helpers respond.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-8">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                Previous
              </button>
            )}
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="ml-2 text-gray-600 hover:text-gray-800 px-4 py-2 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          <div>
            {step < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={!canProceedToNextStep()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating Request...' : 'Post Request'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default RequestForm;