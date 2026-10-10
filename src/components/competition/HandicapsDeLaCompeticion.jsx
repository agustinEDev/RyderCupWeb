import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Clock } from 'lucide-react';
import {
  launchHandicapUpdateUseCase,
  scheduleHandicapUpdateUseCase,
  cancelScheduledHandicapUpdateUseCase,
  getCompetitionGolfCoursesUseCase,
} from '../../composition';
import customToast from '../../utils/toast';
import { aCamposDeLaCompeticion } from '../../utils/camposDeLaCompeticion';
import { aIsoConHuso, aEntradaDelCampo, horaEnElCampo } from '../../utils/horaDelCampo';

// Mientras hay una en marcha, cada cuánto se mira cómo va
const CADA = 15000;

/**
 * La tarjeta «Hándicaps» del organizador (FE #824, PR 5; RyderCupAM#507, #509,
 * #510). Decidido con Agustín el 11 oct 2026:
 *
 *   - Cómo fue la última actualización con la RFEG: en marcha (cuántos faltan),
 *     completa, incompleta (quién quedó sin actualizar) o cortada.
 *   - «Actualizar hándicaps», con su ventana: hasta cuándo se puede o por qué
 *     no (el motivo lo da el servidor). Si la última quedó a medias, la termina.
 *   - Programarla, en la HORA DEL CAMPO (la de las salidas), y anularla.
 *
 * En una Ryder también (solo cambia el perfil). Mientras hay una en marcha, se
 * relee sola cada 15 s; al acabar, para.
 *
 * @param {Object} props
 * @param {string} props.competitionId
 * @param {Object|null} props.handicapUpdate - La última, de la ficha
 * @param {Object} props.handicapUpdateWindow - La ventana del botón, de la ficha
 * @param {() => void} props.onReleer - Vuelve a pedir la ficha
 */
const HandicapsDeLaCompeticion = ({ competitionId, handicapUpdate, handicapUpdateWindow, onReleer }) => {
  const { t, i18n } = useTranslation('competitions');
  const [zona, setZona] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [programando, setProgramando] = useState(null);

  // La zona del campo, para escribir y decir las horas en la suya
  useEffect(() => {
    let vigente = true;
    (async () => getCompetitionGolfCoursesUseCase.execute(competitionId))()
      .then((r) => vigente && setZona(aCamposDeLaCompeticion(r).find((c) => c.timezone)?.timezone ?? null))
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, [competitionId]);

  const enMarcha = handicapUpdate?.status === 'IN_PROGRESS';
  // `onReleer` es estable (la ficha lo hace con `useCallback`): el reloj no se
  // rearma en cada pintada
  useEffect(() => {
    if (!enMarcha) return undefined;
    const reloj = setInterval(() => onReleer?.(), CADA);
    return () => clearInterval(reloj);
  }, [enMarcha, onReleer]);

  const cuando = (iso) => horaEnElCampo(iso, zona, i18n.language);

  const hacer = async (accion, alAcabar) => {
    setOcupado(true);
    try {
      await accion();
      alAcabar?.();
      onReleer?.();
    } catch (error) {
      customToast.error(error.message || t('handicaps.error'));
    } finally {
      setOcupado(false);
    }
  };

  const lanzar = () =>
    hacer(async () => {
      const { resumed } = await launchHandicapUpdateUseCase.execute(competitionId);
      customToast.success(t(resumed ? 'handicaps.resumed' : 'handicaps.launched'));
    });

  const programar = () =>
    hacer(
      () => scheduleHandicapUpdateUseCase.execute(competitionId, aIsoConHuso(programando, zona)),
      () => setProgramando(null)
    );

  const anular = () => hacer(() => cancelScheduledHandicapUpdateUseCase.execute(competitionId));

  const estado = () => {
    if (!handicapUpdate) return null;
    const { status, finishedAt, pendingPlayers } = handicapUpdate;
    if (status === 'IN_PROGRESS') return t('handicaps.inProgress', { count: pendingPlayers.length });
    if (status === 'COMPLETED') return t('handicaps.completed', { cuando: cuando(finishedAt) });
    if (status === 'INCOMPLETE') return t('handicaps.incomplete', { cuando: cuando(finishedAt) });
    return t('handicaps.stopped');
  };

  const ventana = handicapUpdateWindow;
  const boton = 'min-h-11 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50';

  return (
    <section data-testid="handicaps" className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-3">
      <h3 className="text-gray-900 font-bold text-lg flex items-center gap-2">
        <RefreshCw className="w-5 h-5 text-green-600" />
        {t('handicaps.title')}
      </h3>

      {handicapUpdate && (
        <div>
          <p data-testid="handicaps-estado" className="text-sm text-gray-800">{estado()}</p>
          {handicapUpdate.status === 'INCOMPLETE' && handicapUpdate.pendingPlayers.length > 0 && (
            <p data-testid="handicaps-pendientes" className="text-sm text-amber-800">
              {t('handicaps.pending', { jugadores: handicapUpdate.pendingPlayers.map((p) => p.name).join(', ') })}
            </p>
          )}
        </div>
      )}

      <div className="space-y-1">
        <button
          type="button"
          onClick={lanzar}
          disabled={ocupado || !ventana?.open || enMarcha}
          className={`${boton} bg-primary text-white`}
        >
          {t('handicaps.update')}
        </button>
        <p data-testid="handicaps-ventana" className="text-xs text-gray-500">
          {ventana?.open
            ? ventana.closesAt
              ? t('handicaps.openUntil', { cuando: cuando(ventana.closesAt), zona: zona ?? '' })
              : t('handicaps.openUntilStart')
            : ventana?.reason}
        </p>
      </div>

      {ventana?.scheduledAt && (
        <div className="flex flex-wrap items-center gap-2">
          <p data-testid="handicaps-programada" className="flex items-center gap-1 text-sm text-gray-800">
            <Clock className="h-4 w-4 text-gray-500" />
            {t('handicaps.scheduled', { cuando: cuando(ventana.scheduledAt), zona: zona ?? '' })}
          </p>
          <button type="button" onClick={anular} disabled={ocupado} className={`${boton} border border-gray-300 text-gray-700`}>
            {t('handicaps.cancelSchedule')}
          </button>
        </div>
      )}

      {programando === null ? (
        <button
          type="button"
          onClick={() => setProgramando(ventana?.scheduledAt ? aEntradaDelCampo(ventana.scheduledAt, zona) : '')}
          disabled={ocupado}
          className={`${boton} border border-gray-300 text-gray-700`}
        >
          {t('handicaps.schedule')}
        </button>
      ) : (
        <div className="space-y-2 rounded-lg bg-gray-50 p-3">
          <label className="block text-xs text-gray-600">
            {t('handicaps.scheduleAt', { zona: zona ?? '' })}
            <input
              type="datetime-local"
              aria-label={t('handicaps.scheduleAt', { zona: zona ?? '' })}
              value={programando}
              onChange={(e) => setProgramando(e.target.value)}
              className="mt-0.5 block w-full rounded-lg border border-gray-200 px-2 py-1 text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={programar}
              disabled={ocupado || !aIsoConHuso(programando, zona)}
              className={`${boton} bg-primary text-white`}
            >
              {t('handicaps.scheduleSave')}
            </button>
            <button type="button" onClick={() => setProgramando(null)} className={`${boton} text-gray-600`}>
              {t('handicaps.cancel')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default HandicapsDeLaCompeticion;
