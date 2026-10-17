import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { listHoleReviewsUseCase } from '../../composition';
import customToast from '../../utils/toast';
import BlockLoader from '../../components/ui/BlockLoader';
import RevisarHoyo from '../../components/admin/hoyos/RevisarHoyo';

/**
 * Los hoyos pendientes del panel de admin (BE #575, 17 oct 2026): un bloque por
 * campo y, debajo, una fila a todo el ancho por hoyo, en el orden del backend (de
 * menor a mayor), con cuántas muestras tiene. Tocar un hoyo abre su revisión,
 * sobre el mapa; al guardarlo, desaparece de aquí (Agustín, 17 oct).
 */
const HoleReviews = () => {
  const { t } = useTranslation('admin');
  const [estado, setEstado] = useState({ cargando: true, fallo: false, cursos: [] });
  const [abierto, setAbierto] = useState(null);
  const hayLista = useRef(false);
  useEffect(() => {
    hayLista.current = estado.cursos.length > 0;
  }, [estado.cursos]);

  // Cada petición lleva su número: si dos se cruzan, solo cuenta la última que
  // se pidió, o una lista vieja volvería a pintar un hoyo ya guardado (CodeRabbit)
  const ultimaPeticion = useRef(0);

  // Pedir la lista; el estado cambia solo cuando contesta. Si falla con la lista
  // ya a la vista, se queda (y quien la pidió avisa); sin ella, el fallo. Una
  // respuesta que ya no es la última devuelve null y no toca nada
  const pedir = useCallback(async () => {
    ultimaPeticion.current += 1;
    const esta = ultimaPeticion.current;
    try {
      const cursos = await listHoleReviewsUseCase.execute();
      if (esta !== ultimaPeticion.current) return null;
      setEstado({ cargando: false, fallo: false, cursos });
      return true;
    } catch {
      if (esta !== ultimaPeticion.current) return null;
      setEstado((e) => ({ ...e, cargando: false, fallo: !hayLista.current }));
      return false;
    }
  }, []);
  const cargar = async () => {
    setEstado((e) => ({ ...e, cargando: true, fallo: false }));
    const bien = await pedir();
    if (bien === false && hayLista.current) customToast.error(t('holeReviews.error'));
  };

  useEffect(() => {
    const alAbrir = async () => pedir();
    alAbrir();
  }, [pedir]);

  // Un hoyo guardado sale de la lista ya, sin esperar a la recarga: si esta
  // fallara, no seguiría ahí como pendiente
  const alCerrar = ({ cambiado, guardado } = {}) => {
    if (guardado && abierto) {
      const { golfCourseId, numeroDeHoyo } = abierto;
      setEstado((e) => ({
        ...e,
        cursos: e.cursos
          .map((c) => (c.golfCourseId === golfCourseId ? { ...c, holes: c.holes.filter((h) => h.holeNumber !== numeroDeHoyo) } : c))
          .filter((c) => c.holes.length > 0),
      }));
    }
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
      {estado.cursos.map((curso) => (
        <section key={curso.golfCourseId} aria-labelledby={`campo-${curso.golfCourseId}`} className="rounded-xl border border-gray-200 bg-white">
          <header className="border-b border-gray-200 px-4 py-3">
            <h3 id={`campo-${curso.golfCourseId}`} className="font-semibold text-gray-900">
              {curso.name}
            </h3>
            <p className="text-sm text-gray-500">{t('holeReviews.pendingHoles', { count: curso.holes.length })}</p>
          </header>
          <ul className="divide-y divide-gray-200">
            {curso.holes.map((hoyo) => (
              <li key={hoyo.holeNumber}>
                <button
                  type="button"
                  onClick={() => setAbierto({ golfCourseId: curso.golfCourseId, nombre: curso.name, numeroDeHoyo: hoyo.holeNumber })}
                  className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-gray-900"
                >
                  <span className="flex-1 font-medium">{t('holeReviews.hole', { numero: hoyo.holeNumber })}</span>
                  <span className="text-sm text-gray-500">{t('holeReviews.samples', { count: hoyo.samples })}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {abierto && <RevisarHoyo {...abierto} onCerrar={alCerrar} />}
    </div>
  );
};

export default HoleReviews;
