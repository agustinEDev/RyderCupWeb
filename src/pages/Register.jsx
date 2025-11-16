import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { validateEmail, validateName, validatePassword } from '../utils/validation';
import PasswordInput from '../components/ui/PasswordInput';
import PasswordStrengthIndicator from '../components/ui/PasswordStrengthIndicator';

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

    const firstNameValidation = validateName(formData.firstName, 'Nombre');
    if (!firstNameValidation.isValid) {
      newErrors.firstName = firstNameValidation.message;
    }

    const lastNameValidation = validateName(formData.lastName, 'Apellido');
    if (!lastNameValidation.isValid) {
      newErrors.lastName = lastNameValidation.message;
    }

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.message;
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.message;
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

    try {
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

      // Show success toast
      toast.success('¡Cuenta creada exitosamente!');

      // Redirect to login with success message
      setTimeout(() => {
        navigate('/login', {
          state: {
            message: 'Cuenta creada con éxito. Por favor inicia sesión.'
          }
        });
      }, 1000);

    } catch (error) {
      toast.error(error.message || 'Error al crear la cuenta');
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
              <h2 className="text-gray-900 tracking-tight text-[28px] font-bold leading-tight px-4 pb-3 pt-5 hover:text-primary transition-colors">
                Ryder Cup Manager
              </h2>
            </Link>

            {/* Form Title */}
            <h2 className="text-gray-900 text-lg font-bold leading-tight tracking-tight px-4 text-center pb-2 pt-4">
              Crear Cuenta
            </h2>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col">
              {/* First Name */}
              <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
                <label className="flex flex-col min-w-40 flex-1">
                  <input
                    type="text"
                    name="firstName"
                    placeholder="Nombre"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 focus:outline-0 focus:ring-2 ${
                      errors.firstName ? 'focus:ring-red-500 border-red-300' : 'focus:ring-primary-500'
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
                    placeholder="Apellido"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 focus:outline-0 focus:ring-2 ${
                      errors.lastName ? 'focus:ring-red-500 border-red-300' : 'focus:ring-primary-500'
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
                    placeholder="Correo electrónico"
                    value={formData.email}
                    onChange={handleChange}
                    className={`form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 focus:outline-0 focus:ring-2 ${
                      errors.email ? 'focus:ring-red-500 border-red-300' : 'focus:ring-primary-500'
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
                <div className="flex flex-col min-w-40 flex-1">
                  <PasswordInput
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Contraseña (mínimo 8 caracteres)"
                    error={!!errors.password}
                    disabled={isLoading}
                    label=""
                    autoComplete="new-password"
                    className="border-none bg-gray-100"
                  />
                  {errors.password && (
                    <span className="text-red-500 text-xs mt-1">{errors.password}</span>
                  )}
                  {/* Password Strength Indicator */}
                  <PasswordStrengthIndicator password={formData.password} />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex max-w-[480px] px-4 py-3">
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                  className={`w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-4 bg-primary-500 text-white text-sm font-bold leading-normal tracking-wide transition-all shadow-md ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-600 hover:shadow-lg'
                  }`}
                >
                  <span className="truncate">
                    {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
                  </span>
                </motion.button>
              </div>

              {/* Sign In Link */}
              <div className="flex max-w-[480px] px-4">
                <Link to="/login" className="w-full">
                  <p className="text-gray-500 text-sm font-normal leading-normal pb-3 pt-1 text-center underline hover:text-primary-600 transition-colors">
                    ¿Ya tienes cuenta? Inicia sesión
                  </p>
                </Link>
              </div>
            </form>

            {/* Back to Home */}
            <div className="flex max-w-[480px] px-4 mt-4">
              <Link to="/" className="w-full">
                <p className="text-gray-500 text-sm font-normal text-center hover:text-primary-600 transition-colors">
                  ← Volver al inicio
                </p>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Register;
