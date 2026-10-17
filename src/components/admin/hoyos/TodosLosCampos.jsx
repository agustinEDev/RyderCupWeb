import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { getHoleReviewUseCase } from '../../../composition';
import { useAuth } from '../../../hooks/useAuth';
import GolfCourseSearchBox from '../../golf_course/GolfCourseSearchBox';
import BlockLoader from '../../ui/BlockLoader';
import RevisarHoyo from './RevisarHoyo';

// Cómo está un hoyo, en el orden en que manda (T4): lo guardado por el admin,
// la línea de OSM aprobada, las muestras o nada
const estadoDe = (hoyo, t) => {
  if (hoyo.guardada) return t('allCourses.saved');
  if (hoyo.osm) return t('allCourses.osm');
  if (hoyo.muestras.length) return t('holeReviews.samples', { count: hoyo.muestras.length });
  return t('allCourses.empty');
};

/**
 * «Todos los campos» de la sección Hoyos (Agustín, 17 oct): el buscador de
 * campos de la app y, elegido uno, sus 18 hoyos (también en los de 9: del 10 al
 * 18 se marcan aparte), cada uno con cómo está. Tocar uno abre la misma revisión
 * que los pendientes: ahí se marca desde cero, se corrige y se reabre. El campo
 * va en la URL (`?ver=campos&campo=<id>`), así que el «atrás» funciona.
 */
const TodosLosCampos = () => {
  const { t } = useTranslation('admin');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const idDelCampo = parametros.get('campo');
  const [estado, setEstado] = useState({ id: null, campo: null, fallo: false });
  const [abierto, setAbierto] = useState(null);
  // Si se piden dos seguidos, solo cuenta el último (como en los pendientes)
  const ultimaPeticion = useRef(0);

  const pedir = async (id) => {
    ultimaPeticion.current += 1;
    const esta = ultimaPeticion.current;
    try {
      const campo = await getHoleReviewUseCase.execute(id);
      if (esta === ultimaPeticion.current) setEstado({ id, campo, fallo: false });
    } catch {
      if (esta === ultimaPeticion.current) setEstado({ id, campo: null, fallo: true });
    }
  };
  const pedirElCampo = useRef(pedir);
  useEffect(() => {
    pedirElCampo.current = pedir;
  });

  useEffect(() => {
    if (!idDelCampo) return;
    const alElegir = async () => pedirElCampo.current(idDelCampo);
    alElegir();
  }, [idDelCampo]);

  const elegir = (curso) => setParametros({ ver: 'campos', campo: curso.id });
  const cambiarDeCampo = () => setParametros({ ver: 'campos' });
  const alCerrar = ({ cambiado } = {}) => {
    setAbierto(null);
    if (cambiado) pedir(idDelCampo);
  };

  if (!idDelCampo) {
    return (
      <div className="flex flex-col gap-3 py-2">
        <p className="text-sm text-gray-500">{t('allCourses.intro')}</p>
        <GolfCourseSearchBox
          countryCode={user?.country_code || 'ES'}
          selectedCourse={null}
          onCourseSelect={elegir}
          onRequestNewCourse={() => navigate('/admin/campos')}
          allowOtherCountries
        />
      </div>
    );
  }

  const cargado = estado.id === idDelCampo ? estado : null;
  return (
    <div className="flex flex-col gap-3 py-2">
      <button type="button" onClick={cambiarDeCampo} className="min-h-11 self-start rounded-lg bg-gray-100 px-3 text-sm font-semibold text-gray-900">
        {t('allCourses.changeCourse')}
      </button>
      {!cargado && <BlockLoader />}
      {cargado?.fallo && <p role="alert" className="text-sm text-red-700">{t('allCourses.error')}</p>}
      {cargado?.campo && (
        <section aria-labelledby="todos-los-campos-nombre" className="rounded-xl border border-gray-200 bg-white">
          <header className="border-b border-gray-200 px-4 py-3">
            <h3 id="todos-los-campos-nombre" className="font-semibold text-gray-900">
              {cargado.campo.name}
            </h3>
          </header>
          <ul className="divide-y divide-gray-200">
            {cargado.campo.holes.map((hoyo) => (
              <li key={hoyo.holeNumber}>
                <button
                  type="button"
                  onClick={() => setAbierto({ golfCourseId: cargado.campo.golfCourseId, nombre: cargado.campo.name, numeroDeHoyo: hoyo.holeNumber })}
                  className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-gray-900"
                >
                  <span className="flex-1 font-medium">{t('allCourses.hole', { numero: hoyo.holeNumber })}</span>
                  <span className="text-sm text-gray-500">{estadoDe(hoyo, t)}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {abierto && <RevisarHoyo {...abierto} onCerrar={alCerrar} />}
    </div>
  );
};

export default TodosLosCampos;
