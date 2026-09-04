import { describe, it, expect, vi, beforeEach } from 'vitest';
import SetNamePreferenceUseCase from './SetNamePreferenceUseCase';
import Enrollment from '../../../domain/entities/Enrollment';
import EnrollmentId from '../../../domain/value_objects/EnrollmentId';
import EnrollmentStatus from '../../../domain/value_objects/EnrollmentStatus';

const unaInscripcion = (useRealName) =>
  Enrollment.fromPersistence({
    enrollmentId: EnrollmentId.create(),
    competitionId: 'comp-1',
    userId: 'user-1',
    status: EnrollmentStatus.approved(),
    useRealName,
  });

describe('SetNamePreferenceUseCase', () => {
  let repositorio;
  let useCase;

  beforeEach(() => {
    repositorio = { setNamePreference: vi.fn() };
    useCase = new SetNamePreferenceUseCase(repositorio);
  });

  it('exige un repositorio', () => {
    expect(() => new SetNamePreferenceUseCase()).toThrow();
  });

  it('manda la preferencia y devuelve el DTO de lo que confirmó el backend', async () => {
    repositorio.setNamePreference.mockResolvedValue(unaInscripcion(true));

    const dto = await useCase.execute('enroll-1', true);

    expect(repositorio.setNamePreference).toHaveBeenCalledWith('enroll-1', true);
    expect(dto.useRealName).toBe(true);
  });

  it('también sabe volver al alias', async () => {
    repositorio.setNamePreference.mockResolvedValue(unaInscripcion(false));

    const dto = await useCase.execute('enroll-1', false);

    expect(repositorio.setNamePreference).toHaveBeenCalledWith('enroll-1', false);
    expect(dto.useRealName).toBe(false);
  });

  it('rechaza un enrollmentId vacío sin llamar a la API', async () => {
    await expect(useCase.execute('', true)).rejects.toThrow('enrollmentId');
    expect(repositorio.setNamePreference).not.toHaveBeenCalled();
  });

  it('rechaza una preferencia que no sea booleana sin llamar a la API', async () => {
    // Un `undefined` llegaría a la API como campo ausente y volvería un 422
    await expect(useCase.execute('enroll-1', undefined)).rejects.toThrow('useRealName');
    await expect(useCase.execute('enroll-1', 'true')).rejects.toThrow('useRealName');
    expect(repositorio.setNamePreference).not.toHaveBeenCalled();
  });

  it('propaga el error del backend (un 403 de una inscripción ajena)', async () => {
    repositorio.setNamePreference.mockRejectedValue(new Error('403 Forbidden'));

    await expect(useCase.execute('enroll-ajeno', true)).rejects.toThrow('403');
  });
});
