import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useLogout } from '../hooks/useLogout';
import { acceptTermsUseCase } from '../composition';
import { anotaLaSesion } from '../services/sesionCompartida';
import { debeAceptarLosTerminos } from '../domain/services/aceptacionDeTerminos';
import AceptacionDeTerminos from '../components/auth/AceptacionDeTerminos';

const PANEL = '/dashboard';

// Barras invertidas y caracteres de control: el navegador los normaliza (una
// `\` pasa a `/`, un tabulador desaparece), y `/\evil.com` acaba en `//evil.com`
// eslint-disable-next-line no-control-regex
const RAROS = /[\\\u0000-\u001f\u007f]/;

/**
 * A dónde volver tras aceptar. Llega por el estado de la navegación —desde
 * `ProtectedRoute`— o por `?from=` —desde `api.js`, que redirige recargando—.
 * Solo rutas propias, con su `hash`: un `from` externo sería una redirección
 * abierta, y volver a esta misma pantalla, un bucle. Se resuelve contra el
 * origen propio y se compara: es la forma de no depender de cómo normalice
 * cada navegador.
 */
const destinoDe = (location) => {
  const delEstado = location.state?.from;
  const candidato = delEstado
    ? `${delEstado.pathname ?? ''}${delEstado.search ?? ''}${delEstado.hash ?? ''}`
    : new URLSearchParams(location.search).get('from');
  if (!candidato || !candidato.startsWith('/') || candidato.startsWith('//') || RAROS.test(candidato)) return PANEL;

  const origen = globalThis.location.origin;
  let url;
  try {
    url = new globalThis.URL(candidato, origen);
  } catch {
    return PANEL;
  }
  if (url.origin !== origen || url.pathname.startsWith('/accept-terms')) return PANEL;
  return `${url.pathname}${url.search}${url.hash}`;
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
  const { user } = useAuth();
  const { logout } = useLogout();

  const [aceptada, setAceptada] = useState(false);
  const [errorCasilla, setErrorCasilla] = useState('');
  const [errorAlAceptar, setErrorAlAceptar] = useState('');
  const [enviando, setEnviando] = useState(false);

  const destino = destinoDe(location);
  // Se llega desde un 403 del servidor (`api.js` pone `?from=`) y no desde el
  // guardia. Entonces se pinta aunque la sesión diga que ya están aceptados:
  // si el servidor se contradice, rebotar a la ruta sería un bucle de recargas,
  // y aceptar otra vez es inofensivo (accept-terms es idempotente)
  const vieneDeUn403 = !location.state?.from && new URLSearchParams(location.search).has('from');

  // Ya aceptados, o un backend que no lo dice: aquí no hay nada que hacer
  if (!debeAceptarLosTerminos(user) && !vieneDeUn403) {
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
      const datosDelBackend = await acceptTermsUseCase.execute();
      // Se siembra la sesión con lo que responde el backend —el mismo usuario
      // que current-user, `is_admin` incluido—, sin otra consulta que pueda
      // fallar: con la sesión vieja, el guardia devolvería aquí
      anotaLaSesion(datosDelBackend);
    } catch {
      // Un solo aviso, junto a la casilla, que sigue marcada para reintentar
      setErrorAlAceptar(t('acceptTermsPage.error'));
      setEnviando(false);
      return;
    }
    navigate(destino, { replace: true });
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

          {/* Sin aceptar se pueden ver y cerrar los dispositivos: para cortar
              una sesión robada no hace falta aceptar nada antes */}
          <Link
            to="/profile/devices"
            className="block w-full mt-3 py-3 rounded-lg font-semibold text-center text-primary hover:bg-primary/5"
          >
            {t('acceptTermsPage.devices')}
          </Link>

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
