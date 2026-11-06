import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../components/layout/HeaderAuth';
import { useAuth } from '../hooks/useAuth';
import { confirmEmailChangeUseCase } from '../composition';
import { laPantallaEstaLista } from '../utils/cortinaDeArranque';
import { PANTALLA_MENOS_BARRA_INFERIOR } from '../utils/barraInferior';

// Cada rechazo del backend, con su texto (RyderCupAm #749)
const TEXTO_DEL_RECHAZO = {
  EMAIL_CHANGE_EXPIRED: 'confirmEmailChange.expired',
  EMAIL_ALREADY_IN_USE: 'confirmEmailChange.inUse',
};

/**
 * El enlace que confirma un correo nuevo (RyderCupAm #749). Va dentro de la
 * sesión: un desconocido que lo reciba por un error al escribir el correo no puede
 * confirmarlo. Si no había sesión, el login devuelve aquí con el token.
 */
const ConfirmEmailChange = () => {
  const { t } = useTranslation('profile');
  const { user, refetch } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [estado, setEstado] = useState(token ? { clave: 'confirmEmailChange.confirming' } : {
    clave: 'confirmEmailChange.invalid',
  });
  // Una sola vez: el token se gasta al confirmarlo
  const enviado = useRef(false);

  useEffect(() => {
    laPantallaEstaLista();
  }, []);

  useEffect(() => {
    if (!token || enviado.current) return;
    enviado.current = true;
    confirmEmailChangeUseCase
      .execute(token)
      .then(async (confirmado) => {
        setEstado({ clave: 'confirmEmailChange.done', email: confirmado?.email, bien: true });
        await refetch?.();
      })
      .catch((error) => {
        setEstado({ clave: TEXTO_DEL_RECHAZO[error?.errorCode] || 'confirmEmailChange.invalid' });
      });
  }, [token, refetch]);

  return (
    <div className={`${PANTALLA_MENOS_BARRA_INFERIOR} bg-gray-50`}>
      <HeaderAuth user={user} />
      <main className="max-w-md mx-auto px-4 py-10 text-center">
        {/* En el móvil el título va en la cabecera (screenTitles) */}
        <h1 className="hidden md:block text-xl font-semibold text-gray-900 mb-4">{t('confirmEmailChange.title')}</h1>
        <p className="text-gray-700 wrap-anywhere" role="status">
          {t(estado.clave, { email: estado.email })}
        </p>
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
