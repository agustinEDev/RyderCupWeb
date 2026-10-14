import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import StablefordCalculator from '../../domain/services/StablefordCalculator';
import { useLaMasNueva } from '../../hooks/useLaMasNueva';
import { useSondeoMientras } from '../../hooks/useSondeoMientras';
import { useCentrarEnMiFila } from '../../hooks/useCentrarEnMiFila';
import { conGenero } from '../../utils/genero';

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
 * @param {number|string} [props.version] - Al cambiar, se relee (se cerró la franja)
 * @param {boolean} [props.conRegla] - La regla del torneo arriba (la general)
 * @param {string} [props.vacia] - Qué decir sin nadie todavía
 * @param {boolean} [props.filtrable] - Con filtro de categoría (la scratch no lo tiene)
 * @param {'una'|'alAbrir'} [props.centraEnMi] - Si participo, llevarme a mi fila
 */
const Clasificacion = ({
  pedir,
  userId,
  activa,
  cada = null,
  version,
  conRegla = false,
  vacia = 'partida.standingsEmpty',
  filtrable = true,
  centraEnMi = null,
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
  // Cada lectura que responde, bien o mal: con ella se decide si llevarme a
  // mi fila (ver useCentrarEnMiFila)
  const [respuestas, setRespuestas] = useState(0);

  const leer = useCallback(async () => {
    const turno = lecturas.turno();
    try {
      const leida = await pedir(categoria ?? undefined);
      if (!lecturas.aplicar(turno)) return;
      setClasificacion(leida);
      setRespuestas((n) => n + 1);
      setSinCargar(false);
      setCambiandoDeFiltro(false);
      if (categoria == null) {
        setCategorias([...new Set(leida.rows.map((r) => r.category).filter((c) => c != null))].sort((a, b) => a - b));
      }
    } catch {
      if (!lecturas.aplicar(turno)) return;
      setSinCargar(true);
      setRespuestas((n) => n + 1);
    }
  }, [pedir, categoria, lecturas]);

  // Al abrirla, y otra vez si deja de releerse (la competición acaba: lo sin
  // terminar pasa a NR/NP y lo pintado era de hasta un minuto antes; revisor)
  useEffect(() => {
    if (!activa) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pedir la clasificación al servidor es el objetivo
    leer();
  }, [activa, leer, cada, version]);
  useSondeoMientras(activa && cada != null, leer, cada ?? 0);
  const bloqueRef = useCentrarEnMiFila({ modo: centraEnMi, activa, respuestas });

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
  const SIN = t('partida.none');
  const valor = (fila) => (fila.value == null ? SIN : esMedal ? StablefordCalculator.formatToPar(fila.value) : fila.value);
  const puesto = (fila) => (fila.position == null ? SIN : fila.tied ? `T${fila.position}` : `${fila.position}`);
  // THRU, como en los circuitos: los hoyos jugados, F acabado, o el código
  // (NR, NP) con su nombre entero al pasar por encima (pasada, FE #824)
  // Un retirado en Stableford conserva su puesto con lo jugado, pero sus hoyos
  // decían que seguía en el campo: «R» (QA del 11 oct 2026)
  // El nombre entero, en femenino si la fila es de una jugadora: «No
  // presentada», «Retirada» (FE #856)
  const codigo = (estado, genero) => ({
    texto: t(`partida.statusShort.${estado}`),
    titulo: t(`partida.status.${estado}`, conGenero(genero)),
  });
  const thru = (fila) => {
    if (fila.status !== 'CLASIFICADO') return codigo(fila.status, fila.teeGender);
    if (fila.retired) return codigo('RETIRADO', fila.teeGender);
    return { texto: fila.thru >= HOYOS ? t('partida.thruFinished') : String(fila.thru), titulo: undefined };
  };

  // Una línea por jugador, en columnas: POS · JUGADOR · PTS/PAR · THRU, como
  // los leaderboards de los circuitos (decidido con Agustín tras la pasada)
  const pintaFila = (fila, testId) => {
    const yo = fila.userId === userId;
    const { texto, titulo } = thru(fila);
    return (
      <tr
        key={testId}
        data-testid={testId}
        data-yo={String(yo)}
        // Enfocable a mano: al llevarme a ella, el foco viene con la vista
        tabIndex={yo ? -1 : undefined}
        className={yo ? 'bg-green-50/70 outline-none' : ''}
      >
        {/* «T22» no cabía en w-10 y se pegaba al nombre (QA del 11 oct 2026) */}
        {/* La marca de mi fila, en su primera celda: Safari no pinta sombras
            en una fila de tabla (revisor) */}
        <td
          className={`w-12 py-2.5 pr-2 pl-3 text-xs font-medium text-gray-400 tabular-nums ${
            yo ? 'shadow-[inset_3px_0_0_var(--color-primary-500)]' : ''
          }`}
        >
          {puesto(fila)}
        </td>
        {/* El nombre entero, en dos líneas si no cabe: cortado a 360 px se leía
            «Helena Pru…» (2.ª pasada del QA, 12 oct 2026) */}
        <td title={fila.name} className={`break-words py-2.5 pr-2 leading-snug ${yo ? 'font-semibold text-gray-900' : 'text-gray-800'}`}>
          {fila.name}
        </td>
        <td className="w-12 py-2.5 text-right text-[15px] font-semibold text-gray-900 tabular-nums">{valor(fila)}</td>
        <td data-columna="thru" className="w-12 py-2.5 pr-3 text-right text-[11px] text-gray-400 tabular-nums">
          {/* NR, NP: abreviatura con su nombre entero, que los lectores de pantalla sí dicen (revisor) */}
          {titulo ? <abbr title={titulo} className="no-underline">{texto}</abbr> : texto}
        </td>
      </tr>
    );
  };

  const tabla = (filas, conCabecera, nombre) => (
    <table aria-label={nombre} className="w-full table-fixed border-collapse text-sm">
      {conCabecera && (
        <thead className="border-b border-gray-100 text-left text-[10px] font-medium uppercase tracking-wider text-gray-400">
          <tr>
            <th scope="col" className="w-12 pt-1 pb-1.5 pr-2 pl-3 font-medium">{t('partida.colPos')}</th>
            <th scope="col" className="pt-1 pb-1.5 pr-2 font-medium">{t('partida.colPlayer')}</th>
            <th scope="col" className="w-12 pt-1 pb-1.5 text-right font-medium">{t(esMedal ? 'partida.colToPar' : 'partida.colPoints')}</th>
            <th scope="col" className="w-12 pt-1 pb-1.5 pr-3 text-right font-medium">{t('partida.colThru')}</th>
          </tr>
        </thead>
      )}
      <tbody className="divide-y divide-gray-50">{filas}</tbody>
    </table>
  );

  return (
    <div ref={bloqueRef} className="space-y-3">
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
        // Redondeada: sobre el gris de su página no queda un rectángulo plano (revisor)
        <div className="overflow-hidden rounded-lg bg-white">
          {tabla(
            clasificacion.rows.map((fila) => pintaFila(fila, `fila-${fila.userId}`)),
            true,
            t('partida.standingsTable')
          )}
        </div>
      )}
      {/* La scratch corta en el 25.º: quien queda fuera ve su fila debajo */}
      {/* Sin haber jugado no tiene posición (QA 3) */}
      {clasificacion.me && clasificacion.me.status !== 'SIN_EMPEZAR' && (
        <div>
          <p className="mb-1 text-xs font-semibold text-gray-600">{t('partida.yourPosition')}</p>
          <div className="overflow-hidden rounded-lg border border-dashed border-gray-300 bg-white">
            {/* Con su cabecera también: sin ella sus celdas no dicen de qué columna son (revisor) */}
            {tabla(pintaFila(clasificacion.me, 'fila-fuera-del-corte'), true, t('partida.yourPosition'))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Clasificacion;
