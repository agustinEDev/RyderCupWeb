import { CompetitionName } from '../domain/value_objects/CompetitionName';
import { cupoDeJugadores } from './cupoDeJugadores';
import {
  ajustesParaCrear,
  diasDelTorneo,
  errorDeAjustes,
} from './ajustesDeStrokePlay';
import { diaDeLaSesion } from './diaDeLaSesion';
import { mensajeDelError } from './mensajeDelError';

/**
 * Lo que el formulario de competición manda al servidor y cómo se dice lo que
 * el servidor no acepta. Sin React: lo usa el envío de la página.
 */

/**
 * La petición de crear o editar una competición.
 *
 * @param {object} formData
 * @param {{conEquipos: boolean, isEditMode: boolean, tipoElegido: ?string,
 *   cupoCargado: number, diasDeApertura: ?number}} contexto
 */
export const cargaDeLaCompeticion = (
  formData,
  { conEquipos, isEditMode, tipoElegido, cupoCargado, diasDeApertura },
) => {
  const numPlayers = cupoDeJugadores(formData.numberOfPlayers, cupoCargado);
  const countries = [];
  if (formData.adjacentCountry1) {
    countries.push(formData.adjacentCountry1);
  }
  if (formData.adjacentCountry2) {
    countries.push(formData.adjacentCountry2);
  }

  return {
    // Como la guarda la API, que mide el texto en bruto (`/code-review`)
    name: CompetitionName.normalize(formData.competitionName),
    start_date: formData.startDate,
    end_date: formData.endDate,
    main_country: formData.country?.code,
    countries: countries,
    play_mode: formData.playMode.toUpperCase(),
    visibility: formData.visibility,
    number_of_players: numPlayers,
    // Equipos y modo, solo en una Ryder: a un Stableford el servidor se los
    // rechaza con un 400 (FE #791). El reparto no se manda: lo deriva el
    // servidor del modo (RyderCupAm#351)
    ...(conEquipos
      ? {
          team_1_name: formData.teamOneName.trim(),
          team_2_name: formData.teamTwoName.trim(),
          setup_mode: formData.setupMode,
        }
      : {}),
    // El tipo, solo al crear: el de una competición que ya existe no se
    // cambia (FE #791, RyderCupAm#251)
    ...(!isEditMode && tipoElegido ? { tournament_type: tipoElegido } : {}),
    // Los ajustes de un Stableford o un Medal van en el alta; al editar,
    // por su propio PATCH y solo si cambian (FE #824)
    ...(!isEditMode && !conEquipos
      ? { stroke_play: ajustesParaCrear(formData.strokePlay) }
      : {}),
    // Si el organizador juega, solo al crear un Stableford o un Medal: en una
    // Ryder siempre queda inscrito (RyderCupAm#552)
    ...(!isEditMode && !conEquipos
      ? { organizer_plays: formData.organizerPlays }
      : {}),
    max_playing_handicap: formData.maxPlayingHandicap
      ? parseInt(formData.maxPlayingHandicap, 10)
      : null,
    // Solo cuando hay apertura programada: mandarlo en `null` seria decir
    // «quitale la programacion», que es lo mismo aqui pero ensucia el
    // contrato de la creacion
    ...(diasDeApertura != null
      ? { enrollment_opens_days_before: diasDeApertura }
      : {}),
  };
};

// Los campos que se enganchan al crear: su id y su nombre
export const camposParaElAlta = (golfCourses) =>
  golfCourses.map((gc) => ({
    id: gc.course.id,
    name: gc.course.name,
  }));

// Solo las fechas (15 nov 2026): se comprueban ellas, aquí mismo, y que las
// jornadas de cada jugador quepan; lo demás no se puede tocar. Sin petición
// que vaya a fallar
export const errorDeLasFechasNuevas = (formData, { conEquipos, t }) => {
  const { startDate, endDate } = formData;
  if (!startDate || !endDate) return t('create.errors.datesRequired');
  if (new Date(startDate) > new Date(endDate))
    return t('create.errors.endDateAfterStart');
  if (conEquipos || !formData.strokePlay) return null;
  const dias = diasDelTorneo(startDate, endDate);
  return errorDeAjustes(formData.strokePlay, dias) === 'matchdaysMoreThanDays'
    ? t('create.errors.matchdaysMoreThanDays', { count: dias })
    : null;
};

const FORMATO_DEL_DIA = { weekday: 'short', day: 'numeric', month: 'short' };

// Un día de sesión en el idioma de quien mira; con un idioma que el navegador
// no entienda, en el suyo
const diaEnElIdioma = (iso, idioma) => {
  const fecha = diaDeLaSesion(iso);
  if (!fecha) return iso;
  try {
    return fecha.toLocaleDateString(idioma, FORMATO_DEL_DIA);
  } catch {
    return fecha.toLocaleDateString(undefined, FORMATO_DEL_DIA);
  }
};

// Acortar las fechas con sesiones fuera: el servidor dice cuáles y aquí se
// escriben en el idioma de quien mira (FE #710). null si es otro error
export const sesionesQueQuedanFuera = (error, { t, idioma }) => {
  const fuera =
    error?.errorCode === 'DATES_LEAVE_SESSIONS_OUT' &&
    error.data?.sessions_outside;
  if (!Array.isArray(fuera) || fuera.length === 0) return null;
  const sesiones = fuera
    .map(
      (s) =>
        `${diaEnElIdioma(s.round_date, idioma)} · ${t(`schedule:sessions.${s.session_type}`)}`,
    )
    .join(', ');
  return t('edit.datesLeaveSessionsOut', { sesiones });
};

// Por qué no se guardó al editar: las sesiones que se quedan fuera, con sus
// días; con un código conocido, su texto; con otro, el genérico; sin código,
// lo que diga el servidor, como siempre (15 nov 2026)
const MOTIVOS_AL_EDITAR = { DRAFT_IN_PROGRESS: 'edit.datesDuringDraft' };
export const motivoDelFalloAlEditar = (error, { t, idioma }) => {
  const sesiones = sesionesQueQuedanFuera(error, { t, idioma });
  if (sesiones) return sesiones;
  if (error?.errorCode)
    return t(MOTIVOS_AL_EDITAR[error.errorCode] ?? 'edit.error');
  return mensajeDelError(error, t('edit.error'));
};

/**
 * El aviso de lo que la validación no dejó pasar. Los países sin campos llegan
 * ya escritos (`paises`): sus nombres los da el servicio de países.
 */
export const textoDelAvisoDeValidacion = (validationError, { t, paises }) =>
  validationError.key === 'golfCoursesRequired'
    ? t(`create.errors.${validationError.key}`, { countries: paises })
    : t(`create.errors.${validationError.key}`, {
        count: validationError.count,
        max: validationError.max,
      });
