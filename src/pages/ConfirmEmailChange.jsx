import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../components/layout/HeaderAuth';
import { useAuth } from '../hooks/useAuth';
import { confirmEmailChangeUseCase } from '../composition';
import { laPantallaEstaLista } from '../utils/cortinaDeArranque';
import { readStrippedSecret, stripSecretsFromAddressBar } from '../utils/stripSecretsFromAddressBar';
import { PANTALLA_MENOS_BARRA_INFERIOR } from '../utils/barraInferior';

// Cada rechazo del backend, con su texto (RyderCupAm #749)
const TEXTO_DEL_RECHAZO = {
  EMAIL_CHANGE_EXPIRED: 'confirmEmailChange.expired',
  EMAIL_ALREADY_IN_USE: 'confirmEmailChange.inUse',
  EMAIL_CHANGE_INVALID: 'confirmEmailChange.invalid',
};
// Cualquier otro fallo (sin red, el servidor): el token sigue valiendo, se reintenta
const FALLO = 'confirmEmailChange.failed';

/**
 * El enlace que confirma un correo nuevo (RyderCupAm #749). Va dentro de la
 * sesión: un desconocido que lo reciba por un error al escribir el correo no puede
 * confirmarlo. Si no había sesión, el login devuelve aquí con el token.
 */
const ConfirmEmailChange = () => {
  const { t } = useTranslation('profile');
  const { user, refetch } = useAuth();
  const [searchParams] = useSearchParams();
  // Tras quitarlo de la barra, una recarga lo recupera del historial
  const token = searchParams.get('token') || readStrippedSecret('token');
  const [estado, setEstado] = useState(token ? { clave: 'confirmEmailChange.confirming' } : {
    clave: 'confirmEmailChange.invalid',
  });
  // Una vez por intento: el token se gasta al confirmarlo, pero un fallo de red no
  const [intento, setIntento] = useState(0);
  const enviado = useRef(-1);

  useEffect(() => {
    laPantallaEstaLista();
    // Leído: fuera de la barra y del historial, antes de que Replay grabe el href
    // y de que acabe en el Referer (como al verificar el correo)
    stripSecretsFromAddressBar();
  }, []);

  useEffect(() => {
    if (!token || enviado.current === intento) return;
    enviado.current = intento;
    confirmEmailChangeUseCase
      .execute(token)
      .then((confirmado) => {
        setEstado({ clave: 'confirmEmailChange.done', email: confirmado?.email, bien: true });
        // La sesión, con el correo nuevo; si falla, el cambio ya está hecho
        Promise.resolve(refetch?.()).catch(() => {});
      })
      .catch((error) => {
        setEstado({ clave: TEXTO_DEL_RECHAZO[error?.errorCode] || FALLO });
        // Caducado u ocupado: el backend lo anuló, y Seguridad no debe seguir
        // mostrándolo pendiente
        Promise.resolve(refetch?.()).catch(() => {});
      });
  }, [token, refetch, intento]);

  const reintenta = () => {
    setEstado({ clave: 'confirmEmailChange.confirming' });
    setIntento((n) => n + 1);
  };

  return (
    <div className={`${PANTALLA_MENOS_BARRA_INFERIOR} bg-gray-50`}>
      <HeaderAuth user={user} />
      <main className="max-w-md mx-auto px-4 py-10 text-center">
        {/* En el móvil el título va en la cabecera (screenTitles) */}
        <h1 className="hidden md:block text-xl font-semibold text-gray-900 mb-4">{t('confirmEmailChange.title')}</h1>
        <p
          className="text-gray-700 wrap-anywhere"
          role={estado.bien || estado.clave === 'confirmEmailChange.confirming' ? 'status' : 'alert'}
        >
          {t(estado.clave, { email: estado.email })}
        </p>
        {estado.clave === FALLO && (
          <button
            type="button"
            onClick={reintenta}
            className="inline-block mt-6 mr-2 px-4 py-2 rounded-lg border border-primary text-primary font-medium"
          >
            {t('confirmEmailChange.retry')}
          </button>
        )}
        {estado.clave !== 'confirmEmailChange.confirming' && (
          <Link
            to="/profile/edit"
            className="inline-block mt-6 px-4 py-2 rounded-lg bg-primary text-white font-medium"
          >
            {t('confirmEmailChange.toProfile')}
          </Link>
        )}
      </main>
    </div>
  );
};

export default ConfirmEmailChange;
