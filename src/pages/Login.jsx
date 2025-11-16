import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { validateEmail, checkRateLimit, resetRateLimit } from '../utils/validation';
import { safeLog } from '../utils/auth';
import { setAuthToken, setUserData } from '../utils/secureAuth';
import PasswordInput from '../components/ui/PasswordInput';

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
  };

  const validateForm = () => {
    const newErrors = {};

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.message;
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

    // Check rate limiting
    const rateLimit = checkRateLimit('login', 5, 300000); // 5 attempts per 5 minutes
    if (!rateLimit.allowed) {
      toast.error(`Too many attempts. Please wait ${rateLimit.remainingTime} seconds.`, {
        duration: 5000,
      });
      return;
    }

    setIsLoading(true);

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
      safeLog('info', 'Login successful', { email: data.user?.email });

      // Save token and user data using secure storage (sessionStorage)
      // TODO: Remove when backend implements httpOnly cookies
      setAuthToken(data.access_token);
      setUserData(data.user);

      // Reset rate limit on successful login
      resetRateLimit('login');

      // Show success toast
      toast.success(`Welcome, ${data.user.first_name}!`);

      // Check if email verification is required
      if (data.email_verification_required) {
        safeLog('info', 'Email verification required');
        toast('Please verify your email', {
          duration: 5000,
          icon: '⚠️',
        });
      }

      // Redirect to dashboard or original location
      const from = location.state?.from?.pathname || '/dashboard';
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 500);

    } catch (error) {
      safeLog('error', 'Login error', error);
      toast.error(error.message || 'Incorrect email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white">
      <div className="layout-container flex h-full grow flex-col">
        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="layout-content-container flex flex-col w-full max-w-[512px] py-5"
          >

            {/* Logo/Title */}
            <Link to="/" className="text-center mb-2">
              <h2 className="text-gray-900 tracking-tight text-[28px] font-bold leading-tight px-4 pb-3 pt-5 hover:text-primary-600 transition-colors">
                Ryder Cup Manager
              </h2>
            </Link>

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
              Welcome
            </h1>

            {/* Success Message */}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mx-4 my-3 p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <p className="text-green-700 text-sm text-center">{successMessage}</p>
              </motion.div>
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
                <div className="flex flex-col min-w-40 flex-1">
                  <PasswordInput
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    error={!!errors.password}
                    disabled={isLoading}
                    label="Password"
                    autoComplete="current-password"
                  />
                  {errors.password && (
                    <span className="text-red-500 text-xs mt-1">{errors.password}</span>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex max-w-[480px] px-4 py-3">
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                  className={`w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-primary-500 text-white text-sm font-bold leading-normal tracking-wide transition-all shadow-md ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-600 hover:shadow-lg'
                  }`}
                >
                  <span className="truncate">
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </span>
                </motion.button>
              </div>

              {/* Register Link */}
              <div className="flex max-w-[480px] px-4">
                <Link to="/register" className="w-full">
                  <p className="text-gray-500 text-sm font-normal leading-normal pb-3 pt-1 text-center underline hover:text-primary-600 transition-colors">
                    Don't have an account? Sign up
                  </p>
                </Link>
              </div>
            </form>

            {/* Back to Home */}
            <div className="flex max-w-[480px] px-4 mt-4">
              <Link to="/" className="w-full">
                <p className="text-gray-500 text-sm font-normal text-center hover:text-primary-600 transition-colors">
                  ← Back to home
                </p>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Login;
