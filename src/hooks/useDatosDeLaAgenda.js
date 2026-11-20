import { useState, useEffect, useMemo } from 'react';
import customToast from '../utils/toast';
import { useCargaCancelableEffect } from './useCargaCancelableEffect';
import { useLaMasNueva } from './useLaMasNueva';
import {
  getScheduleUseCase,
  getCompetitionDetailUseCase,
  getCompetitionGolfCoursesUseCase,
  listEnrollmentsUseCase,
} from '../composition';
import { aCamposDeLaCompeticion } from '../utils/camposDeLaCompeticion';
import { registraElFallo } from '../utils/registraElFallo';

// El toast de «no se han podido cargar los inscritos»: uno solo, y se va al volver la lista
const AVISO_INSCRITOS = 'inscritos-sin-cargar';

/**
 * Lo que la agenda de una competición lee del servidor: la competición, la
 * agenda, los campos y los inscritos, con sus recargas y el aviso de los
 * inscritos que no se pudieron leer.
 *
 * @param {Object} params
 * @param {string} params.id - La competición.
 * @param {Object|null} params.user - Sin sesión no se pide nada.
 * @param {Function} params.navigate - Si la carga falla, a la ficha.
 * @param {Function} params.t - Las traducciones de la agenda.
 */
export const useDatosDeLaAgenda = ({ id, user, navigate, t }) => {
  const [competition, setCompetition] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [golfCourses, setGolfCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  // Si la lista de inscritos no se pudo cargar: vacía no es «no hay nadie», y
  // con ella el reparto manual mandaría solo a los capitanes (31 oct 2026)
  const [inscritosSinCargar, setInscritosSinCargar] = useState(false);
  // Las lecturas de inscritos pueden cruzarse (StrictMode, cambio de idioma, la
  // recarga tras «Generar»): un fallo viejo no pisa una lista nueva (CodeRabbit)
  const ordenInscritos = useLaMasNueva();

  // Build player name map from enrollments
  const playerNameMap = useMemo(() => {
    const map = new Map();
    enrollments.forEach((e) => {
      if (e.userId && e.userName) {
        map.set(e.userId, e.userName);
      }
    });
    return map;
  }, [enrollments]);

  const playerHandicapMap = useMemo(() => {
    const map = new Map();
    enrollments.forEach((e) => {
      if (e.userId && e.userHandicap != null) {
        map.set(e.userId, Number(e.userHandicap));
      }
    });
    return map;
  }, [enrollments]);

  // La carga de la agenda, con useCargaCancelableEffect: al cambiar de idioma,
  // al volver a pedirla o al salir, la anterior ya no toca nada, ni avisa ni se
  // lleva a nadie a la ficha. Con `t` entre las dependencias, como antes:
  // cambiar de idioma la vuelve a pedir
  const { cargando: isLoading, recargar: recargarTodo } =
    useCargaCancelableEffect(
      () => {
        const turno = ordenInscritos.turno();
        return Promise.all([
          getCompetitionDetailUseCase.execute(id),
          getScheduleUseCase.execute(id).catch(() => null),
          getCompetitionGolfCoursesUseCase.execute(id).catch(() => []),
          listEnrollmentsUseCase.execute(id).then(
            (lista) => ({ ok: true, lista }),
            () => ({ ok: false, lista: [] }),
          ),
        ]).then((datos) => ({ turno, datos }));
      },
      [id, user, navigate, t, ordenInscritos],
      {
        activa: Boolean(user),
        alCargar: ({
          turno,
          datos: [compData, scheduleData, coursesResult, enrollmentsData],
        }) => {
          setCompetition(compData);
          setSchedule(scheduleData);

          setGolfCourses(aCamposDeLaCompeticion(coursesResult));

          if (ordenInscritos.aplicar(turno)) {
            setEnrollments(enrollmentsData.lista);
            setInscritosSinCargar(!enrollmentsData.ok);
            // Con id: si la carga se repite (StrictMode, cambio de idioma), un solo aviso
            if (enrollmentsData.ok) {
              customToast.dismiss(AVISO_INSCRITOS);
            } else {
              customToast.error(t('errors.failedToLoadEnrollments'), {
                id: AVISO_INSCRITOS,
              });
            }
          }
        },
        alFallar: (error) => {
          registraElFallo(
            'SchedulePage.error-loading-schedule-data',
            'Error loading schedule data:',
            error,
          );
          customToast.error(t('errors.failedToLoadSchedule'));
          navigate(`/competitions/${id}`);
        },
      },
    );

  // El toast de los inscritos es de la agenda: al salir se va con ella (pasada
  // del Kind, 31 oct 2026: seguía ~1 s en la ficha)
  useEffect(() => {
    return () => {
      customToast.dismiss(AVISO_INSCRITOS);
    };
  }, []);

  const recargarCompeticion = async () => {
    try {
      setCompetition(await getCompetitionDetailUseCase.execute(id));
    } catch (error) {
      registraElFallo(
        'SchedulePage.error-reloading-competition',
        'Error reloading competition:',
        error,
      );
    }
  };

  const reloadSchedule = async () => {
    try {
      const scheduleData = await getScheduleUseCase.execute(id);
      setSchedule(scheduleData);
    } catch (error) {
      registraElFallo(
        'SchedulePage.error-reloading-schedule',
        'Error reloading schedule:',
        error,
      );
      customToast.error(t('errors.failedToLoadSchedule'));
    }
  };

  // Tras una generación bloqueada: la competición, la agenda y los inscritos a
  // la vez. Si algo falla, el fallo sale hacia quien la pidió, que decide qué
  // enseñar
  const recargarTrasGeneracionBloqueada = async () => {
    const turno = ordenInscritos.turno();
    const [competicion, agenda, inscripciones] = await Promise.all([
      getCompetitionDetailUseCase.execute(id),
      getScheduleUseCase.execute(id),
      listEnrollmentsUseCase.execute(id),
    ]);
    setCompetition(competicion);
    setSchedule(agenda);
    if (ordenInscritos.aplicar(turno)) {
      setEnrollments(inscripciones);
      setInscritosSinCargar(false);
      customToast.dismiss(AVISO_INSCRITOS);
    }
  };

  return {
    competition,
    setCompetition,
    schedule,
    golfCourses,
    enrollments,
    inscritosSinCargar,
    isLoading,
    recargarTodo,
    recargarCompeticion,
    reloadSchedule,
    recargarTrasGeneracionBloqueada,
    playerNameMap,
    playerHandicapMap,
  };
};
