import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

const CABECERA_DEL_EQUIPO = {
  A: 'bg-blue-50 border-b-2 border-blue-500',
  B: 'bg-red-50 border-b-2 border-red-500',
};

/**
 * Una tarjeta en el móvil: los hoyos de arriba abajo (FE #739).
 *
 * Solo dibuja. Quien la usa decide qué va en cada casilla —figura, puntos,
 * neto, golpes recibidos— y qué dice el resultado de cada hoyo: la misma pieza
 * sirve a la tarjeta de competición y a la de partida rápida, que hasta ahora
 * repetían cada cambio visual por separado (FE #746).
 *
 * @param {string} clave - Identifica las filas: `fila-<clave>-<hoyo>`
 * @param {string} testId - El de la tarjeta entera
 * @param {ReactNode} cabecera - Nombre y lo que haga falta debajo
 * @param {'A'|'B'|null} equipo - Color de la cabecera
 * @param {Array} hoyos - `{ holeNumber, par, strokeIndex, casilla, resultado?, mejorBola? }`
 * @param {{ ida?: number, vuelta?: number, total: number }} sumas
 * @param {boolean} conResultado - Si hay columna de quién se llevó el hoyo
 * @param {string} [columnaExtra] - Título de una columna más tras los golpes
 *   (los puntos Stableford, el neto en Medal); cada hoyo trae su `extra`
 */
const TarjetaVertical = ({
  clave,
  testId,
  cabecera,
  equipo,
  hoyos,
  sumas,
  conResultado = false,
  columnaExtra,
}) => {
  const { t } = useTranslation('scoring');

  const filaDeSuma = (nombre, etiqueta, valor) => (
    <tr className="bg-gray-50 border-y border-gray-200">
      <td colSpan={3} className="px-3 py-1.5 text-left text-[11px] font-bold text-gray-600">
        {etiqueta}
      </td>
      <td data-testid={`suma-${nombre}`} className="py-1.5 text-center font-bold text-gray-800">
        {valor || '-'}
      </td>
      {columnaExtra && <td />}
      {conResultado && <td />}
    </tr>
  );

  return (
    <div data-testid={testId} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className={`px-3 py-2 ${CABECERA_DEL_EQUIPO[equipo] ?? 'bg-gray-50 border-b border-gray-200'}`}>
        {cabecera}
      </div>
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="border-b border-gray-200 text-[11px] text-gray-500">
            <th className="py-1.5 font-semibold">{t('scorecard.hole')}</th>
            <th className="py-1.5 font-semibold">{t('scorecard.par')}</th>
            <th className="py-1.5 font-semibold">{t('scorecard.si')}</th>
            <th className="py-1.5 font-semibold">{t('scorecard.strokes')}</th>
            {columnaExtra && <th className="py-1.5 font-semibold">{columnaExtra}</th>}
            {conResultado && <th className="py-1.5 font-semibold">{t('scorecard.result')}</th>}
          </tr>
        </thead>
        <tbody>
          {hoyos.map((h) => (
            <Fragment key={h.holeNumber}>
              <tr
                data-testid={`fila-${clave}-${h.holeNumber}`}
                data-mejor-bola={String(Boolean(h.mejorBola))}
                className={`border-b border-gray-100 ${h.mejorBola ? 'bg-yellow-50' : ''}`}
              >
                <td className="w-10 py-0.5 text-center font-bold text-gray-700">{h.holeNumber}</td>
                <td data-testid="par" className="w-10 py-0.5 text-center text-gray-400">{h.par}</td>
                <td data-testid="hcp" className="w-10 py-0.5 text-center text-gray-400">{h.strokeIndex}</td>
                <td className="py-0.5 text-center">{h.casilla}</td>
                {columnaExtra && (
                  <td data-testid="extra" className="w-12 py-0.5 text-center">
                    {h.extra}
                  </td>
                )}
                {conResultado && (
                  <td className="w-16 py-0.5 pr-2 text-center">
                    <span
                      data-testid="resultado"
                      className={`block rounded-md py-0.5 text-[10.5px] font-bold ${h.resultado?.clase ?? ''}`}
                    >
                      {h.resultado?.texto ?? ''}
                    </span>
                  </td>
                )}
              </tr>
              {h.holeNumber === 9 && sumas.ida != null && filaDeSuma('ida', t('scorecard.out'), sumas.ida)}
            </Fragment>
          ))}
          {sumas.vuelta != null && filaDeSuma('vuelta', t('scorecard.in'), sumas.vuelta)}
          {filaDeSuma('total', t('scorecard.total'), sumas.total)}
        </tbody>
      </table>
    </div>
  );
};

export default TarjetaVertical;
