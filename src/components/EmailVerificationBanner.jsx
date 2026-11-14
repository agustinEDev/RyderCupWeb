import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useReenvioDeVerificacion } from '../hooks/useReenvioDeVerificacion';

// El correo se pinta aquí, como texto, y no con lo que <Trans> pone dentro de <correo>:
// <Trans> vuelve a interpolar ese texto ya interpolado, y un correo como
// `{{email}}@e.com` salía `{{email}}@e.com@e.com` (#1100)
const CorreoLiteral = ({ email }) => (
  <strong className="wrap-anywhere">{email}</strong>
);

const EmailVerificationBanner = ({ userEmail }) => {
  // `ready` porque este banner usa el namespace `auth`, que su pantalla —el
  // panel— no carga: si ese chunk tarda o falla, sin esto se quedaria pintando
  // las claves en crudo donde antes habia texto en ingles correcto
  const { t, ready } = useTranslation('auth');
  const [isVisible, setIsVisible] = useState(true);
  // El mismo reenvío que el aviso de Mis invitaciones (fase 3)
  const {
    reenviar: handleResendEmail,
    enviando: isResending,
    mensaje: message,
    esError,
  } = useReenvioDeVerificacion(userEmail);

  if (!isVisible || !ready) {
    return null;
  }

  const handleDismiss = () => {
    setIsVisible(false);
  };

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-lg shadow-sm">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        {/* min-w-0: sin él la columna no encoge por debajo del correo, que no
            tiene dónde partirse, y la X se salía 11 px a 360 (FE #826) */}
        <div className="ml-3 flex-1 min-w-0">
          <h3 className="text-sm font-medium text-yellow-800">
            {t('emailVerification.title')}
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              <Trans
                t={t}
                i18nKey="emailVerification.description"
                values={{ email: userEmail }}
                components={{ correo: <CorreoLiteral email={userEmail} /> }}
              />
            </p>
          </div>
          {message && (
            <div
              className={`mt-2 text-sm ${esError ? 'text-red-700' : 'text-green-700'}`}
            >
              {message}
            </div>
          )}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleResendEmail}
              disabled={isResending}
              className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending
                ? t('emailVerification.sending')
                : t('emailVerification.resend')}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-sm font-medium text-yellow-800 hover:text-yellow-900"
            >
              {t('emailVerification.dismiss')}
            </button>
          </div>
        </div>
        <div className="ml-auto pl-3">
          <button
            type="button"
            onClick={handleDismiss}
            className="inline-flex rounded-md text-yellow-400 hover:text-yellow-500"
          >
            <span className="sr-only">{t('emailVerification.dismiss')}</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationBanner;
