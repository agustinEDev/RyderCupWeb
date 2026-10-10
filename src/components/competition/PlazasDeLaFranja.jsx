import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, UserMinus } from 'lucide-react';
import { COGER, CAMBIAR, SOLTAR, ESPERAR, DEJAR_DE_ESPERAR } from '../../domain/services/PlazasEnFranjas';

/**
 * Las piezas de las plazas de una franja de stroke play (FE #824, PR 4),
 * para `FranjasDeLaCompeticion`: lo que puede hacer el jugador, quién juega y
 * quién espera (con lo que puede hacer el organizador) y los aprobados que aún
 * no tienen franja. Decidido con Agustín el 10 oct 2026.
 *
 * Cada acción la ejecuta el padre con `hacer(accion, aviso)`: la manda, dice
 * si salió bien o el motivo del servidor, y vuelve a leer la agenda.
 */

// 44 px de alto: se tocan con el dedo (revisor)
const boton = 'min-h-11 rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50';
const principal = `${boton} border-primary bg-primary text-white`;
const secundario = `${boton} border-gray-300 bg-white text-gray-700 hover:bg-gray-50`;

/**
 * Lo que el jugador puede hacer en una franja, y si tiene plaza o espera.
 * @param {Object} props
 * @param {Object} props.franja
 * @param {Object|null} props.accion - De `situacionEnLasFranjas`
 * @param {boolean} props.puedeElegir - Con las inscripciones abiertas
 * @param {string} props.userId
 * @param {(f: Object) => string} props.etiqueta - «Mañana · sáb 12 oct»
 * @param {Object<string, Object>} props.franjasPorId
 * @param {boolean} props.ocupado
 * @param {(accion: Function, aviso: string) => void} props.hacer
 * @param {Object} props.casos - Los casos de uso de plazas y esperas
 */
export const AccionDelJugador = ({ franja, accion, puedeElegir, userId, etiqueta, franjasPorId, ocupado, hacer, casos }) => {
  const { t } = useTranslation('schedule');
  const [confirmandoSoltar, setConfirmandoSoltar] = useState(false);
  const [eligiendoCual, setEligiendoCual] = useState(false);
  if (!accion) return null;

  const estado =
    accion.tipo === SOLTAR ? (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">{t('franjas.mine')}</span>
    ) : accion.tipo === DEJAR_DE_ESPERAR ? (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
        {t('franjas.waitingPosition', { count: accion.posicion })}
      </span>
    ) : null;
  if (!puedeElegir) return estado;

  const cambiarDesde = (dejar) =>
    hacer(() => casos.coger.execute(franja.id, { insteadOfRoundId: dejar }), 'franjas.switched');
  const mismoDia = accion.tipo === CAMBIAR && franjasPorId[accion.dejar[0]]?.roundDate === franja.roundDate;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {estado}
      {accion.tipo === COGER && (
        <button type="button" disabled={ocupado} className={principal}
          onClick={() => hacer(() => casos.coger.execute(franja.id, {}), 'franjas.took')}>
          {t('franjas.take')}
        </button>
      )}
      {accion.tipo === CAMBIAR && (
        <button type="button" disabled={ocupado} className={principal}
          onClick={() => (accion.dejar.length === 1 ? cambiarDesde(accion.dejar[0]) : setEligiendoCual(true))}>
          {t(mismoDia ? 'franjas.switchHere' : 'franjas.switchFor')}
        </button>
      )}
      {accion.tipo === SOLTAR && !confirmandoSoltar && (
        <button type="button" disabled={ocupado} className={secundario} onClick={() => setConfirmandoSoltar(true)}>
          {t('franjas.release')}
        </button>
      )}
      {accion.tipo === ESPERAR && (
        <button type="button" disabled={ocupado} className={secundario}
          onClick={() => hacer(() => casos.esperar.execute(franja.id), 'franjas.waitingJoined')}>
          {t('franjas.wait')}
        </button>
      )}
      {accion.tipo === DEJAR_DE_ESPERAR && (
        <button type="button" disabled={ocupado} className={secundario}
          onClick={() => hacer(() => casos.dejarDeEsperar.execute(franja.id, userId), 'franjas.waitingLeft')}>
          {t('franjas.leaveWaiting')}
        </button>
      )}

      {/* Soltar es perder la plaza: puede cogerla otro al momento. Solo si sigue
          siendo suya: tras releer pudo dejar de serlo (revisor) */}
      {confirmandoSoltar && accion.tipo === SOLTAR && (
        <div className="flex w-full flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
          <span className="min-w-0 flex-1">{t('franjas.releaseConfirm')}</span>
          <button type="button" disabled={ocupado} className="min-h-11 rounded-md bg-amber-600 px-3 py-1 font-semibold text-white"
            onClick={() => {
              setConfirmandoSoltar(false);
              hacer(() => casos.soltar.execute(franja.id, userId), 'franjas.released');
            }}>
            {t('franjas.releaseYes')}
          </button>
          <button type="button" className="min-h-11 rounded-md px-3 py-1" onClick={() => setConfirmandoSoltar(false)}>
            {t('agenda.no')}
          </button>
        </div>
      )}

      {/* Con varias suyas, cuál deja: el cambio es un solo paso. Solo mientras
          siga siendo un cambio: tras releer pudo pasar a otra cosa, y entonces
          no hay `dejar` (revisor) */}
      {eligiendoCual && accion.tipo === CAMBIAR && (
        <div className="w-full space-y-1 rounded-lg bg-gray-50 p-2 text-sm">
          <p className="text-gray-700">{t('franjas.whichToLeave')}</p>
          {accion.dejar.map((id) => (
            <button key={id} type="button" disabled={ocupado} className={`${secundario} mr-2`}
              onClick={() => {
                setEligiendoCual(false);
                cambiarDesde(id);
              }}>
              {t('franjas.leaveThis', { franja: etiqueta(franjasPorId[id]).franja, dia: etiqueta(franjasPorId[id]).dia })}
            </button>
          ))}
          <button type="button" className="text-sm text-gray-500" onClick={() => setEligiendoCual(false)}>
            {t('agenda.cancel')}
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Quién juega y quién espera en una franja, desplegable, y lo que puede hacer
 * con ellos el organizador: moverlos a otra con sitio (en un paso) y, con las
 * inscripciones abiertas, quitarlos.
 */
export const JugadoresDeLaFranja = ({
  franja,
  diasDe,
  nombreDe,
  conSitio,
  etiqueta,
  puedeColocar,
  puedeQuitar,
  ocupado,
  hacer,
  casos,
}) => {
  const { t } = useTranslation('schedule');
  const [abierta, setAbierta] = useState(false);
  const { playerIds, waitingIds } = franja.teeSheet;
  // Adónde se le puede mover: otra con sitio del mismo día (cambiarse), o de un
  // día en que no juega. Las demás el servidor las rechaza (revisor)
  const destinosDe = (id) =>
    conSitio.filter(
      (f) => f.id !== franja.id && (f.roundDate === franja.roundDate || !diasDe(id).has(f.roundDate))
    );

  return (
    <div>
      <button type="button" aria-expanded={abierta} onClick={() => setAbierta((a) => !a)}
        className="flex min-h-11 items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900">
        {abierta ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {t('franjas.showPlayers', { count: playerIds.length })}
      </button>
      {abierta && (
        <div className="mt-1 space-y-2">
          <ul data-testid={`jugadores-${franja.id}`} className="space-y-1">
            {playerIds.map((id) => (
              <li key={id} className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-gray-800">
                <span className="min-w-0 flex-1 truncate">{nombreDe(id)}</span>
                {puedeColocar && destinosDe(id).length > 0 && (
                  <select aria-label={t('franjas.moveTo', { jugador: nombreDe(id) })} value="" disabled={ocupado}
                    onChange={(e) =>
                      e.target.value &&
                      hacer(
                        () => casos.coger.execute(e.target.value, { userId: id, insteadOfRoundId: franja.id }),
                        'franjas.moved'
                      )
                    }
                    className="min-h-11 max-w-full rounded-lg border border-gray-200 px-2 py-1 text-xs">
                    <option value="">{t('franjas.moveToPlaceholder')}</option>
                    {destinosDe(id).map((f) => (
                      <option key={f.id} value={f.id}>{`${etiqueta(f).franja} · ${etiqueta(f).dia}`}</option>
                    ))}
                  </select>
                )}
                {puedeColocar && puedeQuitar && (
                  <button type="button" disabled={ocupado} aria-label={t('franjas.removePlayer', { jugador: nombreDe(id) })}
                    onClick={() => hacer(() => casos.soltar.execute(franja.id, id), 'franjas.playerRemoved')}
                    className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600">
                    <UserMinus className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {waitingIds.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500">{t('franjas.waitingList')}</p>
              <ol data-testid={`espera-${franja.id}`} className="list-decimal pl-5 text-sm text-gray-700">
                {waitingIds.map((id) => (
                  <li key={id}>{nombreDe(id)}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/** Los aprobados sin ninguna franja, para que el organizador los coloque. */
export const SinFranja = ({ jugadores, conSitio, etiqueta, ocupado, hacer, casos }) => {
  const { t } = useTranslation('schedule');
  if (jugadores.length === 0) return null;
  return (
    <div id="sin-franja" data-testid="sin-franja" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="mb-2 text-sm font-semibold text-amber-900">{t('franjas.withoutWindow', { count: jugadores.length })}</p>
      <ul className="space-y-1">
        {jugadores.map(({ userId, userName }) => (
          <li key={userId} className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-gray-800">
            <span className="min-w-0 flex-1 truncate">{userName}</span>
            {conSitio.length > 0 && (
              <select aria-label={t('franjas.placeIn', { jugador: userName })} value="" disabled={ocupado}
                onChange={(e) =>
                  e.target.value && hacer(() => casos.coger.execute(e.target.value, { userId }), 'franjas.placed')
                }
                className="min-h-11 max-w-full rounded-lg border border-gray-200 px-2 py-1 text-xs">
                <option value="">{t('franjas.placeInPlaceholder')}</option>
                {conSitio.map((f) => (
                  <option key={f.id} value={f.id}>{`${etiqueta(f).franja} · ${etiqueta(f).dia}`}</option>
                ))}
              </select>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
