import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useState } from 'react';
import { renderHook, act } from '@testing-library/react';
import {
  useBarrasDelCampo,
  ESPERA_DE_TUS_PARTIDAS_MS,
} from './useBarrasDelCampo';
import { useAvisoDelAsistente } from './useAvisoDelAsistente';

/**
 * Las barras del campo y la de quien crea:
 *
 *   #   caso                                                  | qué pasa
 *   ----|-----------------------------------------------------|-------------------------------
 *   B1  elige campo; tus 5 últimas allí traen tu barra      | se marca la de la última vez
 *   B2  tus partidas no llegan en 2 s                       | se marca la de tu género
 *   B3  llega la respuesta de una elección anterior          | no se usa (B3b: ni pisa la actual)
 *   B4  al repetir, aviso de que tu barra ya no vale        | no se marca ninguna
 *   B5  había aviso de «elige tu barra» y se marca          | el aviso se quita (otro, no)
 *   B6  la barra de un amigo                                | la suya si está en el campo
 *   B7  cambiar de campo                                    | sin barra elegida ni cita RFEG
 */
const mockGetGolfCourse = vi.fn();
const mockListMyQuickMatches = vi.fn();
vi.mock('../../composition', () => ({
  getGolfCourseUseCase: { execute: (...a) => mockGetGolfCourse(...a) },
  listMyQuickMatchesUseCase: {
    execute: (...a) => mockListMyQuickMatches(...a),
  },
}));

const TEES = [
  { color: 'YELLOW', gender: 'MALE' },
  { color: 'WHITE', gender: 'MALE' },
  { color: 'RED', gender: 'FEMALE' },
];
const yo = { id: 'u1', gender: 'MALE' };
const partidaEn = (campo, participantes) => ({
  golfCourseId: campo,
  playedAt: '2026-11-01T10:00:00Z',
  participants: participantes,
});
const campoA = { id: 'gc-a', name: 'Campo A' };
const campoB = { id: 'gc-b', name: 'Campo B' };

const useConBarras = ({ copia = null, avisosDelBorrador = [] } = {}) => {
  const [selectedCourse, setSelectedCourse] = useState(
    copia?.selectedCourse ?? null,
  );
  const aviso = useAvisoDelAsistente();
  const barras = useBarrasDelCampo({
    selectedCourse,
    setSelectedCourse,
    copia,
    avisosDelBorrador,
    currentUser: yo,
    error: aviso.error,
    setError: aviso.setError,
  });
  return { ...barras, aviso, selectedCourse };
};

// Deja correr las promesas pendientes (con relojes falsos)
const deja = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });

describe('useBarrasDelCampo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockGetGolfCourse.mockReset();
    mockListMyQuickMatches.mockReset();
    mockGetGolfCourse.mockResolvedValue({
      tees: TEES,
      isFromRfeg: () => true,
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('B1: con tus partidas en el campo, se marca la de la última vez', async () => {
    mockListMyQuickMatches.mockResolvedValue({
      quickMatches: [
        partidaEn('gc-a', [
          { userId: 'u1', color: 'WHITE', teeGender: 'MALE' },
        ]),
      ],
    });
    const { result } = renderHook(() => useConBarras());
    expect(result.current.creatorTeeKey).toBe('');

    act(() => result.current.eligeCampo(campoA));
    await deja();

    expect(mockGetGolfCourse).toHaveBeenCalledWith('gc-a');
    expect(mockListMyQuickMatches).toHaveBeenCalledWith({
      page: 1,
      limit: 5,
      golfCourseId: 'gc-a',
    });
    expect(result.current.courseTees).toEqual(TEES);
    expect(result.current.courseFromRfeg).toBe(true);
    expect(result.current.teesLoading).toBe(false);
    expect(result.current.creatorTeeKey).toBe('WHITE|MALE');
  });

  it('B2: si tus partidas no llegan en 2 s, se marca la de tu género', async () => {
    mockListMyQuickMatches.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useConBarras());
    act(() => result.current.eligeCampo(campoA));
    await deja();
    expect(result.current.creatorTeeKey).toBe('');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ESPERA_DE_TUS_PARTIDAS_MS - 1);
    });
    expect(result.current.creatorTeeKey).toBe('');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(result.current.creatorTeeKey).toBe('YELLOW|MALE');
  });

  it('B3: la respuesta de una elección anterior se descarta', async () => {
    let respondeLaPrimera;
    mockListMyQuickMatches
      .mockReturnValueOnce(
        new Promise((r) => {
          respondeLaPrimera = r;
        }),
      )
      .mockReturnValueOnce(new Promise(() => {}));
    const { result } = renderHook(() => useConBarras());
    act(() => result.current.eligeCampo(campoA));
    await deja();
    // Otra elección del mismo campo: la primera ya no vale
    act(() => result.current.eligeCampo(campoA));
    await deja();
    await act(async () => {
      respondeLaPrimera({
        quickMatches: [
          partidaEn('gc-a', [
            { userId: 'u1', color: 'WHITE', teeGender: 'MALE' },
          ]),
        ],
      });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.creatorTeeKey).toBe('');
  });

  it('B3b: la de una elección anterior que llega tarde no pisa la actual', async () => {
    let respondeLaPrimera;
    mockListMyQuickMatches
      .mockReturnValueOnce(
        new Promise((r) => {
          respondeLaPrimera = r;
        }),
      )
      .mockResolvedValueOnce({
        quickMatches: [
          partidaEn('gc-a', [
            { userId: 'u2', color: 'RED', teeGender: 'FEMALE' },
          ]),
        ],
      });
    const { result } = renderHook(() => useConBarras());
    act(() => result.current.eligeCampo(campoA));
    await deja();
    act(() => result.current.eligeCampo(campoA));
    await deja();
    expect(result.current.barraDeAmigo('u2')).toBe('RED|FEMALE');
    await act(async () => {
      respondeLaPrimera({ quickMatches: [] });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.barraDeAmigo('u2')).toBe('RED|FEMALE');
  });

  it('B4: al repetir con el aviso de tu barra, no se marca ninguna', async () => {
    mockListMyQuickMatches.mockResolvedValue({ quickMatches: [] });
    const { result } = renderHook(() =>
      useConBarras({
        copia: { selectedCourse: campoA, creatorTeeKey: '' },
        avisosDelBorrador: [{ tipo: 'sinBarra', propia: true, paso: 1 }],
      }),
    );
    await deja();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ESPERA_DE_TUS_PARTIDAS_MS);
    });
    expect(result.current.courseTees).toEqual(TEES);
    expect(result.current.creatorTeeKey).toBe('');
  });

  it('B4b: el aviso de la barra de otro no impide marcar la tuya', async () => {
    mockListMyQuickMatches.mockResolvedValue({ quickMatches: [] });
    const { result } = renderHook(() =>
      useConBarras({
        copia: { selectedCourse: campoA, creatorTeeKey: '' },
        avisosDelBorrador: [{ tipo: 'sinBarra', nombre: 'Luis', paso: 2 }],
      }),
    );
    await deja();
    expect(result.current.creatorTeeKey).toBe('YELLOW|MALE');
  });

  it('B5: al marcarla se quita el aviso de «elige tu barra», y solo ese', async () => {
    mockListMyQuickMatches.mockResolvedValue({ quickMatches: [] });
    const { result } = renderHook(() => useConBarras());
    act(() => result.current.aviso.setError('create.course.errorTeeRequired'));
    act(() => result.current.eligeCampo(campoA));
    await deja();
    expect(result.current.creatorTeeKey).toBe('YELLOW|MALE');
    expect(result.current.aviso.error).toBeNull();

    act(() => result.current.aviso.setError('otro.aviso'));
    act(() => result.current.eligeCampo(campoB));
    await deja();
    expect(result.current.creatorTeeKey).toBe('YELLOW|MALE');
    expect(result.current.aviso.error).toEqual({ clave: 'otro.aviso' });
  });

  it('B6: la barra de un amigo, si la llevó y está en el campo', async () => {
    mockListMyQuickMatches.mockResolvedValue({
      quickMatches: [
        partidaEn('gc-a', [
          { userId: 'u2', color: 'RED', teeGender: 'FEMALE' },
          { userId: 'u3', color: 'BLUE', teeGender: 'MALE' },
        ]),
      ],
    });
    const { result } = renderHook(() => useConBarras());
    act(() => result.current.eligeCampo(campoA));
    await deja();
    expect(result.current.barraDeAmigo('u2')).toBe('RED|FEMALE');
    expect(result.current.barraDeAmigo('u3')).toBe('');
    expect(result.current.barraDeAmigo('u9')).toBe('');
  });

  it('B7: al cambiar de campo se olvidan la barra elegida y la cita', async () => {
    mockListMyQuickMatches.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useConBarras());
    act(() => result.current.eligeCampo(campoA));
    await deja();
    act(() => result.current.setCreatorTeeKey('WHITE|MALE'));
    expect(result.current.courseFromRfeg).toBe(true);

    mockGetGolfCourse.mockReturnValue(new Promise(() => {}));
    act(() => result.current.eligeCampo(campoB));
    expect(result.current.creatorTeeKey).toBe('');
    expect(result.current.courseFromRfeg).toBe(false);
    // Las del anterior siguen a la vista mientras llegan las nuevas
    expect(result.current.courseTees).toEqual(TEES);

    act(() => result.current.eligeCampo(null));
    expect(result.current.courseTees).toEqual([]);
  });
});
