import { describe, expect, it } from 'vitest';

import { claveDeFallo, loadErrorKeyFor, saveErrorKeyFor } from './textosDePartidaRapida';

describe('textosDePartidaRapida', () => {
  describe('loadErrorKeyFor', () => {
    it('dado un 403 o un 404 al cargar, entonces su clave de carga', () => {
      expect(loadErrorKeyFor({ status: 403 })).toBe('scoring.errors.forbidden');
      expect(loadErrorKeyFor({ status: 404 })).toBe('scoring.errors.notFound');
    });

    it('dado otro fallo al cargar, entonces la genérica', () => {
      expect(loadErrorKeyFor({ status: 500 })).toBe('scoring.errors.generic');
      expect(loadErrorKeyFor(null)).toBe('scoring.errors.generic');
    });
  });

  describe('saveErrorKeyFor', () => {
    it('dado un error con su propia clave, entonces manda la suya', () => {
      expect(saveErrorKeyFor({ i18nKey: 'scoring:errors.lleno', status: 403 })).toBe('scoring:errors.lleno');
    });

    it('dado cada estado de anotar, entonces su clave', () => {
      expect(saveErrorKeyFor({ status: 400 })).toBe('scoring.errors.saveInvalid');
      expect(saveErrorKeyFor({ status: 403 })).toBe('scoring.errors.saveForbidden');
      expect(saveErrorKeyFor({ status: 404 })).toBe('scoring.errors.saveNotFound');
      expect(saveErrorKeyFor({ status: 409 })).toBe('scoring.errors.saveConflict');
      expect(saveErrorKeyFor({ status: 422 })).toBe('scoring.errors.saveInvalid');
    });

    it('dado otro fallo al anotar, entonces «no se ha podido guardar»', () => {
      expect(saveErrorKeyFor({ status: 500 })).toBe('scoring.errors.saveFailed');
      expect(saveErrorKeyFor(undefined)).toBe('scoring.errors.saveFailed');
    });
  });

  describe('claveDeFallo', () => {
    it('dado un 409, entonces ya estaba cerrada', () => {
      expect(claveDeFallo('scoring.finish', { status: 409 })).toBe('scoring.finish.failed');
    });

    it('dado otro estado, entonces un no del servidor', () => {
      expect(claveDeFallo('scoring.cancelMatch', { status: 500 })).toBe('scoring.cancelMatch.failedServer');
    });

    it('dado que no hubo error, entonces la guarda de creador, no la cobertura', () => {
      expect(claveDeFallo('scoring.finish', undefined)).toBe('scoring.finish.failedServer');
    });

    it('dado un fallo sin estado, entonces la cobertura', () => {
      expect(claveDeFallo('scoring.finish', new Error('Failed to fetch'))).toBe('scoring.finish.failedOffline');
    });
  });
});
