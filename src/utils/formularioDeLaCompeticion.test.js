import { describe, it, expect } from 'vitest';
import {
  aPaises,
  vecinosDelSegundoNivel,
  formularioInicial,
  formularioDeLaEdicion,
  faltaAlgoPlegado,
  pideGenero,
  pasoDelAlta,
  alElegirPais,
  alVaciarPais,
  alCambiarAdyacente1,
  alQuitarAdyacente1,
  alQuitarAdyacente2,
  alCambiarAdyacente2,
  esElMismoPais,
  ERRORES_JUNTO_AL_NOMBRE,
  FORMULARIO_MINIMO,
  ERRORES_DE_LAS_OPCIONES,
} from './formularioDeLaCompeticion';
import { validateCompetitionForm } from './competitionFormValidation';
import { CUPO_POR_DEFECTO } from './cupoDeJugadores';
import { formularioDeAjustes } from './ajustesDeStrokePlay';

const pais = (code) => ({ code, name_es: code, name_en: code });
const EQUIPOS = { uno: 'Europa', dos: 'EE. UU.' };
const campo = (countryCode, id) => ({ countryCode, course: { id } });

describe('aPaises', () => {
  it('descarta los que no traen código o nombre y deja lo que usan los selectores', () => {
    expect(
      aPaises([
        { code: 'ES', name_es: 'España', name_en: 'Spain' },
        { code: 'PT', name_es: 'Portugal' },
        { code: 'XX' },
        { name_es: 'Sin código' },
        null,
      ]),
    ).toEqual([
      {
        id: 'ES',
        name: 'Spain',
        code: 'ES',
        name_en: 'Spain',
        name_es: 'España',
      },
      {
        id: 'PT',
        name: 'Portugal',
        code: 'PT',
        name_en: undefined,
        name_es: 'Portugal',
      },
    ]);
  });

  it('lo que no es una lista no es ningún país', () => {
    expect(aPaises(undefined)).toEqual([]);
    expect(aPaises({ code: 'ES' })).toEqual([]);
  });
});

describe('vecinosDelSegundoNivel', () => {
  it('los del primero y luego los nuevos del adyacente, sin el principal ni el adyacente', () => {
    expect(
      vecinosDelSegundoNivel(
        [pais('FR'), pais('PT')],
        [pais('ES'), pais('FR'), pais('IT'), pais('PT'), pais('BE')],
        'ES',
        'FR',
      ).map((c) => c.code),
    ).toEqual(['FR', 'PT', 'IT', 'BE']);
  });

  it('no toca la lista que recibe', () => {
    const primeros = [pais('FR')];
    vecinosDelSegundoNivel(primeros, [pais('IT')], 'ES', 'FR');
    expect(primeros).toHaveLength(1);
  });
});

describe('formularioInicial', () => {
  it('nace privado, con hándicap, el cupo por defecto y sin tipo ni modo', () => {
    expect(formularioInicial(EQUIPOS)).toEqual({
      competitionName: '',
      organizerPlays: true,
      teamOneName: 'Europa',
      teamTwoName: 'EE. UU.',
      startDate: '',
      endDate: '',
      country: null,
      adjacentCountry1: '',
      adjacentCountry2: '',
      showAdjacentCountry1: false,
      showAdjacentCountry2: false,
      golfCourses: [],
      playMode: 'HANDICAP',
      visibility: 'PRIVATE',
      numberOfPlayers: CUPO_POR_DEFECTO,
      setupMode: null,
      tournamentType: null,
      maxPlayingHandicap: undefined,
      strokePlay: formularioDeAjustes(null),
    });
  });
});

describe('formularioDeLaEdicion', () => {
  const ESPANA = pais('ES');
  const contexto = { equipos: EQUIPOS, idioma: 'es', allCountries: [ESPANA] };
  const datos = (competition, resto = {}) => ({
    competition,
    mainCountryCode: 'ES',
    adjacentCountry1: 'FR',
    adjacentCountry2: '',
    golfCoursesData: [campo('ES', 'gc-1')],
    ...resto,
  });

  it('lo guardado, con el país principal de la lista de todos', () => {
    const ajustes = {
      categoryLimits: [12.5],
      categoryCount: null,
      maxMatchdaysPerPlayer: 1,
      overallStanding: 'ACCUMULATED',
    };
    expect(
      formularioDeLaEdicion(
        datos({
          name: 'Medal',
          team1Name: 'Rojos',
          team2Name: 'Azules',
          startDate: '2030-10-10',
          endDate: '2030-10-12',
          playMode: 'SCRATCH',
          visibility: 'PUBLIC',
          maxPlayers: 40,
          tournamentType: 'MEDAL',
          hasTeams: false,
          maxPlayingHandicap: 0,
          strokePlay: ajustes,
        }),
        contexto,
      ),
    ).toEqual({
      competitionName: 'Medal',
      teamOneName: 'Rojos',
      teamTwoName: 'Azules',
      startDate: '2030-10-10',
      endDate: '2030-10-12',
      country: ESPANA,
      adjacentCountry1: 'FR',
      adjacentCountry2: '',
      showAdjacentCountry1: true,
      showAdjacentCountry2: false,
      golfCourses: [campo('ES', 'gc-1')],
      playMode: 'SCRATCH',
      visibility: 'PUBLIC',
      numberOfPlayers: 40,
      tournamentType: 'MEDAL',
      setupMode: null,
      maxPlayingHandicap: 0,
      strokePlay: formularioDeAjustes(ajustes, ','),
    });
  });

  it('lo que falta, con lo de siempre: Ryder, privada, con hándicap y los equipos por defecto', () => {
    const formulario = formularioDeLaEdicion(
      datos({ hasTeams: true }, { mainCountryCode: 'XX' }),
      { ...contexto, idioma: 'en' },
    );
    expect(formulario).toMatchObject({
      competitionName: '',
      teamOneName: 'Europa',
      teamTwoName: 'EE. UU.',
      startDate: '',
      endDate: '',
      country: null,
      playMode: 'HANDICAP',
      visibility: 'PRIVATE',
      numberOfPlayers: CUPO_POR_DEFECTO,
      tournamentType: 'RYDER_CUP',
      setupMode: 'RYDER_CUP',
      maxPlayingHandicap: undefined,
      strokePlay: formularioDeAjustes(null, '.'),
    });
    expect(formulario).not.toHaveProperty('organizerPlays');
  });

  it('los ajustes, con el decimal del idioma', () => {
    const ajustes = {
      categoryLimits: [12.5],
      categoryCount: null,
      maxMatchdaysPerPlayer: 1,
      overallStanding: 'ACCUMULATED',
    };
    expect(
      formularioDeLaEdicion(datos({ strokePlay: ajustes }), {
        ...contexto,
        idioma: 'en',
      }).strokePlay,
    ).toEqual(formularioDeAjustes(ajustes, '.'));
  });

  it('el modo guardado manda sobre el de equipos', () => {
    expect(
      formularioDeLaEdicion(
        datos({ hasTeams: true, setupMode: 'MANUAL' }),
        contexto,
      ).setupMode,
    ).toBe('MANUAL');
  });
});

describe('faltaAlgoPlegado', () => {
  it('solo cuenta lo que vive en «Más opciones»', () => {
    expect(
      faltaAlgoPlegado({
        ...formularioInicial(EQUIPOS),
        tournamentType: 'RYDER_CUP',
        teamOneName: '',
      }),
    ).toBe(true);
    // Lo de fuera vacío no es cosa del plegable
    expect(
      faltaAlgoPlegado({
        ...formularioInicial(EQUIPOS),
        tournamentType: 'RYDER_CUP',
      }),
    ).toBe(false);
  });

  it('las dos listas no se pisan', () => {
    for (const clave of ERRORES_JUNTO_AL_NOMBRE)
      expect(ERRORES_DE_LAS_OPCIONES.has(clave)).toBe(false);
  });

  // C2: lo que diga la validación del nombre, sea cual sea el problema, va
  // junto a su campo (con la regla de verdad, no una lista copiada)
  it.each([
    ['vacío', ''],
    ['corto', 'ab'],
    ['ilegible', '...'],
    ['largo', 'x'.repeat(101)],
    ['con enlace', 'Ryder en www.ejemplo.com'],
  ])('C2: el nombre %s se dice junto al campo', (_caso, nombre) => {
    const error = validateCompetitionForm({
      ...FORMULARIO_MINIMO,
      competitionName: nombre,
    });
    expect(error?.key).toMatch(/^name/);
    expect(ERRORES_JUNTO_AL_NOMBRE.has(error.key)).toBe(true);
  });

  it('C2: el 409 del servidor (ya usado) también', () => {
    expect(ERRORES_JUNTO_AL_NOMBRE.has('nameTaken')).toBe(true);
  });
});

describe('pideGenero', () => {
  it.each([
    [false, true, true, false, true],
    [false, true, false, true, true],
    [false, true, false, false, false],
    [false, false, true, true, false],
    [true, true, true, true, false],
  ])(
    'editando %s, falta %s, equipos %s, juega %s → %s',
    (isEditMode, falta, conEquipos, organizerPlays, pide) => {
      expect(
        Boolean(pideGenero({ isEditMode, falta, conEquipos, organizerPlays })),
      ).toBe(pide);
    },
  );
});

describe('pasoDelAlta (PA10)', () => {
  it.each([
    [false, null, true, null, 'tipo'],
    [false, null, false, 'RYDER_CUP', 'tipo'],
    [false, 'RYDER_CUP', true, null, 'modo'],
    [false, 'RYDER_CUP', true, 'MANUAL', 'formulario'],
    [false, 'STABLEFORD', false, null, 'formulario'],
    [true, null, true, null, 'formulario'],
    [true, null, false, null, 'formulario'],
  ])(
    'editando %s, tipo %s, equipos %s, modo %s → %s',
    (isEditMode, tipoElegido, conEquipos, setupMode, paso) => {
      expect(
        pasoDelAlta({ isEditMode, tipoElegido, conEquipos, setupMode }),
      ).toBe(paso);
    },
  );
});

describe('la cascada de los países', () => {
  const conTres = {
    ...formularioInicial(EQUIPOS),
    country: pais('ES'),
    adjacentCountry1: 'FR',
    adjacentCountry2: 'PT',
    showAdjacentCountry1: true,
    showAdjacentCountry2: true,
    golfCourses: [
      campo('ES', 1),
      campo('FR', 2),
      campo('PT', 3),
      campo('ES', 4),
    ],
  };
  const sinPaises = {
    adjacentCountry1: '',
    adjacentCountry2: '',
    showAdjacentCountry1: false,
    showAdjacentCountry2: false,
  };

  it('PA1: otro principal deja solo sus campos y quita los adyacentes', () => {
    expect(alElegirPais(conTres, pais('FR'))).toEqual({
      ...conTres,
      ...sinPaises,
      country: pais('FR'),
      golfCourses: [campo('FR', 2)],
    });
  });

  it('PA4: vaciar el principal quita los adyacentes y deja los campos', () => {
    expect(alVaciarPais(conTres)).toEqual({
      ...conTres,
      ...sinPaises,
      country: null,
    });
  });

  it('A1/A2: otro adyacente quita el tercer país y los campos de los dos', () => {
    expect(alCambiarAdyacente1(conTres, 'IT')).toEqual({
      ...conTres,
      adjacentCountry1: 'IT',
      adjacentCountry2: '',
      showAdjacentCountry2: false,
      golfCourses: [campo('ES', 1), campo('ES', 4)],
    });
  });

  it('A8: el tercer país pasa a adyacente: sus campos se quedan, los del adyacente anterior no', () => {
    expect(alCambiarAdyacente1(conTres, 'PT')).toEqual({
      ...conTres,
      adjacentCountry1: 'PT',
      adjacentCountry2: '',
      showAdjacentCountry2: false,
      golfCourses: [campo('ES', 1), campo('PT', 3), campo('ES', 4)],
    });
  });

  it('A6: volver a elegir el mismo adyacente no quita nada', () => {
    expect(alCambiarAdyacente1(conTres, 'FR')).toBe(conTres);
  });

  it('A3: otro tercer país quita los campos del anterior y nada más', () => {
    expect(alCambiarAdyacente2(conTres, 'IT')).toEqual({
      ...conTres,
      adjacentCountry2: 'IT',
      golfCourses: [campo('ES', 1), campo('FR', 2), campo('ES', 4)],
    });
  });

  it('A4: el tercer país en «ninguno» quita sus campos', () => {
    expect(alCambiarAdyacente2(conTres, '')).toEqual({
      ...conTres,
      adjacentCountry2: '',
      golfCourses: [campo('ES', 1), campo('FR', 2), campo('ES', 4)],
    });
  });

  it('A6: volver a elegir el mismo tercer país no quita nada', () => {
    expect(alCambiarAdyacente2(conTres, 'PT')).toBe(conTres);
  });

  it('PA2: quitar el adyacente quita los dos y sus campos', () => {
    expect(alQuitarAdyacente1(conTres)).toEqual({
      ...conTres,
      ...sinPaises,
      golfCourses: [campo('ES', 1), campo('ES', 4)],
    });
  });

  it('PA3: quitar el tercero solo quita los suyos', () => {
    expect(alQuitarAdyacente2(conTres)).toEqual({
      ...conTres,
      adjacentCountry2: '',
      showAdjacentCountry2: false,
      golfCourses: [campo('ES', 1), campo('FR', 2), campo('ES', 4)],
    });
  });

  it('esElMismoPais: el elegido es el que ya estaba en ese selector', () => {
    expect(esElMismoPais(conTres, 'adjacentCountry1', 'FR')).toBe(true);
    expect(esElMismoPais(conTres, 'adjacentCountry1', 'PT')).toBe(false);
    expect(esElMismoPais(conTres, 'adjacentCountry2', 'PT')).toBe(true);
    expect(esElMismoPais(conTres, 'adjacentCountry2', '')).toBe(false);
  });

  it('no tocan el formulario que reciben', () => {
    const copia = globalThis.structuredClone(conTres);
    alElegirPais(conTres, pais('FR'));
    alVaciarPais(conTres);
    alCambiarAdyacente1(conTres, 'IT');
    alCambiarAdyacente2(conTres, 'IT');
    alQuitarAdyacente1(conTres);
    alQuitarAdyacente2(conTres);
    expect(conTres).toEqual(copia);
  });
});
