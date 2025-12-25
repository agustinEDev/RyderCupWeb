import { motion } from 'framer-motion';
import { validatePasswordStrength } from '../../utils/validation';

/**
 * Indicador visual de la fortaleza de contraseña
 * Muestra una barra de progreso con 4 niveles de fortaleza
 * @param {string} password - La contraseña a evaluar
 */
const PasswordStrengthIndicator = ({ password }) => {
  if (!password) return null;

  const { score, feedback } = validatePasswordStrength(password);

  // Definir colores según el score
  const getColorClass = (level) => {
    if (level > score) return 'bg-gray-200';

    switch (score) {
      case 4:
        return 'bg-green-500';
      case 3:
        return 'bg-primary-500';
      case 2:
        return 'bg-yellow-500';
      default:
        return 'bg-red-500';
    }
  };

  const getTextColor = () => {
    switch (score) {
      case 4:
        return 'text-green-600';
      case 3:
        return 'text-primary-600';
      case 2:
        return 'text-yellow-600';
      default:
        return 'text-red-600';
    }
  };

  const getStrengthText = () => {
    switch (score) {
      case 4:
        return 'Muy fuerte';
      case 3:
        return 'Fuerte';
      case 2:
        return 'Media';
      default:
        return 'Débil';
    }
  };

  return (
    <div className="mt-2">
      {/* Barras de fortaleza */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <motion.div
            key={level}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.3, delay: level * 0.05 }}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${getColorClass(level)}`}
          />
        ))}
      </div>

      {/* Texto de fortaleza */}
      <div className="flex items-center justify-between mt-1.5">
        <p className={`text-xs font-medium ${getTextColor()}`}>
          {getStrengthText()}
        </p>

        {/* Feedback opcional */}
        {feedback && (
          <p className="text-xs text-gray-500">
            {feedback}
          </p>
        )}
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;
