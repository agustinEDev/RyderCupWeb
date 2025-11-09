import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.message;

  const [formData, setFormData] = useState({
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

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
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
      const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      console.log('Login successful:', data);

      // Save token and user data
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect to dashboard
      navigate('/dashboard');

    } catch (error) {
      console.error('Login error:', error);
      setServerError(error.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white">
      <div className="layout-container flex h-full grow flex-col">
        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col w-full max-w-[512px] py-5">

            {/* Spacer */}
            <div className="w-full" style={{ height: '40px' }}></div>

            {/* Hero Image */}
            <div className="flex w-full grow bg-white p-4">
              <div className="w-full gap-1 overflow-hidden bg-white aspect-[3/2] rounded-lg flex">
                <div
                  className="w-full bg-center bg-no-repeat bg-cover aspect-auto rounded-lg flex-1"
                  style={{
                    backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuBEKpUrPx2XGI3pIeVYEhGE67MWwlqkGxzQCFLHcAYmLMbqWrsASBLpdXdxTTR-wqALQOk_dfjNfXsnfq-ptuTAuIShiWjVmnhFty7jBmuyC2KQVWocKaMe_WMAYFK2lvrVTVPLsHQFJXvobm_xgxr6CfPg7n1O9vKFCHS1-7X9S2i0zjK8uq7tD_hNJ0fDA4uA_c6LdwrTUYDKRtMQ3otWiC6Yb744TUMYWnDK7dRqcg9vz8cjJPlrK6-Ub3RTDdWRyyFEVpOF8uQC")`
                  }}
                ></div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-gray-900 text-[22px] font-bold leading-tight tracking-tight px-4 text-center pb-3 pt-5">
              Welcome back
            </h1>

            {/* Success Message */}
            {successMessage && (
              <div className="mx-4 my-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 text-sm text-center">{successMessage}</p>
              </div>
            )}

            {/* Server Error */}
            {serverError && (
              <div className="mx-4 my-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{serverError}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col">
              {/* Email */}
              <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
                <label className="flex flex-col min-w-40 flex-1">
                  <p className="text-gray-900 text-base font-medium leading-normal pb-2">Email</p>
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 focus:outline-0 focus:ring-2 ${
                      errors.email ? 'focus:ring-red-500 border-red-300' : 'focus:ring-primary border-gray-200'
                    } border bg-white h-14 placeholder:text-gray-500 p-[15px] text-base font-normal leading-normal transition-all`}
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
                  <p className="text-gray-900 text-base font-medium leading-normal pb-2">Password</p>
                  <input
                    type="password"
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 focus:outline-0 focus:ring-2 ${
                      errors.password ? 'focus:ring-red-500 border-red-300' : 'focus:ring-primary border-gray-200'
                    } border bg-white h-14 placeholder:text-gray-500 p-[15px] text-base font-normal leading-normal transition-all`}
                    disabled={isLoading}
                  />
                  {errors.password && (
                    <span className="text-red-500 text-xs mt-1">{errors.password}</span>
                  )}
                </label>
              </div>

              {/* Submit Button */}
              <div className="flex px-4 py-3 justify-center">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-wide transition-all ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90'
                  }`}
                >
                  <span className="truncate">
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </span>
                </button>
              </div>

              {/* Register Link */}
              <Link to="/register">
                <p className="text-gray-500 text-sm font-normal leading-normal pb-3 pt-1 px-4 text-center underline hover:text-primary transition-colors">
                  Don't have an account? Register
                </p>
              </Link>
            </form>

            {/* Back to Home */}
            <Link to="/" className="text-center mt-4">
              <p className="text-gray-500 text-sm font-normal hover:text-primary transition-colors">
                ← Back to Home
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
