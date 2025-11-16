import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Password input component with visibility toggle
 * @param {Object} props - Component props
 * @param {string} props.name - Input name
 * @param {string} props.value - Input value
 * @param {function} props.onChange - onChange callback
 * @param {string} props.placeholder - Input placeholder
 * @param {boolean} props.error - Whether there's an error (for styling)
 * @param {boolean} props.disabled - Whether it's disabled
 * @param {string} props.label - Input label
 * @param {boolean} props.showStrength - Whether to show strength indicator
 */
const PasswordInput = ({
  name,
  value,
  onChange,
  placeholder = 'Enter your password',
  error = false,
  disabled = false,
  label = 'Password',
  className = '',
  autoComplete = 'current-password',
  ...rest
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="relative">
      {label && (
        <label htmlFor={name} className="block text-gray-900 text-base font-medium leading-normal pb-2">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          id={name}
          type={showPassword ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`
            form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900
            focus:outline-0 focus:ring-2 border bg-white h-14 pr-12 p-[15px] text-base font-normal
            leading-normal transition-all
            ${error ? 'focus:ring-red-500 border-red-300' : 'focus:ring-primary border-gray-200'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${className}
          `}
          {...rest}
        />

        {/* Toggle Button */}
        <button
          type="button"
          onClick={togglePasswordVisibility}
          disabled={disabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700
                     transition-colors focus:outline-none disabled:opacity-50"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <EyeOff className="w-5 h-5" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
};

export default PasswordInput;
