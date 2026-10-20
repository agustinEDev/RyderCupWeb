import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useAuthContext } from '../../hooks/useAuthContext';
import { ESTADO_DE_LA_SESION, estadoDeLaSesion } from '../../services/sesionEnPaginaPublica';

/**
 * «Volver» de los documentos legales (20 oct 2026). La aplicación instalada no
 * tiene botón atrás, y la única salida era el logo: a la portada, que luego
 * pregunta por la sesión y rebota al panel.
 *
 * - Con página anterior dentro de la aplicación, a ella.
 * - Sin ella —enlace directo, pestaña nueva desde la casilla de los Términos—,
 *   se pregunta al backend AL PULSAR: con sesión al panel, si no a la portada.
 *   Si el backend dice que la sesión está muerta, además se tira el `user`
 *   guardado, como en la pantalla de acceso: si no, cada pulsación volvería a
 *   la red.
 */
const VolverDeLoLegal = () => {
  const { t } = useTranslation('legal');
  const navigate = useNavigate();
  const { clearAuth } = useAuthContext();
  const [comprobando, setComprobando] = useState(false);

  const volver = async () => {
    // El `idx` que React Router guarda en el historial: 0 en la primera
    // entrada de la aplicación. `location.key !== 'default'` no bastaba: si esa
    // primera entrada la sustituye una redirección, la clave ya no es
    // `default` y lo de detrás es otra web
    if (globalThis.history.state?.idx > 0) {
      navigate(-1);
      return;
    }

    setComprobando(true);
    const estado = await estadoDeLaSesion();
    if (estado === ESTADO_DE_LA_SESION.MUERTA) clearAuth();
    navigate(estado === ESTADO_DE_LA_SESION.CONFIRMADA ? '/dashboard' : '/', { replace: true });
  };

  return (
    <button
      type="button"
      onClick={volver}
      disabled={comprobando}
      className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors mb-6 disabled:opacity-60"
    >
      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
      <span className="text-sm font-medium">{t('volver')}</span>
    </button>
  );
};

export default VolverDeLoLegal;
