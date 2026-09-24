import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CalendarDays, MapPin, Plus, Trash2 } from 'lucide-react';
import {
  getScheduleUseCase,
  getCompetitionGolfCoursesUseCase,
  createRoundUseCase,
  updateRoundUseCase,
  deleteRoundUseCase,
} from '../../composition';
import customToast from '../../utils/toast';
import { FRANJAS, diasDelTorneo, franjasLibres, partidosDeLaSesion } from '../../utils/agenda';

const FORMATOS = ['SINGLES', 'FOURBALL', 'FOURSOMES'];

// Solo se toca una sesión que todavía no tiene partidos: con ellos, cambiarle
// el formato o el campo dejaría los partidos sin relación con lo que dice
const SE_PUEDE_TOCAR = new Set(['PENDING_TEAMS', 'PENDING_MATCHES']);

const leerCampos = (resultado) => {
  const lista = Array.isArray(resultado) ? resultado : resultado?.golf_courses || [];
  return lista
    .map((item) => ({
      id: item.golf_course?.id || item.golf_course_id || item.id,
      name: item.golf_course?.name || item.name || '',
    }))
    .filter((campo) => campo.id);
};

/**
 * La agenda de la competición (FE #654): el torneo ES su agenda.
 *
 * Días, y en cada día sus sesiones —franja, formato, campo y cuántos partidos
 * salen—, a la vista de todos en la ficha. El organizador la cambia aquí
 * mismo: el formato de un toque, añadir o quitar sesiones y el campo de cada
 * una. Antes eran seis campos por ronda en otra pantalla.
 *
 * El modo de hándicap y el allowance no se preguntan: salen del modo de juego
 * elegido al crear la competición.
 *
 * @param {Object} props
 * @param {string} props.competitionId
 * @param {string} props.startDate - YYYY-MM-DD
 * @param {string} props.endDate - YYYY-MM-DD
 * @param {boolean} props.canManage - Si quien mira la organiza
 * @param {number} props.jugadores - Inscritos aprobados, para la cuenta de partidos
 */
const AgendaDeLaCompeticion = ({ competitionId, startDate, endDate, canManage, jugadores }) => {
  const { t, i18n } = useTranslation('schedule');
  const [agenda, setAgenda] = useState(null);
  const [campos, setCampos] = useState([]);
  const [sinCargar, setSinCargar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [anadiendo, setAnadiendo] = useState(false);
  const [diaNuevo, setDiaNuevo] = useState('');
  const [franjaNueva, setFranjaNueva] = useState('');

  const cargar = useCallback(async () => {
    // Por separado: sin los campos la agenda se sigue pudiendo enseñar
    // Cada una dentro de su función async: un fallo, aunque sea síncrono, es
    // un rechazo más y no se lleva la ficha entera
    const [deLaAgenda, deLosCampos] = await Promise.allSettled([
      (async () => getScheduleUseCase.execute(competitionId))(),
      (async () => getCompetitionGolfCoursesUseCase.execute(competitionId))(),
    ]);
    if (deLosCampos.status === 'fulfilled') setCampos(leerCampos(deLosCampos.value));
    if (deLaAgenda.status === 'fulfilled') {
      setAgenda(deLaAgenda.value);
      setSinCargar(false);
    } else {
      // No se pudo preguntar: decir «no hay sesiones» sería afirmar algo que
      // no se sabe, y el organizador se pondría a crear las que ya tiene
      setSinCargar(true);
    }
  }, [competitionId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pedir la agenda al servidor al montar es justamente el objetivo, y lo pintado es su respuesta
    cargar();
  }, [cargar]);

  const sesiones = useMemo(() => agenda?.rounds || [], [agenda]);
  const dias = useMemo(() => diasDelTorneo(startDate, endDate), [startDate, endDate]);

  const porDia = useMemo(() => {
    const orden = (s) => FRANJAS.indexOf(s.sessionType);
    return [...new Set(sesiones.map((s) => s.roundDate))]
      .sort()
      .map((dia) => ({
        dia,
        sesiones: sesiones.filter((s) => s.roundDate === dia).sort((a, b) => orden(a) - orden(b)),
      }));
  }, [sesiones]);

  const nombreDelCampo = (id) => campos.find((c) => c.id === id)?.name || '';
  // El campo se dice donde ayuda: si es uno solo en todo el torneo, una vez
  const unSoloCampo = campos.length === 1;

  const plantilla = agenda?.teamAssignment
    ? {
        equipoA: agenda.teamAssignment.teamAPlayerIds.length,
        equipoB: agenda.teamAssignment.teamBPlayerIds.length,
      }
    : { jugadores };

  const fecha = (dia) => {
    try {
      return new Date(`${dia}T00:00:00`).toLocaleDateString(i18n.language, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return dia;
    }
  };

  // Cada cambio se manda y la agenda se vuelve a leer, salga bien o mal: lo
  // que se pinta es siempre lo que hay en el servidor
  const cambiar = async (accion) => {
    setOcupado(true);
    try {
      await accion();
    } catch (error) {
      customToast.error(error.message || t('agenda.error'));
    } finally {
      await cargar();
      setOcupado(false);
    }
  };

  const franjasDelDia = diaNuevo ? franjasLibres(sesiones, diaNuevo) : [];

  const empezarAAnadir = () => {
    const primerDia = dias.find((dia) => franjasLibres(sesiones, dia).length > 0) || '';
    setDiaNuevo(primerDia);
    setFranjaNueva(primerDia ? franjasLibres(sesiones, primerDia)[0] : '');
    setAnadiendo(true);
  };

  const elegirDia = (dia) => {
    setDiaNuevo(dia);
    setFranjaNueva(franjasLibres(sesiones, dia)[0] || '');
  };

  const anadir = () =>
    cambiar(async () => {
      // Parejas los primeros días e individuales el último, como la propuesta
      const esElUltimo = diaNuevo === dias[dias.length - 1];
      await createRoundUseCase.execute(competitionId, {
        golf_course_id: campos[0]?.id,
        round_date: diaNuevo,
        session_type: franjaNueva,
        match_format: esElUltimo ? 'SINGLES' : 'FOURBALL',
      });
      setAnadiendo(false);
    });

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-gray-900 font-bold text-lg mb-1 flex items-center gap-2">
        <CalendarDays className="w-5 h-5 text-green-600" />
        {t('agenda.title')}
      </h3>
      {unSoloCampo && (
        <p
          data-testid="agenda-campo-unico"
          className="mb-3 flex min-w-0 items-center gap-1 text-sm text-gray-500"
        >
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="truncate">{campos[0].name}</span>
        </p>
      )}

      {sinCargar && (
        <p data-testid="agenda-sin-cargar" className="text-sm text-gray-500">
          {t('agenda.notLoaded')}
        </p>
      )}

      {!sinCargar && agenda && sesiones.length === 0 && (
        <p
          data-testid="agenda-vacia"
          className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {t(canManage ? 'agenda.emptyManage' : 'agenda.empty')}
        </p>
      )}

      <div className="space-y-4">
        {porDia.map(({ dia, sesiones: delDia }) => (
          <div key={dia} data-testid={`agenda-dia-${dia}`}>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-500">
              {fecha(dia)}
            </p>
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              {delDia.map((s) => {
                const tocable = canManage && SE_PUEDE_TOCAR.has(s.status);
                const partidos = s.matches?.length
                  ? s.matches.length
                  : partidosDeLaSesion(s.matchFormat, plantilla);
                return (
                  <li key={s.id} data-testid={`agenda-sesion-${s.id}`} className="p-3 space-y-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <span className="font-semibold text-gray-900">
                        {t(`sessions.${s.sessionType}`)}
                      </span>
                      {!tocable && (
                        <span className="text-gray-700">· {t(`formats.${s.matchFormat}`)}</span>
                      )}
                      {!unSoloCampo && !tocable && nombreDelCampo(s.golfCourseId) && (
                        <span className="min-w-0 truncate text-gray-500">
                          · {nombreDelCampo(s.golfCourseId)}
                        </span>
                      )}
                      <span
                        data-testid={`agenda-partidos-${s.id}`}
                        className="ml-auto shrink-0 text-xs text-gray-500"
                      >
                        {t('agenda.matches', { count: partidos })}
                      </span>
                    </div>

                    {tocable && (
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <div
                          role="group"
                          aria-label={t('agenda.format')}
                          className="flex rounded-lg border border-gray-200 p-0.5"
                        >
                          {FORMATOS.map((formato) => (
                            <button
                              key={formato}
                              type="button"
                              data-testid={`agenda-formato-${s.id}-${formato}`}
                              aria-pressed={s.matchFormat === formato}
                              disabled={ocupado || s.matchFormat === formato}
                              onClick={() =>
                                cambiar(() =>
                                  updateRoundUseCase.execute(s.id, { match_format: formato })
                                )
                              }
                              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                                s.matchFormat === formato
                                  ? 'bg-primary text-white'
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              {t(`formats.${formato}`)}
                            </button>
                          ))}
                        </div>
                        {!unSoloCampo && campos.length > 0 && (
                          <select
                            data-testid={`agenda-campo-${s.id}`}
                            aria-label={t('agenda.course')}
                            value={s.golfCourseId}
                            disabled={ocupado}
                            onChange={(e) =>
                              cambiar(() =>
                                updateRoundUseCase.execute(s.id, { golf_course_id: e.target.value })
                              )
                            }
                            className="min-w-0 max-w-full truncate rounded-lg border border-gray-200 px-2 py-1 text-xs"
                          >
                            {campos.map((campo) => (
                              <option key={campo.id} value={campo.id}>
                                {campo.name}
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          type="button"
                          data-testid={`agenda-quitar-${s.id}`}
                          aria-label={t('agenda.remove')}
                          disabled={ocupado}
                          onClick={() => cambiar(() => deleteRoundUseCase.execute(s.id))}
                          className="ml-auto rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {canManage && !sinCargar && agenda && (
        <div className="mt-4">
          {!anadiendo ? (
            <button
              type="button"
              data-testid="agenda-anadir"
              onClick={empezarAAnadir}
              disabled={ocupado || campos.length === 0}
              className="flex items-center gap-1 text-sm font-medium text-primary disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {t('agenda.add')}
            </button>
          ) : (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <select
                data-testid="agenda-anadir-dia"
                aria-label={t('agenda.day')}
                value={diaNuevo}
                onChange={(e) => elegirDia(e.target.value)}
                className="rounded-lg border border-gray-200 px-2 py-1 text-sm"
              >
                {dias.map((dia) => (
                  <option key={dia} value={dia}>
                    {fecha(dia)}
                  </option>
                ))}
              </select>
              <select
                data-testid="agenda-anadir-franja"
                aria-label={t('agenda.slot')}
                value={franjaNueva}
                onChange={(e) => setFranjaNueva(e.target.value)}
                className="rounded-lg border border-gray-200 px-2 py-1 text-sm"
              >
                {franjasDelDia.map((franja) => (
                  <option key={franja} value={franja}>
                    {t(`sessions.${franja}`)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                data-testid="agenda-anadir-confirmar"
                onClick={anadir}
                disabled={ocupado || !diaNuevo || !franjaNueva}
                className="rounded-lg bg-primary px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
              >
                {t('agenda.addConfirm')}
              </button>
              <button
                type="button"
                onClick={() => setAnadiendo(false)}
                className="text-sm text-gray-500"
              >
                {t('agenda.cancel')}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default AgendaDeLaCompeticion;
