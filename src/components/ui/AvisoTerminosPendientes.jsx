import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';
import { useTerminosPendientes } from '../../hooks/useTerminosPendientes';
import { esLaClasificacionCompartida } from '../../utils/rutasPublicas';

/**
 * Los Términos pendientes, avisados en la clasificación compartida (hotfix
 * 2.50.1).
 *
 * En las rutas privadas manda `ProtectedRoute`, que lleva a aceptarlos; la
 * clasificación compartida es pública y no tiene guardia, así que quien solo
 * abría su enlace no llegaba nunca a la pantalla. No bloquea: la clasificación
 * se sigue viendo. Solo ahí: en entrar, registrarse o restablecer la contraseña
 * estorbaría, y en las páginas legales se lee lo que se va a aceptar (revisión).
 *
 * Solo con la sesión CONFIRMADA por el servidor: la copia del dispositivo puede
 * ser de antes de aceptarlos, y sin red tampoco se podrían aceptar. Lee la
 * sesión sin preguntar a la red.
 */
const AvisoTerminosPendientes = () => {
  const { t } = useTranslation('common');
  const location = useLocation();
  const pendientes = useTerminosPendientes({ soloConfirmados: true });

  if (!pendientes || !esLaClasificacionCompartida(location.pathname)) return null;

  return (
    <div
      data-testid="aviso-terminos-pendientes"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
    >
      <FileText className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <p className="min-w-0 text-center">{t('avisoTerminos.texto')}</p>
      {/* Con el origen: al aceptarlos se vuelve aquí */}
      <Link
        to="/accept-terms"
        state={{ from: location }}
        className="inline-flex min-h-11 items-center font-semibold text-amber-900 underline"
      >
        {t('avisoTerminos.aceptar')}
      </Link>
    </div>
  );
};

export default AvisoTerminosPendientes;
