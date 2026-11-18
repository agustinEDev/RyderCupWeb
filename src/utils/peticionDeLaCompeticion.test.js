import { describe, it, expect } from 'vitest';
import {
  cargaDeLaCompeticion,
  camposParaElAlta,
  errorDeLasFechasNuevas,
  sesionesQueQuedanFuera,
  motivoDelFalloAlEditar,
  textoDelAvisoDeValidacion,
} from './peticionDeLaCompeticion';
import { formularioInicial } from './formularioDeLaCompeticion';
import { ajustesParaCrear, formularioDeAjustes } from './ajustesDeStrokePlay';
import { CUPO_POR_DEFECTO } from './cupoDeJugadores';

const t = (clave, valores) =>
  valores ? `${clave} ${JSON.stringify(valores)}` : clave;
const enEspanol = { t, idioma: 'es' };

const RYDER = {
  ...formularioInicial({ uno: ' Rojos ', dos: 'Azules' }),
  competitionName: '  Ryder   de amigos ',
  startDate: '2030-06-01',
  endDate: '2030-06-03',
  country: { code: 'ES' },
  adjacentCountry1: 'FR',
  adjacentCountry2: 'PT',
  playMode: 'scratch',
  tournamentType: 'RYDER_CUP',
  setupMode: 'RYDER_CUP',
  maxPlayingHandicap: '18',
};
const MEDAL = {
  ...RYDER,
  adjacentCountry1: '',
  adjacentCountry2: '',
  tournamentType: 'MEDAL',
  setupMode: null,
  organizerPlays: false,
  maxPlayingHandicap: undefined,
};
const alCrear = {
  isEditMode: false,
  cupoCargado: CUPO_POR_DEFECTO,
  diasDeApertura: null,
};

describe('cargaDeLaCompeticion', () => {
  it('crear una Ryder: equipos, modo y tipo; ni ajustes ni si juega', () => {
    expect(
      cargaDeLaCompeticion(RYDER, {
        ...alCrear,
        conEquipos: true,
        tipoElegido: 'RYDER_CUP',
      }),
    ).toEqual({
      name: 'Ryder de amigos',
      start_date: '2030-06-01',
      end_date: '2030-06-03',
      main_country: 'ES',
      countries: ['FR', 'PT'],
      play_mode: 'SCRATCH',
      visibility: 'PRIVATE',
      number_of_players: CUPO_POR_DEFECTO,
      team_1_name: 'Rojos',
      team_2_name: 'Azules',
      setup_mode: 'RYDER_CUP',
      tournament_type: 'RYDER_CUP',
      max_playing_handicap: 18,
    });
  });

  it('crear un Medal: ajustes y si juega; sin equipos ni modo', () => {
    expect(
      cargaDeLaCompeticion(MEDAL, {
        ...alCrear,
        conEquipos: false,
        tipoElegido: 'MEDAL',
        diasDeApertura: 7,
      }),
    ).toEqual({
      name: 'Ryder de amigos',
      start_date: '2030-06-01',
      end_date: '2030-06-03',
      main_country: 'ES',
      countries: [],
      play_mode: 'SCRATCH',
      visibility: 'PRIVATE',
      number_of_players: CUPO_POR_DEFECTO,
      tournament_type: 'MEDAL',
      stroke_play: ajustesParaCrear(formularioDeAjustes(null)),
      organizer_plays: false,
      max_playing_handicap: null,
      enrollment_opens_days_before: 7,
    });
  });

  it('editar: ni tipo, ni ajustes, ni si juega, y el cupo vacío es el cargado', () => {
    const carga = cargaDeLaCompeticion(
      { ...MEDAL, numberOfPlayers: '', maxPlayingHandicap: '18.7' },
      {
        isEditMode: true,
        conEquipos: false,
        tipoElegido: null,
        cupoCargado: 30,
        diasDeApertura: null,
      },
    );
    expect(carga).not.toHaveProperty('tournament_type');
    expect(carga).not.toHaveProperty('stroke_play');
    expect(carga).not.toHaveProperty('organizer_plays');
    expect(carga).not.toHaveProperty('enrollment_opens_days_before');
    expect(carga.number_of_players).toBe(30);
    expect(carga.max_playing_handicap).toBe(18);
  });

  it('abrir el mismo día de la competición también es una apertura programada', () => {
    expect(
      cargaDeLaCompeticion(MEDAL, {
        ...alCrear,
        conEquipos: false,
        tipoElegido: 'MEDAL',
        diasDeApertura: 0,
      }).enrollment_opens_days_before,
    ).toBe(0);
  });

  it('sin país principal, sin él', () => {
    expect(
      cargaDeLaCompeticion(
        { ...MEDAL, country: null },
        { ...alCrear, conEquipos: false, tipoElegido: null },
      ).main_country,
    ).toBeUndefined();
  });
});

describe('camposParaElAlta', () => {
  it('la clave de la fila de un campo sin id no se manda', () => {
    const [enviado] = camposParaElAlta([
      { countryCode: 'ES', clave: 'sin-id-1', course: { name: 'Sin id' } },
    ]);
    expect(enviado).toEqual({ id: undefined, name: 'Sin id' });
    expect(enviado).not.toHaveProperty('clave');
  });

  it('cada campo, con su id y su nombre', () => {
    expect(
      camposParaElAlta([
        { countryCode: 'ES', course: { id: 'a', name: 'A', extra: 1 } },
        { countryCode: 'FR', course: { id: 'b', name: 'B' } },
      ]),
    ).toEqual([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]);
  });
});

describe('errorDeLasFechasNuevas', () => {
  const fechas = (startDate, endDate, resto = {}) => ({
    ...MEDAL,
    startDate,
    endDate,
    ...resto,
  });

  it.each([
    ['', '2030-06-03', 'create.errors.datesRequired'],
    ['2030-06-01', '', 'create.errors.datesRequired'],
    ['2030-06-04', '2030-06-03', 'create.errors.endDateAfterStart'],
    ['2030-06-01', '2030-06-03', null],
    ['2030-06-03', '2030-06-03', null],
  ])('%s → %s: %s', (inicio, fin, error) => {
    expect(
      errorDeLasFechasNuevas(fechas(inicio, fin), { conEquipos: false, t }),
    ).toBe(error);
  });

  it('más jornadas por jugador que días: el aviso con los días', () => {
    const strokePlay = { ...formularioDeAjustes(null), jornadas: '3' };
    expect(
      errorDeLasFechasNuevas(
        fechas('2030-06-01', '2030-06-02', { strokePlay }),
        { conEquipos: false, t },
      ),
    ).toBe('create.errors.matchdaysMoreThanDays {"count":2}');
    // En una Ryder no hay jornadas que mirar
    expect(
      errorDeLasFechasNuevas(
        fechas('2030-06-01', '2030-06-02', { strokePlay }),
        { conEquipos: true, t },
      ),
    ).toBeNull();
  });
});

describe('sesionesQueQuedanFuera y motivoDelFalloAlEditar', () => {
  const fuera = {
    errorCode: 'DATES_LEAVE_SESSIONS_OUT',
    data: {
      sessions_outside: [
        { round_date: '2030-06-05', session_type: 'MORNING' },
        { round_date: 'no es una fecha', session_type: 'AFTERNOON' },
      ],
    },
  };

  it('las sesiones, con su día en el idioma y su tipo', () => {
    const dia = new Date(2030, 5, 5).toLocaleDateString('es', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    expect(sesionesQueQuedanFuera(fuera, enEspanol)).toBe(
      `edit.datesLeaveSessionsOut ${JSON.stringify({
        sesiones: `${dia} · schedule:sessions.MORNING, no es una fecha · schedule:sessions.AFTERNOON`,
      })}`,
    );
  });

  it('con un idioma que el navegador no entiende, en el suyo', () => {
    expect(sesionesQueQuedanFuera(fuera, { t, idioma: 'no_vale!' })).toContain(
      new Date(2030, 5, 5).toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }),
    );
  });

  it.each([
    [{ errorCode: 'OTHER' }],
    [{ errorCode: 'DATES_LEAVE_SESSIONS_OUT', data: {} }],
    [{ errorCode: 'DATES_LEAVE_SESSIONS_OUT', data: { sessions_outside: [] } }],
    [null],
  ])('otro error no son sesiones: %j', (error) => {
    expect(sesionesQueQuedanFuera(error, enEspanol)).toBeNull();
  });

  it('el motivo: las sesiones, el código conocido, el genérico o el del servidor', () => {
    expect(motivoDelFalloAlEditar(fuera, enEspanol)).toMatch(
      /^edit\.datesLeaveSessionsOut/,
    );
    expect(
      motivoDelFalloAlEditar({ errorCode: 'DRAFT_IN_PROGRESS' }, enEspanol),
    ).toBe('edit.datesDuringDraft');
    expect(motivoDelFalloAlEditar({ errorCode: 'OTRO' }, enEspanol)).toBe(
      'edit.error',
    );
    const delServidor = Object.assign(new Error('Lo dice el servidor'), {
      status: 422,
    });
    expect(motivoDelFalloAlEditar(delServidor, enEspanol)).toBe(
      'Lo dice el servidor',
    );
  });
});

describe('textoDelAvisoDeValidacion', () => {
  it('los países sin campos, ya escritos', () => {
    expect(
      textoDelAvisoDeValidacion(
        { key: 'golfCoursesRequired', missingCourseCountryCodes: ['FR'] },
        { t, paises: 'Francia, Andorra' },
      ),
    ).toBe(
      'create.errors.golfCoursesRequired {"countries":"Francia, Andorra"}',
    );
  });

  it('los demás, con su cuenta y su máximo', () => {
    expect(
      textoDelAvisoDeValidacion(
        { key: 'capBelowEnrolled', count: 5, max: 200 },
        { t },
      ),
    ).toBe('create.errors.capBelowEnrolled {"count":5,"max":200}');
  });
});
