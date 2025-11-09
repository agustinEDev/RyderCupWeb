import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setServerError('');
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setServerError('');

    try {
      // TODO: Replace with actual API call
      const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

      const response = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          password: formData.password
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }

      const data = await response.json();
      console.log('Registration successful:', data);

      // Redirect to login with success message
      navigate('/login', {
        state: {
          message: 'Account created successfully! Please sign in.'
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      setServerError(error.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white">
      <div className="layout-container flex h-full grow flex-col">
        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col w-full max-w-[512px] py-5">
            {/* Logo/Title */}
            <Link to="/" className="text-center mb-2">
              <h2 className="text-gray-900 tracking-tight text-[28px] font-bold leading-tight px-4 pb-3 pt-5 hover:text-primary transition-colors">
                Ryder Cup Manager
              </h2>
            </Link>

            {/* Form Title */}
            <h2 className="text-gray-900 text-lg font-bold leading-tight tracking-tight px-4 text-center pb-2 pt-4">
              Create Account
            </h2>

            {/* Server Error */}
            {serverError && (
              <div className="mx-4 my-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{serverError}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col">
              {/* First Name */}
              <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
                <label className="flex flex-col min-w-40 flex-1">
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 focus:outline-0 focus:ring-2 ${
                      errors.firstName ? 'focus:ring-red-500 border-red-300' : 'focus:ring-primary'
                    } border-none bg-gray-100 h-14 placeholder:text-gray-500 p-4 text-base font-normal leading-normal transition-all`}
                    disabled={isLoading}
                  />
                  {errors.firstName && (
                    <span className="text-red-500 text-xs mt-1">{errors.firstName}</span>
                  )}
                </label>
              </div>

              {/* Last Name */}
              <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
                <label className="flex flex-col min-w-40 flex-1">
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 focus:outline-0 focus:ring-2 ${
                      errors.lastName ? 'focus:ring-red-500 border-red-300' : 'focus:ring-primary'
                    } border-none bg-gray-100 h-14 placeholder:text-gray-500 p-4 text-base font-normal leading-normal transition-all`}
                    disabled={isLoading}
                  />
                  {errors.lastName && (
                    <span className="text-red-500 text-xs mt-1">{errors.lastName}</span>
                  )}
                </label>
              </div>

              {/* Email */}
              <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
                <label className="flex flex-col min-w-40 flex-1">
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 focus:outline-0 focus:ring-2 ${
                      errors.email ? 'focus:ring-red-500 border-red-300' : 'focus:ring-primary'
                    } border-none bg-gray-100 h-14 placeholder:text-gray-500 p-4 text-base font-normal leading-normal transition-all`}
                    disabled={isLoading}
                  />
                  {errors.email && (
                    <span className="text-red-500 text-xs mt-1">{errors.email}</span>
                  )}
                </label>
              </div>

              {/* Password */}
              <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
                <label className="flex flex-col min-w-40 flex-1">
                  <input
                    type="password"
                    name="password"
                    placeholder="Password (min 8 characters)"
                    value={formData.password}
                    onChange={handleChange}
                    className={`form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 focus:outline-0 focus:ring-2 ${
                      errors.password ? 'focus:ring-red-500 border-red-300' : 'focus:ring-primary'
                    } border-none bg-gray-100 h-14 placeholder:text-gray-500 p-4 text-base font-normal leading-normal transition-all`}
                    disabled={isLoading}
                  />
                  {errors.password && (
                    <span className="text-red-500 text-xs mt-1">{errors.password}</span>
                  )}
                </label>
              </div>

              {/* Submit Button */}
              <div className="flex px-4 py-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 flex-1 bg-primary text-white text-sm font-bold leading-normal tracking-wide transition-all ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90'
                  }`}
                >
                  <span className="truncate">
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </span>
                </button>
              </div>

              {/* Sign In Link */}
              <Link to="/login">
                <p className="text-gray-500 text-sm font-normal leading-normal pb-3 pt-1 px-4 text-center underline hover:text-primary transition-colors">
                  Already have an account? Sign in
                </p>
              </Link>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
