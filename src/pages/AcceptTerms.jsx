import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useLogout } from '../hooks/useLogout';
import { acceptTermsUseCase } from '../composition';
import { debeAceptarLosTerminos } from '../domain/services/aceptacionDeTerminos';
import AceptacionDeTerminos from '../components/auth/AceptacionDeTerminos';
import customToast from '../utils/toast';

const PANEL = '/dashboard';

/**
 * A dónde volver tras aceptar. Llega por el estado de la navegación —desde
 * `ProtectedRoute`— o por `?from=` —desde `api.js`, que redirige recargando—.
 * Solo rutas propias: un `from` externo (`https://…`, `//…`) sería una
 * redirección abierta, y volver a esta misma pantalla, un bucle.
 */
const destinoDe = (location) => {
  const delEstado = location.state?.from;
  const candidato = delEstado
    ? `${delEstado.pathname ?? ''}${delEstado.search ?? ''}`
    : new URLSearchParams(location.search).get('from');
  if (!candidato || !candidato.startsWith('/') || candidato.startsWith('//')) return PANEL;
  if (candidato.startsWith('/accept-terms')) return PANEL;
  return candidato;
};

/**
 * Aceptar los Términos vigentes (auditoría legal, F3).
 *
 * Mientras no se acepten, el backend responde 403 a todo salvo current-user,
 * accept-terms y logout. Por eso esta pantalla NO monta la cabecera —pediría el
 * avatar— ni nada que llame a otra ruta.
 */
const AcceptTerms = () => {
  const { t } = useTranslation('auth');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refetch } = useAuth();
  const { logout } = useLogout();

  const [aceptada, setAceptada] = useState(false);
  const [errorCasilla, setErrorCasilla] = useState('');
  const [errorAlAceptar, setErrorAlAceptar] = useState('');
  const [enviando, setEnviando] = useState(false);

  const destino = destinoDe(location);

  // Ya aceptados, o un backend que no lo dice: aquí no hay nada que hacer
  if (!debeAceptarLosTerminos(user)) {
    return <Navigate to={destino} replace />;
  }

  const handleCasilla = (marcada) => {
    setAceptada(marcada);
    if (marcada) setErrorCasilla('');
  };

  const handleAceptar = async () => {
    if (!aceptada) {
      setErrorCasilla(t('google.completeProfile.acceptTermsRequired'));
      return;
    }
    setEnviando(true);
    setErrorAlAceptar('');
    try {
      await acceptTermsUseCase.execute();
    } catch {
      setErrorAlAceptar(t('acceptTermsPage.error'));
      customToast.error(t('acceptTermsPage.error'));
      setEnviando(false);
      return;
    }
    // La sesión compartida guarda el DTO del backend, no la entidad que
    // devuelve el caso de uso: se reconfirma con current-user, que ya dice
    // `terms_accepted: true`, y solo entonces se vuelve. Sin esto, el guardia
    // vería la sesión vieja y devolvería aquí
    try {
      await refetch();
    } finally {
      navigate(destino, { replace: true });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <main className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 font-poppins break-words">
            {t('acceptTermsPage.title')}
          </h1>
          <p className="text-gray-600 mt-2 mb-6 break-words">{t('acceptTermsPage.subtitle')}</p>

          <AceptacionDeTerminos
            id="acceptTerms"
            checked={aceptada}
            onChange={handleCasilla}
            error={errorCasilla}
            disabled={enviando}
          />

          {errorAlAceptar && (
            <p role="alert" className="text-red-600 text-sm mt-4">
              {errorAlAceptar}
            </p>
          )}

          <button
            type="button"
            onClick={handleAceptar}
            disabled={enviando}
            aria-busy={enviando || undefined}
            className="w-full mt-6 py-3 rounded-lg font-bold text-white bg-primary hover:bg-primary/90 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {enviando ? t('acceptTermsPage.accepting') : t('acceptTermsPage.acceptButton')}
          </button>

          <button
            type="button"
            onClick={() => logout()}
            disabled={enviando}
            className="w-full mt-3 py-3 rounded-lg font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-50"
          >
            {t('acceptTermsPage.logout')}
          </button>
        </div>
      </main>
    </div>
  );
};

export default AcceptTerms;
