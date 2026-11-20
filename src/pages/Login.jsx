import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useRedirectIfAuthenticated } from '../hooks/useRedirectIfAuthenticated';
import SignInForm from '../components/auth/SignInForm';
import FullScreenLoader from '../components/ui/FullScreenLoader';
import MarcoDeAcceso from '../components/auth/MarcoDeAcceso';
import {
  muestraElAvisoDelCierre,
  tomaElAvisoDelCierre,
} from '../utils/avisoTrasElCierre';

const Login = () => {
  const { t, ready } = useTranslation(['auth', 'common']);
  const location = useLocation();
  const successMessage = location.state?.message;
  const isCheckingSession = useRedirectIfAuthenticated();

  // El aviso de un cierre forzado (revocado, caducado, terminado), que la página
  // de la que se venía guardó al irse. Una vez: se borra al tomarlo (recargar
  // /login no lo repite; StrictMode, tampoco). Solo con los textos de `auth` ya
  // cargados (`useSuspense: false`: la pantalla se pinta antes): si no, saldría la
  // clave en bruto y el aviso ya se habría gastado
  useEffect(() => {
    if (!ready) return;
    const motivo = tomaElAvisoDelCierre();
    if (motivo) muestraElAvisoDelCierre(motivo, t);
  }, [ready, t]);

  // Con sesión guardada por confirmar, el formulario no se pinta: quien llega
  // aquí desde el icono de la PWA se va al dashboard sin verlo (FE #305)
  if (isCheckingSession) {
    return <FullScreenLoader />;
  }

  return (
    <MarcoDeAcceso
      titulo={t('login.welcomeBack')}
      subtitulo={t('login.welcomeDescription')}
      ventajas={[
        { icon: '🏆', text: t('login.features.tournaments') },
        { icon: '⛳', text: t('login.features.statistics') },
        { icon: '📊', text: t('login.features.liveScoring') },
        { icon: '👥', text: t('login.features.friends') },
      ]}
      // Solo aparece: entrando desplazada, un clic en ese medio segundo podía
      // soltarse fuera del botón, que se había movido (QA, FE #865-12)
      soloAparece
      textoDeVolver={t('login.backToHome')}
    >
      {/* Form Card */}
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-black text-gray-900 font-poppins mb-2">
            {t('login.title')}
          </h2>
          <p className="text-gray-600">{t('login.subtitle')}</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-green-700 text-sm font-medium">
                {successMessage}
              </p>
            </div>
          </motion.div>
        )}

        <SignInForm />
      </div>
    </MarcoDeAcceso>
  );
};

export default Login;
