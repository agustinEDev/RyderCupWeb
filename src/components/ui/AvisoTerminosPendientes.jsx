import { useSyncExternalStore } from 'react';
import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';
import { loQueHaySobreLaSesion, suscribeALaSesion } from '../../services/sesionCompartida';
import { debeAceptarLosTerminos } from '../../domain/services/aceptacionDeTerminos';
import { esRutaPublica, normalizaLaRuta } from '../../utils/rutasPublicas';

/** Donde se leen los Términos: ahí el aviso estorbaría lo que se va a aceptar. */
const PAGINAS_LEGALES = ['/terms', '/privacy', '/cookies', '/legal'];

/**
 * Los Términos pendientes, avisados en las rutas públicas (hotfix 2.50.1).
 *
 * En las privadas manda `ProtectedRoute`, que lleva a aceptarlos; en las
 * públicas no hay guardia, y quien solo abría el enlace de una clasificación
 * compartida no llegaba nunca a la pantalla. No bloquea: la clasificación se
 * sigue viendo.
 *
 * Solo con la sesión CONFIRMADA por el servidor: la copia del dispositivo puede
 * ser de antes de aceptarlos, y sin red tampoco se podrían aceptar. Lee la
 * sesión sin preguntar a la red: en las rutas públicas no se consulta.
 */
const AvisoTerminosPendientes = () => {
  const { t } = useTranslation('common');
  const location = useLocation();
  const { user, sinConfirmar } = useSyncExternalStore(suscribeALaSesion, loQueHaySobreLaSesion);

  const ruta = normalizaLaRuta(location.pathname);
  if (!esRutaPublica(ruta) || PAGINAS_LEGALES.includes(ruta)) return null;
  if (sinConfirmar || !debeAceptarLosTerminos(user)) return null;

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
