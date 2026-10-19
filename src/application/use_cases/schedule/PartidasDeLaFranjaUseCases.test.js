import { describe, it, expect, vi } from 'vitest';
import GetTeeGroupsUseCase from './GetTeeGroupsUseCase';
import GetMyTeeGroupsUseCase from './GetMyTeeGroupsUseCase';
import GenerateTeeGroupsUseCase from './GenerateTeeGroupsUseCase';
import MoveTeeGroupPlayerUseCase from './MoveTeeGroupPlayerUseCase';
import ReorderTeeGroupsUseCase from './ReorderTeeGroupsUseCase';
import SetTeeGroupMarkersUseCase from './SetTeeGroupMarkersUseCase';
import DeleteTeeGroupsUseCase from './DeleteTeeGroupsUseCase';

/** Las partidas (FE #824, PR 6): cada caso de uso pasa al repositorio y no llama sin lo que necesita. */
const VISTA = { roundId: 'r-1', editable: true, unassignedPlayers: [], groups: [] };
const repo = () => ({
  getTeeGroups: vi.fn().mockResolvedValue(VISTA),
  getMyTeeGroups: vi.fn().mockResolvedValue([]),
  generateTeeGroups: vi.fn().mockResolvedValue(VISTA),
  moveTeeGroupPlayer: vi.fn().mockResolvedValue(VISTA),
  reorderTeeGroups: vi.fn().mockResolvedValue(VISTA),
  setTeeGroupMarkers: vi.fn().mockResolvedValue(VISTA),
  deleteTeeGroups: vi.fn().mockResolvedValue(),
});
const con = (Clase, r) => new Clase({ scheduleRepository: r });

describe('Partidas de la franja · casos de uso (FE #824, PR 6)', () => {
  it('leer, generar, reordenar, marcadores y borrar pasan sus datos y devuelven la vista', async () => {
    const r = repo();

    expect(await con(GetTeeGroupsUseCase, r).execute('r-1')).toBe(VISTA);
    expect(await con(GetMyTeeGroupsUseCase, r).execute('c-1')).toEqual([]);
    expect(await con(GenerateTeeGroupsUseCase, r).execute('r-1', 'LOW_FIRST')).toBe(VISTA);
    expect(await con(ReorderTeeGroupsUseCase, r).execute('r-1', ['g-2', 'g-1'])).toBe(VISTA);
    expect(await con(SetTeeGroupMarkersUseCase, r).execute('g-1', [{ userId: 'u-1', marksUserId: 'u-2' }])).toBe(VISTA);
    await con(DeleteTeeGroupsUseCase, r).execute('r-1');

    expect(r.getTeeGroups).toHaveBeenCalledWith('r-1');
    expect(r.getMyTeeGroups).toHaveBeenCalledWith('c-1');
    expect(r.generateTeeGroups).toHaveBeenCalledWith('r-1', 'LOW_FIRST');
    expect(r.reorderTeeGroups).toHaveBeenCalledWith('r-1', ['g-2', 'g-1']);
    expect(r.setTeeGroupMarkers).toHaveBeenCalledWith('g-1', [{ userId: 'u-1', marksUserId: 'u-2' }]);
    expect(r.deleteTeeGroups).toHaveBeenCalledWith('r-1');
  });

  it('mover pasa solo lo que hay: a una partida nueva, sin partida ni intercambio', async () => {
    const r = repo();

    await con(MoveTeeGroupPlayerUseCase, r).execute('r-1', { userId: 'u-1', groupId: 'g-2', swapWithUserId: 'u-5' });
    await con(MoveTeeGroupPlayerUseCase, r).execute('r-1', { userId: 'u-1' });

    expect(r.moveTeeGroupPlayer).toHaveBeenNthCalledWith(1, 'r-1', { userId: 'u-1', groupId: 'g-2', swapWithUserId: 'u-5' });
    expect(r.moveTeeGroupPlayer).toHaveBeenNthCalledWith(2, 'r-1', { userId: 'u-1' });
  });

  it.each([
    ['leer sin franja', (r) => con(GetTeeGroupsUseCase, r).execute(''), 'getTeeGroups'],
    ['mis partidas sin competición', (r) => con(GetMyTeeGroupsUseCase, r).execute(''), 'getMyTeeGroups'],
    ['generar sin franja', (r) => con(GenerateTeeGroupsUseCase, r).execute('', 'HIGH_FIRST'), 'generateTeeGroups'],
    ['generar con otro orden', (r) => con(GenerateTeeGroupsUseCase, r).execute('r-1', 'RANDOM'), 'generateTeeGroups'],
    ['mover sin jugador', (r) => con(MoveTeeGroupPlayerUseCase, r).execute('r-1', {}), 'moveTeeGroupPlayer'],
    ['mover sin franja', (r) => con(MoveTeeGroupPlayerUseCase, r).execute('', { userId: 'u-1' }), 'moveTeeGroupPlayer'],
    ['intercambiar sin partida', (r) => con(MoveTeeGroupPlayerUseCase, r).execute('r-1', { userId: 'u-1', swapWithUserId: 'u-5' }), 'moveTeeGroupPlayer'],
    ['reordenar sin partidas', (r) => con(ReorderTeeGroupsUseCase, r).execute('r-1', []), 'reorderTeeGroups'],
    ['marcadores sin partida', (r) => con(SetTeeGroupMarkersUseCase, r).execute('', [{ userId: 'u-1', marksUserId: 'u-2' }]), 'setTeeGroupMarkers'],
    ['marcadores vacíos', (r) => con(SetTeeGroupMarkersUseCase, r).execute('g-1', []), 'setTeeGroupMarkers'],
    ['borrar sin franja', (r) => con(DeleteTeeGroupsUseCase, r).execute(''), 'deleteTeeGroups'],
  ])('%s: no llama', async (_caso, ejecutar, metodo) => {
    const r = repo();

    await expect(ejecutar(r)).rejects.toThrow();
    expect(r[metodo]).not.toHaveBeenCalled();
  });
});
