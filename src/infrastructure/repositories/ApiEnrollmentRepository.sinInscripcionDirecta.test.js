import { describe, it, expect } from 'vitest';
import ApiEnrollmentRepository from './ApiEnrollmentRepository';
import IEnrollmentRepository from '../../domain/repositories/IEnrollmentRepository';

/**
 * El organizador ya no inscribe a mano (15 nov 2026; RyderCupAm B-02): solo
 * invita. La ruta POST /competitions/{id}/enrollments/direct ya no existe en
 * el servidor, así que el cliente tampoco la tiene.
 *
 *   caso                                   | qué pasa
 *   ---------------------------------------|---------------------------------
 *   D1 el repositorio y su contrato        | sin `directEnroll`
 *   D2 la composición                      | sin `directEnrollUseCase`
 */
describe('sin inscripción directa del organizador', () => {
  it('D1: Given el cliente de la API, When se busca la inscripción directa, Then no está', () => {
    expect(ApiEnrollmentRepository.prototype.directEnroll).toBeUndefined();
    expect(IEnrollmentRepository.prototype.directEnroll).toBeUndefined();
  });

  it('D2: Given la composición, When se busca su caso de uso, Then no está', async () => {
    const composicion = await import('../../composition');

    expect(composicion.directEnrollUseCase).toBeUndefined();
  });
});
