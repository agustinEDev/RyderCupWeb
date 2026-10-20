import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';

const BOTON = 'inline-flex items-center justify-center rounded-lg h-10 px-5 text-sm font-bold transition-colors';

/**
 * La dirección no lleva a ninguna pantalla (FE #544).
 *
 * Una tarjeta centrada y no la cabecera pública: esa ofrece «Registrarse» y
 * «Entrar», que a quien tiene sesión le sobran. Los botones salen de la sesión
 * que confirma el backend, no del `user` de `AuthContext`, que sobrevive a las
 * cookies; mientras se pregunta, el mensaje solo y sin redirigir a nadie.
 */
const NotFound = () => {
  const { t } = useTranslation('common');
  const { user, loading } = useAuth();

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-lg bg-white px-6 py-10 text-center shadow-sm">
        <p aria-hidden="true" className="mb-4 text-5xl font-bold text-primary">404</p>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">{t('notFound.title')}</h1>
        <p className="mb-8 text-gray-600">{t('notFound.message')}</p>

        {!loading && (
          <div className="flex flex-wrap justify-center gap-3">
            {user ? (
              <Link to="/dashboard" className={`${BOTON} bg-primary text-white hover:bg-primary/90`}>
                {t('notFound.goToDashboard')}
              </Link>
            ) : (
              <>
                <Link to="/" className={`${BOTON} border border-gray-300 bg-white text-gray-900 hover:bg-gray-50`}>
                  {t('notFound.goHome')}
                </Link>
                <Link to="/login" className={`${BOTON} bg-primary text-white hover:bg-primary/90`}>
                  {t('notFound.login')}
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

export default NotFound;
