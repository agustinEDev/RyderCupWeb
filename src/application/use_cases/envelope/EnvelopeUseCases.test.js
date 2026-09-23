import { describe, it, expect, vi, beforeEach } from 'vitest';
import SubmitEnvelopeUseCase from './SubmitEnvelopeUseCase';
import GetEnvelopesUseCase from './GetEnvelopesUseCase';
import RevealEnvelopesUseCase from './RevealEnvelopesUseCase';

/**
 * Los tres casos de uso de los sobres (FE #655).
 *
 * Lo que se ata aquí es el orden de los argumentos y que no se llame al
 * servidor con una lista vacía, que el backend rechaza y el capitán vería
 * como un error sin entender por qué.
 */
describe('Casos de uso de los sobres', () => {
  let envelopeRepository;

  beforeEach(() => {
    envelopeRepository = {
      submitEnvelope: vi.fn().mockResolvedValue({ team: 'A' }),
      getEnvelopes: vi.fn().mockResolvedValue({ roundId: 'r1' }),
      revealEnvelopes: vi.fn().mockResolvedValue({ matchups: [] }),
    };
  });

  it('U1: entregar manda la sesión y las filas, en ese orden', async () => {
    await new SubmitEnvelopeUseCase({ envelopeRepository }).execute('r1', [['ana']]);

    expect(envelopeRepository.submitEnvelope).toHaveBeenCalledWith('r1', [['ana']]);
  });

  it('U2: sin sesión no se llama a nadie', async () => {
    await expect(
      new SubmitEnvelopeUseCase({ envelopeRepository }).execute(null, [['ana']])
    ).rejects.toThrow('Round ID is required');
    expect(envelopeRepository.submitEnvelope).not.toHaveBeenCalled();
  });

  it('U3: y con la lista vacía tampoco: el servidor lo rechazaría', async () => {
    await expect(
      new SubmitEnvelopeUseCase({ envelopeRepository }).execute('r1', [])
    ).rejects.toThrow('Entries are required');
    expect(envelopeRepository.submitEnvelope).not.toHaveBeenCalled();
  });

  it('U4: mirar devuelve la vista', async () => {
    const vista = await new GetEnvelopesUseCase({ envelopeRepository }).execute('r1');

    expect(envelopeRepository.getEnvelopes).toHaveBeenCalledWith('r1');
    expect(vista.roundId).toBe('r1');
  });

  it('U5: y deja pasar el null de «esta sesión no tiene sobres»', async () => {
    envelopeRepository.getEnvelopes.mockResolvedValue(null);

    expect(await new GetEnvelopesUseCase({ envelopeRepository }).execute('r1')).toBeNull();
  });

  it('U6: abrirlos manda la sesión', async () => {
    await new RevealEnvelopesUseCase({ envelopeRepository }).execute('r1');

    expect(envelopeRepository.revealEnvelopes).toHaveBeenCalledWith('r1');
  });

  it('U7: sin sesión no se abre nada', async () => {
    await expect(
      new RevealEnvelopesUseCase({ envelopeRepository }).execute()
    ).rejects.toThrow('Round ID is required');
    expect(envelopeRepository.revealEnvelopes).not.toHaveBeenCalled();
  });
});
