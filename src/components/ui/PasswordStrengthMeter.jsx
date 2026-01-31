import { useTranslation } from 'react-i18next';

/**
 * PasswordStrengthMeter Component
 * Visual indicator of password strength with progress bar
 *
 * Strength levels:
 * - Weak (0-25%): Doesn't meet basic requirements
 * - Fair (25-50%): Meets basic requirements (12+ chars, uppercase, lowercase, numbers)
 * - Good (50-75%): Basic requirements + length >14
 * - Strong (75-100%): All requirements + symbols
 */
const PasswordStrengthMeter = ({ password }) => {
  const { t } = useTranslation('auth');

  const calculateStrength = () => {
    if (!password || password.length === 0) {
      return { level: 'none', percentage: 0, label: '', color: 'bg-gray-200' };
    }

    let score = 0;
    const checks = {
      length: password.length >= 12,
      longLength: password.length >= 15,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSymbols: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
    };

    // Weak level (0-25%): Missing basic requirements
    if (!checks.length || !checks.hasUpperCase || !checks.hasLowerCase || !checks.hasNumbers) {
      return {
        level: 'weak',
        percentage: Math.min(25, (password.length / 12) * 25),
        label: t('passwordStrength.weak', 'Weak'),
        color: 'bg-red-500',
        textColor: 'text-red-700'
      };
    }

    // Fair level (25-50%): Meets basic requirements
    score = 25;
    if (checks.length && checks.hasUpperCase && checks.hasLowerCase && checks.hasNumbers) {
      score = 40;
    }

    // Good level (50-75%): Basic requirements + longer password
    if (checks.longLength) {
      score = 60;
    }

    // Strong level (75-100%): All requirements + symbols
    if (checks.hasSymbols && checks.longLength) {
      score = 100;
    } else if (checks.hasSymbols) {
      score = 75;
    }

    // Determine level based on score
    if (score >= 75) {
      return {
        level: 'strong',
        percentage: score,
        label: t('passwordStrength.strong', 'Strong'),
        color: 'bg-green-500',
        textColor: 'text-green-700'
      };
    } else if (score >= 50) {
      return {
        level: 'good',
        percentage: score,
        label: t('passwordStrength.good', 'Good'),
        color: 'bg-blue-500',
        textColor: 'text-blue-700'
      };
    } else {
      return {
        level: 'fair',
        percentage: score,
        label: t('passwordStrength.fair', 'Fair'),
        color: 'bg-yellow-500',
        textColor: 'text-yellow-700'
      };
    }
  };

  const strength = calculateStrength();

  // Don't show meter if password is empty
  if (!password || password.length === 0) {
    return null;
  }

  return (
    <div className="mt-2">
      {/* Progress Bar */}
      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ease-out ${strength.color}`}
          style={{ width: `${strength.percentage}%` }}
        />
      </div>

      {/* Strength Label */}
      <div className="flex items-center justify-between mt-1">
        <span className={`text-xs font-medium ${strength.textColor}`}>
          {t('passwordStrength.label', 'Password strength')}: {strength.label}
        </span>
        <span className="text-xs text-gray-500">
          {Math.round(strength.percentage)}%
        </span>
      </div>
    </div>
  );
};

export default PasswordStrengthMeter;
