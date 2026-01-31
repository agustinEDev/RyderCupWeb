import { Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

/**
 * Componente que muestra los requisitos de contraseña de forma dinámica
 * Los requisitos se marcan como cumplidos (✓) o pendientes (✗) en tiempo real
 * @param {string} password - Contraseña actual
 */
const PasswordRequirements = ({ password }) => {
  const { t } = useTranslation('auth');

  // Validaciones individuales
  const requirements = [
    {
      id: 'length',
      label: t('register.requirementLength'),
      test: (pwd) => pwd.length >= 12,
    },
    {
      id: 'uppercase',
      label: t('register.requirementUppercase'),
      test: (pwd) => /[A-Z]/.test(pwd),
    },
    {
      id: 'lowercase',
      label: t('register.requirementLowercase'),
      test: (pwd) => /[a-z]/.test(pwd),
    },
    {
      id: 'number',
      label: t('register.requirementNumber'),
      test: (pwd) => /\d/.test(pwd),
    },
  ];

  // Si no hay contraseña, no mostrar nada
  if (!password) return null;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold text-gray-700">
        {t('register.passwordRequirements')}
      </p>
      <AnimatePresence mode="sync">
        {requirements.map((req) => {
          const isMet = req.test(password);
          return (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className={`flex items-center gap-2 text-xs transition-all ${
                isMet ? 'text-green-600' : 'text-gray-500'
              }`}
            >
              {isMet ? (
                <Check className="w-4 h-4 flex-shrink-0" />
              ) : (
                <X className="w-4 h-4 flex-shrink-0" />
              )}
              <span className={isMet ? 'line-through' : ''}>{req.label}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default PasswordRequirements;
