import { describe, expect, it } from 'vitest';

import {
  conClaveDeRetirada,
  deCarga,
  deLaConcesion,
  deLaRetirada,
  deLaTarjeta,
  delGolpe,
  trasFallarLaCarga,
} from './fallosDeLaAnotacion';

describe('fallosDeLaAnotacion', () => {
  describe('el fallo y su origen', () => {
    it('dado un error de cada acción, cuando se apunta, entonces lleva su origen y su partido', () => {
      const err = new Error('x');
      expect(deCarga(err, 'm1')).toEqual({
        err,
        origen: 'carga',
        matchId: 'm1',
      });
      expect(delGolpe(err, 'm1')).toEqual({
        err,
        origen: 'golpe',
        matchId: 'm1',
      });
      expect(deLaTarjeta(err, 'm1')).toEqual({
        err,
        origen: 'tarjeta',
        matchId: 'm1',
      });
      expect(deLaConcesion(err, 'm1')).toEqual({
        err,
        origen: 'concesion',
        matchId: 'm1',
      });
      expect(deLaRetirada(err, 'm1')).toEqual({
        err,
        origen: 'retirada',
        matchId: 'm1',
      });
    });

    it('dado que no hay error, cuando se apunta, entonces no hay fallo', () => {
      expect(deCarga(null, 'm1')).toBeNull();
      expect(delGolpe(undefined, 'm1')).toBeNull();
    });
  });

  describe('conClaveDeRetirada', () => {
    it('dado un 409 de retirada con motivo, cuando se explica, entonces lleva la clave de su motivo', () => {
      const err = {
        errorCode: 'WITHDRAWAL_NOT_ALLOWED',
        data: { reason: 'MATCH_CLOSED' },
      };
      const conClave = conClaveDeRetirada(err);
      expect(conClave).toBe(err);
      expect(conClave.i18nKey).toBe('withdraw.errors.MATCH_CLOSED');
    });

    it('dado un 409 de retirada sin motivo, cuando se explica, entonces se queda como estaba', () => {
      const err = { errorCode: 'WITHDRAWAL_NOT_ALLOWED', data: {} };
      expect(conClaveDeRetirada(err)).toBe(err);
      expect(err.i18nKey).toBeUndefined();
    });

    it('dado otro error con motivo, cuando se explica, entonces no se le pone clave', () => {
      const err = { errorCode: 'OTRO', data: { reason: 'MATCH_CLOSED' } };
      expect(conClaveDeRetirada(err).i18nKey).toBeUndefined();
    });

    it('dado un error vacío, cuando se explica, entonces se devuelve tal cual', () => {
      expect(conClaveDeRetirada(undefined)).toBeUndefined();
    });
  });

  describe('trasFallarLaCarga', () => {
    const err = new Error('caído');

    it('dado un fallo de una acción del mismo partido, cuando falla la carga, entonces se queda el de la acción', () => {
      const antes = delGolpe(new Error('golpe'), 'm1');
      expect(trasFallarLaCarga(err, false, 'm1')(antes)).toBe(antes);
    });

    it('dado un fallo de una acción, cuando la carga lo desmiente, entonces manda el de la carga', () => {
      const antes = delGolpe(new Error('golpe'), 'm1');
      expect(trasFallarLaCarga(err, true, 'm1')(antes)).toEqual(
        deCarga(err, 'm1'),
      );
    });

    it('dado un fallo de otro partido, cuando falla la carga, entonces se pone el de la carga', () => {
      const antes = delGolpe(new Error('golpe'), 'm0');
      expect(trasFallarLaCarga(err, false, 'm1')(antes)).toEqual(
        deCarga(err, 'm1'),
      );
    });

    it('dado un fallo de carga anterior, cuando vuelve a fallar, entonces se pone el nuevo', () => {
      const antes = deCarga(new Error('viejo'), 'm1');
      expect(trasFallarLaCarga(err, false, 'm1')(antes)).toEqual(
        deCarga(err, 'm1'),
      );
    });

    it('dado que no había fallo, cuando falla la carga, entonces se pone el de la carga', () => {
      expect(trasFallarLaCarga(err, false, 'm1')(null)).toEqual(
        deCarga(err, 'm1'),
      );
    });
  });
});
