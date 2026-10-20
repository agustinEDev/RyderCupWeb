import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { haySesionConfirmada } from '../../services/sesionEnPaginaPublica';

/**
 * «Volver» de los documentos legales (20 oct 2026). La aplicación instalada no
 * tiene botón atrás, y la única salida era el logo: a la portada, que luego
 * pregunta por la sesión y rebota al panel.
 *
 * - Con página anterior dentro de la aplicación, a ella.
 * - Sin ella —enlace directo, pestaña nueva desde la casilla de los Términos—,
 *   se pregunta al backend AL PULSAR: con sesión al panel, si no a la portada.
 */
const VolverDeLoLegal = () => {
  const { t } = useTranslation('legal');
  const navigate = useNavigate();
  const location = useLocation();
  const [comprobando, setComprobando] = useState(false);

  const volver = async () => {
    // `default` es la primera entrada de la carga: no hay a dónde volver
    if (location.key !== 'default') {
      navigate(-1);
      return;
    }

    setComprobando(true);
    const conSesion = await haySesionConfirmada();
    navigate(conSesion ? '/dashboard' : '/', { replace: true });
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
