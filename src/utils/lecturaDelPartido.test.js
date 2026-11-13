import { describe, expect, it } from 'vitest';

import {
  cierreDelPartido,
  esFalloDeUnaAccion,
  estadoDeEntrega,
  ganadorDelResumen,
  motivoDe,
  resultadoParaElAviso,
  textoDelFallo,
  textoDelMarcador,
} from './lecturaDelPartido';

// La `t` de prueba devuelve la clave, y sus valores si los hay
const t = (clave, valores) => (valores ? `${clave} ${JSON.stringify(valores)}` : clave);

describe('lecturaDelPartido', () => {
  describe('motivoDe', () => {
    it('dado un 403 o un 404, cuando se cuenta, entonces dice el suyo', () => {
      expect(motivoDe(t, { status: 403 })).toBe('errors.forbidden');
      expect(motivoDe(t, { response: { status: 404 } })).toBe('errors.notFound');
    });

    it('dado otro fallo, cuando se cuenta, entonces dice que no se pudo cargar', () => {
      expect(motivoDe(t, { status: 500 })).toBe('offline.noSePudoCargar');
      expect(motivoDe(t, null)).toBe('offline.noSePudoCargar');
    });
  });

  describe('textoDelFallo', () => {
    it('dado un fallo de carga, cuando se cuenta, entonces es el motivo de no cargar', () => {
      expect(esFalloDeUnaAccion('carga')).toBe(false);
      expect(textoDelFallo(t, { status: 404 }, 'carga')).toBe('errors.notFound');
      expect(textoDelFallo(t, { status: 404 }, null)).toBe('errors.notFound');
    });

    it('dado un fallo de cada acción, cuando se cuenta, entonces dice qué acción falló', () => {
      expect(esFalloDeUnaAccion('golpe')).toBe(true);
      expect(textoDelFallo(t, { status: 500 }, 'golpe')).toBe('errors.failedToSubmitScore');
      expect(textoDelFallo(t, {}, 'tarjeta')).toBe('errors.failedToSubmitScorecard');
      expect(textoDelFallo(t, {}, 'concesion')).toBe('errors.failedToConcede');
      expect(textoDelFallo(t, {}, 'retirada')).toBe('withdraw.failed');
    });

    it('dado un fallo de una acción sin hoyo, cuando se cuenta, entonces sin «en el hoyo»; y con el hoyo 0 sí lo dice', () => {
      expect(textoDelFallo(t, { holeNumber: null }, 'golpe')).toBe('errors.failedToSubmitScore');
      expect(textoDelFallo(t, { holeNumber: 0 }, 'golpe')).toBe('errors.failedToSubmitScore errors.enElHoyo {"hole":0}');
    });

    it('dado un fallo con su clave y su hoyo, cuando se cuenta, entonces dice lo suyo y en qué hoyo', () => {
      expect(textoDelFallo(t, { i18nKey: 'errors.lleno', holeNumber: 7 }, 'golpe'))
        .toBe('errors.lleno errors.enElHoyo {"hole":7}');
    });
  });

  describe('cierreDelPartido', () => {
    it('dado un partido decidido por A, cuando se lee, entonces gana el equipo A con su resultado', () => {
      const r = cierreDelPartido({ teamAName: 'Rojos', teamBName: 'Azules', decidedResult: { winner: 'A', score: '3&2' } });
      expect(r).toEqual({ resultadoDecidido: { team: 'Rojos', score: '3&2' }, cerradoSinJugar: false, claveDelCierre: 'conceded', cierre: null });
    });

    it('dado un walkover con ganador B, cuando se lee, entonces está cerrado sin jugar y su clave es walkover', () => {
      const r = cierreDelPartido({ teamBName: 'Azules', matchStatus: 'WALKOVER', decidedResult: { winner: 'B', score: 'W/O' } });
      expect(r.cerradoSinJugar).toBe(true);
      expect(r.claveDelCierre).toBe('walkover');
      expect(r.cierre).toEqual({ team: 'Azules' });
    });

    it('dado un concedido sin ganador, cuando se lee, entonces está cerrado y sin cierre con nombre', () => {
      const r = cierreDelPartido({ matchStatus: 'CONCEDED', decidedResult: { winner: 'HALVED' } });
      expect(r).toEqual({ resultadoDecidido: null, cerradoSinJugar: true, claveDelCierre: 'conceded', cierre: null });
    });

    it('dado que no hay vista, cuando se lee, entonces no hay nada decidido', () => {
      expect(cierreDelPartido(null).resultadoDecidido).toBeNull();
    });
  });

  describe('textoDelMarcador', () => {
    const vista = { teamAName: 'Rojos', teamBName: 'Azules' };

    it('dado un cierre con nombre, cuando se pinta, entonces dice quién ganó y cómo', () => {
      const lectura = { cierre: { team: 'Rojos' }, claveDelCierre: 'walkover', cerradoSinJugar: true, resultadoDecidido: { team: 'Rojos' } };
      expect(textoDelMarcador(t, vista, lectura)).toBe('leaderboard.walkover {"team":"Rojos"}');
    });

    it('dado un cerrado sin ganador, cuando se pinta, entonces dice cerrado', () => {
      expect(textoDelMarcador(t, vista, { cierre: null, cerradoSinJugar: true, resultadoDecidido: null })).toBe('closed.title');
    });

    it('dado un decidido, cuando se pinta, entonces dice quién gana', () => {
      expect(textoDelMarcador(t, vista, { cierre: null, cerradoSinJugar: false, resultadoDecidido: { team: 'Azules', score: '2&1' } }))
        .toBe('leaderboard.wins {"team":"Azules","score":"2&1"}');
    });

    it('dado que no hay marcador, cuando se pinta, entonces no hay texto', () => {
      expect(textoDelMarcador(t, vista, { cierre: null, cerradoSinJugar: false, resultadoDecidido: null })).toBeNull();
    });

    it('dado un empate, cuando se pinta, entonces dice all square', () => {
      expect(textoDelMarcador(t, { ...vista, matchStanding: { status: 'AS' } }, {})).toBe('input.allSquare');
    });

    it('dado que alguien va arriba, cuando se pinta, entonces dice cuánto y quién', () => {
      expect(textoDelMarcador(t, { ...vista, matchStanding: { status: '2UP', leadingTeam: 'A' } }, {})).toBe('2UP Rojos');
      expect(textoDelMarcador(t, { ...vista, matchStanding: { status: '1UP', leadingTeam: 'B' } }, {})).toBe('1UP Azules');
    });
  });

  describe('estadoDeEntrega', () => {
    const base = { isMatchPlayer: true, isWithdrawn: false, hasSubmitted: false, cerradoSinJugar: false, canSubmitScorecard: false, partidoAcabado: false };

    it('dado quien no juega o se retiró, cuando se mira, entonces no hay barra', () => {
      expect(estadoDeEntrega({ ...base, isMatchPlayer: false, hasSubmitted: true })).toBeNull();
      expect(estadoDeEntrega({ ...base, isWithdrawn: true, hasSubmitted: true })).toBeNull();
    });

    it('dada una tarjeta entregada, cuando se mira, entonces está entregada aunque se cerrara sin jugar', () => {
      expect(estadoDeEntrega({ ...base, hasSubmitted: true, cerradoSinJugar: true })).toBe('entregada');
    });

    it('dado un cerrado sin jugar, cuando se mira, entonces no se pide entregar', () => {
      expect(estadoDeEntrega({ ...base, cerradoSinJugar: true, canSubmitScorecard: true })).toBeNull();
    });

    it('dado que se puede entregar, cuando se mira, entonces toca entregar', () => {
      expect(estadoDeEntrega({ ...base, canSubmitScorecard: true })).toBe('entregar');
    });

    it('dado un partido acabado sin validar, cuando se mira, entonces falta validar', () => {
      expect(estadoDeEntrega({ ...base, partidoAcabado: true })).toBe('faltaValidar');
    });

    it('dado un partido en juego, cuando se mira, entonces no hay barra', () => {
      expect(estadoDeEntrega(base)).toBeNull();
    });
  });

  describe('ganadorDelResumen', () => {
    const vista = {
      teamAName: 'Rojos',
      teamBName: 'Azules',
      players: [{ team: 'A', userName: 'Ana' }, { team: 'A', userName: 'Luis' }, { team: 'B', userName: 'Eva' }],
    };

    it('dado que gana A, cuando se resume, entonces el equipo con sus jugadores', () => {
      expect(ganadorDelResumen({ result: { winner: 'A' } }, vista)).toBe('Rojos (Ana y Luis)');
      expect(ganadorDelResumen({ result: { winner: 'B' } }, vista)).toBe('Azules (Eva)');
    });

    it('dado un equipo sin jugadores en la vista, cuando se resume, entonces solo el equipo', () => {
      expect(ganadorDelResumen({ result: { winner: 'A' } }, { teamAName: 'Rojos', players: [] })).toBe('Rojos');
    });

    it('dado un empate o sin resultado, cuando se resume, entonces no hay ganador', () => {
      expect(ganadorDelResumen({ result: { winner: 'HALVED' } }, vista)).toBeNull();
      expect(ganadorDelResumen({}, vista)).toBeNull();
    });
  });

  describe('resultadoParaElAviso', () => {
    it('dado un ganador A o B, cuando se avisa, entonces con el nombre del equipo o su letra', () => {
      expect(resultadoParaElAviso({ teamAName: 'Rojos', decidedResult: { winner: 'A', score: '3&2' } })).toEqual({ winner: 'Rojos', score: '3&2' });
      expect(resultadoParaElAviso({ decidedResult: { winner: 'B' } })).toEqual({ winner: 'B' });
      expect(resultadoParaElAviso({ decidedResult: { winner: 'A' } })).toEqual({ winner: 'A' });
      expect(resultadoParaElAviso({ teamBName: 'Azules', decidedResult: { winner: 'B' } })).toEqual({ winner: 'Azules' });
    });

    it('dado otro resultado, cuando se avisa, entonces tal cual', () => {
      expect(resultadoParaElAviso({ decidedResult: { winner: 'HALVED' } })).toEqual({ winner: 'HALVED' });
    });

    it('dado que no hay resultado, cuando se avisa, entonces nada', () => {
      expect(resultadoParaElAviso({})).toBeNull();
      expect(resultadoParaElAviso(null)).toBeNull();
    });
  });
});
