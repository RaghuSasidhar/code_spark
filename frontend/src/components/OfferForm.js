import React, { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CATEGORIES = [
  { value: 'medical', label: '🏥 Medical', description: 'Health support, medication assistance, doctor visits' },
  { value: 'food', label: '🍽️ Food', description: 'Meal preparation, grocery shopping, food delivery' },
  { value: 'shelter', label: '🏠 Shelter', description: 'Housing support, furniture, home maintenance' },
  { value: 'transport', label: '🚗 Transport', description: 'Rides, vehicle assistance, moving help' },
  { value: 'safety', label: '🚨 Safety', description: 'Emergency response, security, escort services' },
  { value: 'education', label: '📚 Education', description: 'Tutoring, mentoring, skill teaching' },
  { value: 'elder_care', label: '👴 Elder Care', description: 'Senior assistance, companionship, daily tasks' },
  { value: 'child_care', label: '👶 Child Care', description: 'Babysitting, school support, child activities' },
  { value: 'pet_care', label: '🐕 Pet Care', description: 'Pet sitting, walking, veterinary support' },
  { value: 'other', label: '🤝 Other', description: 'General assistance, miscellaneous help' }
];

const OfferForm = ({ onOfferCreated, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    skills: [],
    availability: {
      start_time: '',
      end_time: '',
      recurring: false,
      days_of_week: []
    },
    location: {
      latitude: 0,
      longitude: 0,
      address: ''
    },
    max_distance: 5000,
    capacity: 1
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [skillInput, setSkillInput] = useState('');
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

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, skillInput.trim()]
      });
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(skill => skill !== skillToRemove)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        availability: {
          ...formData.availability,
          start_time: new Date(formData.availability.start_time).toISOString(),
          end_time: new Date(formData.availability.end_time).toISOString()
        }
      };

      const response = await axios.post(`${API}/offers`, submitData);
      onOfferCreated(response.data);
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to create offer');
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
      case 3: return formData.availability.start_time && formData.availability.end_time;
      case 4: return formData.location.address.trim();
      default: return true;
    }
  };

  const daysOfWeek = [
    { value: 0, label: 'Monday' },
    { value: 1, label: 'Tuesday' },
    { value: 2, label: 'Wednesday' },
    { value: 3, label: 'Thursday' },
    { value: 4, label: 'Friday' },
    { value: 5, label: 'Saturday' },
    { value: 6, label: 'Sunday' }
  ];

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Offer Help</h2>
        <div className="flex items-center justify-between mb-4">
          <div className="flex space-x-2">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div
                key={stepNumber}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${step >= stepNumber ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}
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
            <h3 className="text-lg font-medium text-gray-900">What type of help can you provide?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CATEGORIES.map((category) => (
                <div
                  key={category.value}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all
                    ${formData.category === category.value 
                      ? 'border-green-500 bg-green-50' 
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

        {/* Step 2: Description & Skills */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Describe your offer</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Brief title for your offer"
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
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Describe what help you can provide, your experience, and any requirements..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skills & Expertise
              </label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Add a skill (e.g., First Aid, Cooking, Tutoring)"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Add
                </button>
              </div>
              {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill) => (
                    <span
                      key={skill}
                      className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="ml-2 text-green-600 hover:text-green-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How many people can you help?
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum travel distance (meters)
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={formData.max_distance}
                  onChange={(e) => setFormData({ ...formData, max_distance: parseInt(e.target.value) })}
                >
                  <option value={1000}>1 km</option>
                  <option value={2000}>2 km</option>
                  <option value={5000}>5 km</option>
                  <option value={10000}>10 km</option>
                  <option value={20000}>20 km</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Availability */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">When are you available?</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={formData.availability.start_time}
                  onChange={(e) => setFormData({
                    ...formData,
                    availability: { ...formData.availability, start_time: e.target.value }
                  })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={formData.availability.end_time}
                  onChange={(e) => setFormData({
                    ...formData,
                    availability: { ...formData.availability, end_time: e.target.value }
                  })}
                />
              </div>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                  checked={formData.availability.recurring}
                  onChange={(e) => setFormData({
                    ...formData,
                    availability: { ...formData.availability, recurring: e.target.checked }
                  })}
                />
                <span className="ml-2 text-sm text-gray-700">This is a recurring offer</span>
              </label>
            </div>

            {formData.availability.recurring && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Which days of the week?
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {daysOfWeek.map((day) => (
                    <label key={day.value} className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                        checked={formData.availability.days_of_week.includes(day.value)}
                        onChange={(e) => {
                          const days = formData.availability.days_of_week;
                          const newDays = e.target.checked
                            ? [...days, day.value]
                            : days.filter(d => d !== day.value);
                          setFormData({
                            ...formData,
                            availability: { ...formData.availability, days_of_week: newDays }
                          });
                        }}
                      />
                      <span className="ml-2 text-sm text-gray-700">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Location */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Where can you provide help?</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Location <span className="text-red-500">*</span>
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  required
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter your address or area"
                  value={formData.location.address}
                  onChange={(e) => setFormData({
                    ...formData,
                    location: { ...formData.location, address: e.target.value }
                  })}
                />
                <button
                  type="button"
                  onClick={getLocation}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
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

            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-green-600">✅</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">
                    <strong>Helper Benefits:</strong> Offering help builds community trust, earns you recognition badges, 
                    and creates a network of support for when you might need help too!
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
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating Offer...' : 'Publish Offer'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default OfferForm;