import { describe, it, expect, vi, beforeEach } from 'vitest';
import StartDraftUseCase from './StartDraftUseCase';
import GetDraftUseCase from './GetDraftUseCase';
import MakeDraftPickUseCase from './MakeDraftPickUseCase';

/**
 * Los tres casos de uso de la sala (FE #653).
 *
 * Poco más que validar lo que les llega y delegar, que es el patrón de la
 * casa. Lo que se ata aquí es el orden de los argumentos: una llamada con la
 * competición y el jugador cambiados elige a otro y pasa en verde si nadie lo
 * comprueba (ya pasó en la FE #692).
 */
describe('Casos de uso de la sala de draft', () => {
  let draftRepository;

  beforeEach(() => {
    draftRepository = {
      startDraft: vi.fn().mockResolvedValue({ status: 'IN_PROGRESS' }),
      getDraft: vi.fn().mockResolvedValue({ status: 'IN_PROGRESS' }),
      makePick: vi.fn().mockResolvedValue({ status: 'IN_PROGRESS' }),
    };
  });

  describe('StartDraftUseCase', () => {
    it('C1: abre la sala de esa competición', async () => {
      const sala = await new StartDraftUseCase({ draftRepository }).execute('comp-1');

      expect(draftRepository.startDraft).toHaveBeenCalledWith('comp-1');
      expect(sala.status).toBe('IN_PROGRESS');
    });

    it('C2: sin competición no llama a nadie', async () => {
      await expect(new StartDraftUseCase({ draftRepository }).execute()).rejects.toThrow(
        'Competition ID is required'
      );
      expect(draftRepository.startDraft).not.toHaveBeenCalled();
    });
  });

  describe('GetDraftUseCase', () => {
    it('C3: devuelve la sala', async () => {
      const sala = await new GetDraftUseCase({ draftRepository }).execute('comp-1');

      expect(draftRepository.getDraft).toHaveBeenCalledWith('comp-1');
      expect(sala.status).toBe('IN_PROGRESS');
    });

    it('C4: y deja pasar el null de «todavía no hay sala»', async () => {
      draftRepository.getDraft.mockResolvedValue(null);

      expect(await new GetDraftUseCase({ draftRepository }).execute('comp-1')).toBeNull();
    });

    it('C5: sin competición no llama a nadie', async () => {
      await expect(new GetDraftUseCase({ draftRepository }).execute()).rejects.toThrow(
        'Competition ID is required'
      );
      expect(draftRepository.getDraft).not.toHaveBeenCalled();
    });
  });

  describe('MakeDraftPickUseCase', () => {
    it('C6: elige a ese jugador en esa competición, en ese orden', async () => {
      await new MakeDraftPickUseCase({ draftRepository }).execute('comp-1', 'dani');

      expect(draftRepository.makePick).toHaveBeenCalledWith('comp-1', 'dani');
    });

    it('C7: sin jugador no se elige a nadie', async () => {
      await expect(
        new MakeDraftPickUseCase({ draftRepository }).execute('comp-1')
      ).rejects.toThrow('Player ID is required');
      expect(draftRepository.makePick).not.toHaveBeenCalled();
    });

    it('C8: y sin competición tampoco', async () => {
      await expect(new MakeDraftPickUseCase({ draftRepository }).execute(null, 'dani')).rejects.toThrow(
        'Competition ID is required'
      );
      expect(draftRepository.makePick).not.toHaveBeenCalled();
    });
  });
});
