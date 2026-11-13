import { describe, expect, it, vi } from 'vitest';

import {
  clasificaLaCola,
  conElEstadoDe,
  conGolpe,
  conLoGuardadoEncima,
  esDesacuerdo,
  sobraTrasEnviar,
} from './colaDePartidaRapida';

const entrada = (holeNumber, participantId, score, extra = {}) => ({
  holeNumber, participantId, scoreData: { score, ...extra },
});
const dosAnotadores = { scorerIds: ['p1', 'p2'] };

describe('colaDePartidaRapida', () => {
  describe('esDesacuerdo', () => {
    it('dado que el servidor no tiene el hoyo, entonces no hay desacuerdo', () => {
      expect(esDesacuerdo(undefined, entrada(1, 'p1', 4), dosAnotadores, 'p1')).toBe(false);
    });

    it('dado el mismo número, entonces no hay desacuerdo', () => {
      expect(esDesacuerdo({ score: 4 }, entrada(1, 'p1', 4), dosAnotadores, 'p1')).toBe(false);
    });

    it('dado un solo anotador, entonces es una corrección y no un desacuerdo', () => {
      expect(esDesacuerdo({ score: 5 }, entrada(1, 'p1', 4), { scorerIds: ['p1'] }, 'p1')).toBe(false);
      expect(esDesacuerdo({ score: 5 }, entrada(1, 'p1', 4), null, 'p1')).toBe(false);
    });

    it('dado que lo anoté yo, entonces es una corrección', () => {
      expect(esDesacuerdo({ score: 5, recordedByParticipantId: 'p1' }, entrada(1, 'p1', 4), dosAnotadores, 'p1')).toBe(false);
    });

    it('dado que lo anotó otro, entonces es un desacuerdo', () => {
      expect(esDesacuerdo({ score: 5, recordedByParticipantId: 'p2' }, entrada(1, 'p1', 4), dosAnotadores, 'p1')).toBe(true);
    });

    it('dado que no sé quién soy, entonces se pregunta aunque nadie conste como anotador', () => {
      expect(esDesacuerdo({ score: 5 }, entrada(1, 'p1', 4), dosAnotadores, undefined)).toBe(true);
    });
  });

  describe('conGolpe', () => {
    it('dado un golpe de un hoyo ya anotado, cuando llega, entonces lo sustituye en su sitio', () => {
      const partida = { id: 'q', holeScores: [{ holeNumber: 1, participantId: 'p1', score: 4 }, { holeNumber: 2, participantId: 'p1', score: 5 }] };
      const golpe = { holeNumber: 1, participantId: 'p1', score: 3 };
      expect(conGolpe(partida, golpe)).toEqual({ id: 'q', holeScores: [golpe, partida.holeScores[1]] });
    });

    it('dado un golpe nuevo, cuando llega, entonces se añade al final', () => {
      const golpe = { holeNumber: 1, participantId: 'p2', score: 3 };
      expect(conGolpe({ holeScores: [{ holeNumber: 1, participantId: 'p1', score: 4 }] }, golpe).holeScores).toHaveLength(2);
      expect(conGolpe({}, golpe).holeScores).toEqual([golpe]);
    });
  });

  describe('conLoGuardadoEncima', () => {
    const delServidor = [{ holeNumber: 1, participantId: 'p1', score: 5, recordedByParticipantId: 'p2' }];

    it('dado que no hay nada guardado, entonces es lo del servidor, el mismo objeto', () => {
      expect(conLoGuardadoEncima(delServidor, [], dosAnotadores, 'p1')).toBe(delServidor);
    });

    it('dado un hoyo que el servidor no tiene, entonces se añade lo guardado', () => {
      const vista = conLoGuardadoEncima(delServidor, [entrada(2, 'p1', 3)], dosAnotadores, 'p1');
      expect(vista).toEqual([...delServidor, { holeNumber: 2, participantId: 'p1', score: 3, recordedByParticipantId: null }]);
    });

    it('dado un desacuerdo sin decidir, entonces manda el del servidor', () => {
      expect(conLoGuardadoEncima(delServidor, [entrada(1, 'p1', 4)], dosAnotadores, 'p1')).toEqual(delServidor);
    });

    it('dado un desacuerdo ya decidido, entonces se pinta lo guardado', () => {
      const vista = conLoGuardadoEncima(delServidor, [entrada(1, 'p1', 4, { decidido: true })], dosAnotadores, 'p1');
      expect(vista[0].score).toBe(4);
    });

    it('dada una corrección propia, entonces se pinta lo guardado', () => {
      const vista = conLoGuardadoEncima(delServidor, [entrada(1, 'p1', 4)], { scorerIds: ['p1'] }, 'p1');
      expect(vista).toEqual([{ holeNumber: 1, participantId: 'p1', score: 4, recordedByParticipantId: null }]);
      expect(delServidor[0].score).toBe(5);
    });
  });

  describe('clasificaLaCola', () => {
    const anotados = [
      { holeNumber: 1, participantId: 'p1', score: 4 },
      { holeNumber: 2, participantId: 'p1', score: 5, recordedByParticipantId: 'p2' },
    ];

    it('dada una cola mixta, cuando se clasifica, entonces borra lo ya enviado, aparta los desacuerdos y envía el resto en orden', () => {
      const borra = vi.fn(() => true);
      const ya = entrada(1, 'p1', 4);
      const discute = entrada(2, 'p1', 6);
      const nueva = entrada(3, 'p1', 3);
      const decidida = entrada(2, 'p1', 7, { decidido: true });
      const r = clasificaLaCola({
        entradas: [ya, discute, nueva, decidida], anotadosEnElServidor: anotados, partida: dosAnotadores, miParticipanteId: 'p1', borra,
      });
      expect(borra).toHaveBeenCalledTimes(1);
      expect(borra).toHaveBeenCalledWith(ya);
      expect(r).toEqual({
        enConflicto: [{ holeNumber: 2, participantId: 'p1', mio: 6, enElServidor: 5, anotadoPor: 'p2' }],
        porEnviar: [nueva, decidida],
        elDiscoNoBorra: false,
      });
    });

    it('dado un disco que no borra, cuando se clasifica, entonces lo dice y sigue clasificando', () => {
      const r = clasificaLaCola({
        entradas: [entrada(1, 'p1', 4), entrada(2, 'p1', 6)],
        anotadosEnElServidor: anotados,
        partida: dosAnotadores,
        miParticipanteId: 'p1',
        borra: () => false,
      });
      expect(r.elDiscoNoBorra).toBe(true);
      expect(r.enConflicto).toHaveLength(1);
    });
  });

  describe('sobraTrasEnviar', () => {
    it('dado que no se dice qué se envió, entonces sobra todo', () => {
      expect(sobraTrasEnviar({ timestamp: 999, scoreData: { score: 1 } }, null)).toBe(true);
    });

    it('dada una anotación anterior o sin hora, entonces sobra', () => {
      expect(sobraTrasEnviar({ timestamp: 99, scoreData: { score: 1 } }, { cuando: 100, score: 4 })).toBe(true);
      expect(sobraTrasEnviar({ scoreData: { score: 1 } }, { cuando: 100, score: 4 })).toBe(true);
    });

    it('dado el mismo milisegundo, entonces sobra solo si es el mismo número', () => {
      expect(sobraTrasEnviar({ timestamp: 100, scoreData: { score: 4 } }, { cuando: 100, score: 4 })).toBe(true);
      expect(sobraTrasEnviar({ timestamp: 100, scoreData: { score: 5 } }, { cuando: 100, score: 4 })).toBe(false);
      expect(sobraTrasEnviar({ timestamp: 100 }, { cuando: 100, score: 4 })).toBe(false);
    });

    it('dada una corrección posterior, entonces no sobra', () => {
      expect(sobraTrasEnviar({ timestamp: 101, scoreData: { score: 4 } }, { cuando: 100, score: 4 })).toBe(false);
    });
  });

  describe('conElEstadoDe', () => {
    const actualizada = {
      status: 'COMPLETED', isPending: false, isInProgress: false, isCompleted: true, isCancelled: false, holeScores: [],
    };

    it('dada una partida previa, cuando se cierra, entonces toma solo el estado y conserva sus golpes', () => {
      const previa = { id: 'q', status: 'IN_PROGRESS', isInProgress: true, holeScores: [{ holeNumber: 1 }] };
      expect(conElEstadoDe(previa, actualizada)).toEqual({
        id: 'q', status: 'COMPLETED', isPending: false, isInProgress: false, isCompleted: true, isCancelled: false,
        holeScores: [{ holeNumber: 1 }],
      });
    });

    it('dado que no había partida, cuando se cierra, entonces es lo que devolvió el cierre', () => {
      expect(conElEstadoDe(null, actualizada)).toBe(actualizada);
    });
  });
});
