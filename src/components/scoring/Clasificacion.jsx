import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import StablefordCalculator from '../../domain/services/StablefordCalculator';
import { useLaMasNueva } from '../../hooks/useLaMasNueva';
import { useSondeoMientras } from '../../hooks/useSondeoMientras';

const HOYOS = 18;

/**
 * Una clasificación de stroke play (FE #824, PR 7 y 8): la de una franja, la
 * general o la scratch. El orden, los puestos compartidos («T3»), NR y NP los
 * decide el servidor (RyderCupAm#535): aquí solo se pintan. Con varias
 * categorías, se filtra por una pidiéndosela al servidor, que recalcula sus
 * puestos.
 *
 * Se pide al abrirla y se relee cada `cada` ms mientras sigue abierta.
 *
 * @param {Object} props
 * @param {(categoria?: number) => Promise<Object>} props.pedir - Estable (`useCallback`)
 * @param {string} [props.userId] - Quién mira, destacado
 * @param {boolean} props.activa - Si está a la vista
 * @param {number|null} [props.cada] - Cada cuánto se relee; null, nunca
 * @param {boolean} [props.conCategoria] - La categoría de cada uno (la general)
 * @param {boolean} [props.conTarjetas] - Cuántas tarjetas lleva (la general)
 * @param {boolean} [props.conRegla] - La regla del torneo arriba (la general)
 * @param {string} [props.vacia] - Qué decir sin nadie todavía
 * @param {boolean} [props.filtrable] - Con filtro de categoría (la scratch no lo tiene)
 */
const Clasificacion = ({
  pedir,
  userId,
  activa,
  cada = null,
  conCategoria = false,
  conTarjetas = false,
  conRegla = false,
  vacia = 'partida.standingsEmpty',
  filtrable = true,
}) => {
  const { t } = useTranslation('scoring');
  const [clasificacion, setClasificacion] = useState(null);
  const [sinCargar, setSinCargar] = useState(false);
  const [categoria, setCategoria] = useState(null);
  // Las que hay, de la lectura sin filtro: al filtrar no desaparecen
  const [categorias, setCategorias] = useState([]);
  // Cambió el filtro y aún no ha llegado lo suyo: no se enseña lo de antes
  // bajo la categoría nueva (/code-review)
  const [cambiandoDeFiltro, setCambiandoDeFiltro] = useState(false);
  const lecturas = useLaMasNueva();

  const leer = useCallback(async () => {
    const turno = lecturas.turno();
    try {
      const leida = await pedir(categoria ?? undefined);
      if (!lecturas.aplicar(turno)) return;
      setClasificacion(leida);
      setSinCargar(false);
      setCambiandoDeFiltro(false);
      if (categoria == null) {
        setCategorias([...new Set(leida.rows.map((r) => r.category).filter((c) => c != null))].sort((a, b) => a - b));
      }
    } catch {
      if (lecturas.aplicar(turno)) setSinCargar(true);
    }
  }, [pedir, categoria, lecturas]);

  // Al abrirla, y otra vez si deja de releerse (la competición acaba: lo sin
  // terminar pasa a NR/NP y lo pintado era de hasta un minuto antes; revisor)
  useEffect(() => {
    if (!activa) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pedir la clasificación al servidor es el objetivo
    leer();
  }, [activa, leer, cada]);
  useSondeoMientras(activa && cada != null, leer, cada ?? 0);

  if (!activa) return null;

  if (sinCargar && !clasificacion) {
    return (
      <div className="space-y-2 text-sm text-amber-800">
        <p>{t('partida.standingsNotLoaded')}</p>
        <button type="button" onClick={leer} className="min-h-11 rounded-lg border border-gray-300 px-3 text-gray-700">
          {t('partida.retry')}
        </button>
      </div>
    );
  }
  if (!clasificacion) return null;

  const esMedal = clasificacion.tournamentType === 'MEDAL';
  const valor = (fila) => (esMedal ? StablefordCalculator.formatToPar(fila.value) : fila.value);
  const puesto = (fila) => (fila.position == null ? '—' : fila.tied ? `T${fila.position}` : `${fila.position}`);
  const comoVa = (fila) =>
    fila.status !== 'CLASIFICADO'
      ? t(`partida.status.${fila.status}`)
      : fila.thru >= HOYOS
        ? t('partida.finished')
        : t('partida.thru', { count: fila.thru });

  const pintaFila = (fila, testId) => {
    const yo = fila.userId === userId;
    return (
      <li
        key={testId}
        data-testid={testId}
        data-yo={String(yo)}
        className={`flex min-w-0 items-center gap-3 px-3 py-2 text-sm ${yo ? 'bg-green-50 font-semibold' : ''}`}
      >
        <span className="w-8 shrink-0 text-gray-500">{puesto(fila)}</span>
        {/* El nombre arriba y lo demás debajo: en una línea no cabía a 360 px (revisor) */}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-gray-900">{fila.name}</span>
          <span data-detalle className="block truncate text-xs font-normal text-gray-500">
            {[
              conCategoria && fila.category != null ? t('partida.categoryShort', { numero: fila.category }) : null,
              conTarjetas ? t('partida.cards', { count: fila.cards }) : null,
              comoVa(fila),
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </span>
        {fila.value != null && <span className="shrink-0 font-bold text-gray-900">{valor(fila)}</span>}
      </li>
    );
  };

  return (
    <div className="space-y-3">
      {conRegla && <p className="text-xs text-gray-500">{t(`partida.rule.${clasificacion.rule}`)}</p>}
      {/* Solo donde hay categorías: las filas de la scratch traen la suya,
          pero la scratch no se filtra (revisor) */}
      {filtrable && categorias.length > 1 && (
        <label className="block text-xs text-gray-600">
          {t('partida.category')}
          <select
            aria-label={t('partida.category')}
            value={categoria ?? ''}
            onChange={(e) => {
              setCambiandoDeFiltro(true);
              setCategoria(e.target.value === '' ? null : Number(e.target.value));
            }}
            className="mt-0.5 block min-h-11 w-full rounded-lg border border-gray-200 px-2 text-sm"
          >
            <option value="">{t('partida.allCategories')}</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {t('partida.categoryN', { numero: c })}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Falló una lectura con algo ya pintado: se dice (/code-review) */}
      {sinCargar && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-xs text-amber-800">
          <span>{t('partida.standingsNotLoaded')}</span>
          <button type="button" onClick={leer} className="min-h-11 rounded-lg border border-gray-300 px-3 text-gray-700">
            {t('partida.retry')}
          </button>
        </div>
      )}

      {cambiandoDeFiltro && !sinCargar ? (
        <p aria-busy="true" className="text-sm text-gray-500">{t('partida.loadingStandings')}</p>
      ) : clasificacion.rows.length === 0 ? (
        <p className="text-sm text-gray-500">{t(vacia)}</p>
      ) : (
        <ol className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {clasificacion.rows.map((fila) => pintaFila(fila, `fila-${fila.userId}`))}
        </ol>
      )}
      {/* La scratch corta en el 25.º: quien queda fuera ve su fila debajo */}
      {clasificacion.me && (
        <div>
          <p className="mb-1 text-xs font-semibold text-gray-600">{t('partida.yourPosition')}</p>
          <ol className="rounded-lg border border-dashed border-gray-300 bg-white">
            {pintaFila(clasificacion.me, 'fila-fuera-del-corte')}
          </ol>
        </div>
      )}
    </div>
  );
};

export default Clasificacion;
