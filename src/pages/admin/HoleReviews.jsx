import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import { listHoleReviewsUseCase } from '../../composition';
import BlockLoader from '../../components/ui/BlockLoader';
import RevisarHoyo from '../../components/admin/hoyos/RevisarHoyo';

/**
 * «Hoyos por revisar» del panel de admin (BE #575, 17 oct 2026): los campos con
 * muestras o con su línea guardada, y de cada hoyo cuántas muestras tiene y si
 * ya está guardado. Tocar un hoyo abre su revisión, sobre el mapa.
 */
const HoleReviews = () => {
  const { t } = useTranslation('admin');
  const [estado, setEstado] = useState({ cargando: true, fallo: false, cursos: [] });
  const [abierto, setAbierto] = useState(null);

  // Pedir la lista; el estado cambia solo cuando contesta
  const pedir = useCallback(async () => {
    try {
      setEstado({ cargando: false, fallo: false, cursos: await listHoleReviewsUseCase.execute() });
    } catch {
      setEstado((e) => ({ ...e, cargando: false, fallo: true }));
    }
  }, []);
  const cargar = () => {
    setEstado((e) => ({ ...e, cargando: true, fallo: false }));
    pedir();
  };

  useEffect(() => {
    const alAbrir = async () => pedir();
    alAbrir();
  }, [pedir]);

  const alCerrar = ({ cambiado } = {}) => {
    setAbierto(null);
    if (cambiado) cargar();
  };

  if (estado.cargando && !estado.cursos.length) return <BlockLoader />;
  if (estado.fallo) {
    return (
      <div className="flex flex-col items-start gap-3 py-6">
        <p className="text-sm text-gray-700">{t('holeReviews.error')}</p>
        <button type="button" onClick={cargar} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white">
          {t('holeReviews.retry')}
        </button>
      </div>
    );
  }
  if (!estado.cursos.length) return <p className="py-6 text-sm text-gray-500">{t('holeReviews.empty')}</p>;

  return (
    <div className="flex flex-col gap-4 py-2">
      <p className="text-sm text-gray-500">{t('holeReviews.intro')}</p>
      <ul className="flex flex-col gap-3">
        {estado.cursos.map((curso) => (
          <li key={curso.golfCourseId} className="rounded-xl border border-gray-200 p-3">
            <h3 className="font-semibold text-gray-900">{curso.name}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {curso.holes.map((hoyo) => (
                <button
                  key={hoyo.holeNumber}
                  type="button"
                  onClick={() => setAbierto({ golfCourseId: curso.golfCourseId, nombre: curso.name, numeroDeHoyo: hoyo.holeNumber })}
                  className={`min-h-11 inline-flex items-center gap-1.5 rounded-lg border px-3 text-sm ${
                    hoyo.saved ? 'border-green-300 bg-green-50 text-green-800' : 'border-gray-300 bg-white text-gray-800'
                  }`}
                >
                  <span className="font-semibold">{t('holeReviews.hole', { numero: hoyo.holeNumber })}</span>
                  <span>{t('holeReviews.samples', { count: hoyo.samples })}</span>
                  {hoyo.saved && (
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      {t('holeReviews.saved')}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      {abierto && <RevisarHoyo {...abierto} onCerrar={alCerrar} />}
    </div>
  );
};

export default HoleReviews;
