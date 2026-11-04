/**
 * El paso 1 más sencillo, con la barra ya elegida (FE #1025). Tabla aprobada
 * por Agustín el 3 nov 2026 (P4 afinada ese mismo día):
 *
 *   #    caso                                       | qué pasa
 *   -----|-------------------------------------------|----------------------------------
 *   P1   orden                                      | campo → tu barra → ¿a qué jugáis?
 *        |                                           | → más opciones
 *   P2   ¿a qué jugáis?                             | un toque fija modalidad y formato;
 *        |                                           | el % sigue al formato
 *   P3   más opciones                               | plegado; lo que no es lo de por
 *        |                                           | defecto, en su cabecera
 *   P4   tu barra                                   | botones de tu género y las mixtas;
 *        |                                           | «Otras» abre el panel; la elegida
 *        |                                           | ahí se ve marcada
 *   P5   la que sale elegida                        | la de la última vez en ese campo;
 *        |                                           | si no, la de tu género; si no,
 *        |                                           | ninguna
 *   P6   otro campo                                 | se vuelve a calcular
 *   P7   repetir                                    | manda la copiada
 *   P8   un amigo (paso 2)                          | el panel trae marcada su última
 *   P10  campo sin barras                           | sin «Tu barra»
 *   P11  sin poder leer tus partidas                | la de tu género
 *
 * Lo que añadió el revisor (4 nov 2026), decidido con Agustín:
 *
 *   R1   tus partidas llegan tarde (poca cobertura) | no se marca ninguna hasta saberlo;
 *        |                                           | luego la buena, y es la que viaja
 *   R2   no llegan en 2 s                           | la de tu género, y ya no cambia
 *        |                                           | aunque lleguen después
 *   R3   un % a mano y se cambia entre match y     | vuelve al de por defecto y «Más
 *        | stroke play                               | opciones» se abre para que se vea
 *   R4   al repetir                                 | la barra copiada es la que viaja
 *
 * El nombre por defecto (Agustín, 4 nov 2026): «Campo · dd/mm»
 *
 *   N3   al elegir campo                            | escrito en el campo, y viaja
 *   N4   sin campo                                  | vacío
 *   N4b  cambiar de campo                           | lo sigue; el formato no lo toca;
 *        |                                           | no sale en la cabecera
 *   N5   escribir uno                               | se queda aunque cambie el campo
 *   N6   vaciarlo                                   | viaja el de por defecto
 *   N7   repetir una con nombre propio              | se copia
 *   N8   repetir una con el de por defecto          | el de hoy
 *
 * Y de la segunda revisión (4 nov 2026):
 *
 *   R5   repetir con aviso «elige tu barra»         | no se marca ninguna
 *   R6   elegir a mano el % por defecto             | no cuenta como «a mano»
 *   R7   «Otras»                                    | dice si su panel está abierto
 *
 * Y de /code-review (4 nov 2026):
 *
 *   C1   «elige tu barra» y luego se marca sola     | el error se va
 *   C2   repetir con un nombre propio de la misma   | se copia
 *        | forma («Liga · 12/10»)                    |
 *   C3   el % a mano pasa a ser el de por defecto   | no sale en la cabecera
 *        | al cambiar de formato                     |
 *   C4   un nombre largo sin espacios               | la cabecera lo parte
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import CreateQuickMatchModal from './CreateQuickMatchModal';
import { nombrePorDefecto } from '../../utils/nombrePorDefecto';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => (params?.current !== undefined ? `${key}_${params.current}_${params.total}` : key),
    i18n: { language: 'es' },
  }),
}));

const mockCampoElegido = vi.hoisted(() => ({ id: 'gc-1' }));
vi.mock('../golf_course/GolfCourseSearchBox', () => ({
  default: ({ onCourseSelect }) => (
    <button type="button" data-testid="select-course-stub" onClick={() => onCourseSelect({ id: mockCampoElegido.id, name: mockCampoElegido.id })}>
      Select course
    </button>
  ),
}));

const mockIniciar = vi.fn();
const mockListFriends = vi.fn();
const mockGetGolfCourse = vi.fn();
const mockListMine = vi.fn();
vi.mock('../../utils/toast', () => ({ default: { info: vi.fn(), error: vi.fn(), success: vi.fn() } }));
vi.mock('../../composition', () => ({
  createAndStartQuickMatchUseCase: { execute: (...a) => mockIniciar(...a) },
  listFriendsUseCase: { execute: (...a) => mockListFriends(...a) },
  getGolfCourseUseCase: { execute: (...a) => mockGetGolfCourse(...a) },
  listMyQuickMatchesUseCase: { execute: (...a) => mockListMine(...a) },
}));

const tee = (color, gender) => ({ color, gender });
const FEDERADO = [tee('WHITE', 'MALE'), tee('YELLOW', 'MALE'), tee('YELLOW', 'FEMALE'), tee('RED', 'FEMALE')];
const yo = (gender = 'MALE') => ({ id: 'yo', display_name: 'Yo', handicap: 12, gender });
const partidaEn = (golfCourseId, participants) => ({ id: `qm-${golfCourseId}`, golfCourseId, playedAt: '2026-10-01T10:00:00Z', participants });
const jugador = (userId, color, teeGender) => ({ userId, color, teeGender, isGuest: false });

const abre = (props = {}) =>
  render(
    <MemoryRouter>
      <CreateQuickMatchModal onClose={vi.fn()} onStarted={vi.fn()} currentUser={yo()} {...props} />
    </MemoryRouter>
  );

const eligeCampo = async (id = 'gc-1') => {
  mockCampoElegido.id = id;
  fireEvent.click(screen.getByTestId('select-course-stub'));
  await waitFor(() => expect(mockGetGolfCourse).toHaveBeenCalledWith(id));
  await waitFor(() => expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled());
};
const pulsada = (testId) => screen.getByTestId(testId).getAttribute('aria-pressed') === 'true';
const peticion = () => mockIniciar.mock.calls[0][0];
const hastaElResumen = async () => {
  // En individual hacen falta dos: para llegar al resumen solo, juego libre
  if (pulsada('format-option-SINGLES')) fireEvent.click(screen.getByTestId('scoring-format-option-STABLEFORD'));
  fireEvent.click(screen.getByTestId('quick-match-course-next'));
  await screen.findByTestId('quick-match-participants-next');
  fireEvent.click(screen.getByTestId('quick-match-participants-next'));
  fireEvent.click(await screen.findByTestId('quick-match-scorers-next'));
  fireEvent.click(await screen.findByTestId('quick-match-start'));
  await waitFor(() => expect(mockIniciar).toHaveBeenCalled());
};

describe('CreateQuickMatchModal · paso 1 más sencillo (FE #1025)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCampoElegido.id = 'gc-1';
    mockListFriends.mockResolvedValue({ friendships: [{ id: 'f-1', otherUserId: 'ana', otherUserName: 'Ana', otherUserHandicap: 20 }], totalCount: 1 });
    mockGetGolfCourse.mockImplementation((id) => Promise.resolve({ tees: id === 'gc-sin' ? [] : FEDERADO, isFromRfeg: () => false }));
    mockListMine.mockResolvedValue({ quickMatches: [] });
    mockIniciar.mockResolvedValue({ id: 'qm-nueva' });
  });

  it('P1: campo, tu barra, a qué jugáis y más opciones, en ese orden', async () => {
    abre();
    await eligeCampo();

    const orden = ['select-course-stub', 'quick-match-creator-tee-option-YELLOW|MALE', 'format-option-SINGLES', 'quick-match-mas-opciones'].map((id) => screen.getByTestId(id));
    for (let i = 1; i < orden.length; i += 1) {
      expect(orden[i - 1].compareDocumentPosition(orden[i]) & globalThis.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('P2: un toque fija modalidad y formato (y el % del formato)', async () => {
    abre();
    await eligeCampo();

    fireEvent.click(screen.getByTestId('format-option-FOURBALL'));
    expect(pulsada('format-option-FOURBALL')).toBe(true);
    expect(pulsada('format-option-SINGLES')).toBe(false);

    fireEvent.click(screen.getByTestId('scoring-format-option-MEDAL'));
    expect(pulsada('scoring-format-option-MEDAL')).toBe(true);
    expect(pulsada('format-option-FOURBALL')).toBe(false);
    await hastaElResumen();
    expect(peticion()).toMatchObject({ matchFormat: null, scoringFormat: 'MEDAL', allowancePercentage: 95 });
  });

  it('P3: más opciones, plegado, y en su cabecera lo que no es lo de por defecto', async () => {
    abre();
    const mas = screen.getByTestId('quick-match-mas-opciones');
    expect(mas.open).toBe(false);
    expect(mas.querySelector('summary').textContent).toBe('create.course.masOpciones');

    fireEvent.change(screen.getByTestId('quick-match-name-input'), { target: { value: 'Domingo' } });
    fireEvent.click(screen.getByTestId('quick-match-allowance-option-90'));

    expect(mas.querySelector('summary').textContent).toBe('create.course.masOpciones · Domingo · 90%');
    fireEvent.click(screen.getByTestId('quick-match-play-mode-option-SCRATCH'));
    expect(mas.querySelector('summary').textContent).toBe('create.course.masOpciones · Domingo · create.course.playModeScratch');
  });

  it('P4: las de tu género y las mixtas, a la vista; «Otras» para las demás, y la elegida ahí se ve', async () => {
    mockGetGolfCourse.mockResolvedValue({ tees: [...FEDERADO, tee('GREEN', null)], isFromRfeg: () => false });
    abre();
    await eligeCampo();

    const opciones = [...screen.getAllByTestId(/^quick-match-creator-tee-option-/)].map((b) => b.dataset.testid.replace('quick-match-creator-tee-option-', ''));
    expect(opciones).toEqual(['WHITE|MALE', 'YELLOW|MALE', 'GREEN|']);

    fireEvent.click(screen.getByTestId('quick-match-creator-tee-otras'));
    fireEvent.click(screen.getByTestId('quick-match-tee-panel-option-RED|FEMALE'));

    expect(pulsada('quick-match-creator-tee-option-RED|FEMALE')).toBe(true);
    await hastaElResumen();
    expect(peticion()).toMatchObject({ creatorTeeColor: 'RED', creatorTeeGender: 'FEMALE' });
  });

  it('P4: el (M)/(F) solo en la del otro género, y el nombre accesible es lo que se ve', async () => {
    abre();
    await eligeCampo();
    fireEvent.click(screen.getByTestId('quick-match-creator-tee-otras'));
    fireEvent.click(screen.getByTestId('quick-match-tee-panel-option-RED|FEMALE'));

    const mia = screen.getByTestId('quick-match-creator-tee-option-YELLOW|MALE');
    const otra = screen.getByTestId('quick-match-creator-tee-option-RED|FEMALE');
    expect(mia.textContent).not.toMatch(/\((M|F)\)/);
    expect(otra.textContent).toMatch(/\(F\)$/);
    expect(otra.getAttribute('aria-label')).toBe(otra.textContent);
  });

  it('P4: sin género en el perfil, el campo con el panel de siempre', async () => {
    abre({ currentUser: yo(null) });
    await eligeCampo();

    expect(screen.getByTestId('quick-match-creator-tee')).toBeInTheDocument();
    expect(screen.queryByTestId('quick-match-creator-tee-otras')).not.toBeInTheDocument();
  });

  it('P5: la de la última vez en ese campo sale elegida, y viaja', async () => {
    mockListMine.mockResolvedValue({ quickMatches: [partidaEn('gc-1', [jugador('yo', 'WHITE', 'MALE')])] });
    abre();
    await eligeCampo();

    await waitFor(() => expect(pulsada('quick-match-creator-tee-option-WHITE|MALE')).toBe(true));
    await hastaElResumen();
    expect(peticion()).toMatchObject({ creatorTeeColor: 'WHITE', creatorTeeGender: 'MALE' });
  });

  it.each([
    ['hombre', 'MALE', 'YELLOW|MALE'],
    ['mujer', 'FEMALE', 'RED|FEMALE'],
  ])('P5: sin última vez, la de tu género (%s)', async (_, genero, clave) => {
    abre({ currentUser: yo(genero) });
    await eligeCampo();

    await waitFor(() => expect(pulsada(`quick-match-creator-tee-option-${clave}`)).toBe(true));
  });

  it('P6: otro campo, se vuelve a calcular', async () => {
    mockListMine.mockResolvedValue({ quickMatches: [partidaEn('gc-1', [jugador('yo', 'WHITE', 'MALE')])] });
    abre();
    await eligeCampo('gc-1');
    await waitFor(() => expect(pulsada('quick-match-creator-tee-option-WHITE|MALE')).toBe(true));

    await eligeCampo('gc-2');

    await waitFor(() => expect(pulsada('quick-match-creator-tee-option-YELLOW|MALE')).toBe(true));
    expect(pulsada('quick-match-creator-tee-option-WHITE|MALE')).toBe(false);
  });

  it('P7: al repetir, manda la barra copiada', async () => {
    mockListMine.mockResolvedValue({ quickMatches: [partidaEn('gc-1', [jugador('yo', 'WHITE', 'MALE')])] });
    abre({
      borrador: {
        paso: 1,
        avisos: [],
        inicial: {
          matchName: '', mode: 'MATCH_PLAY', matchFormat: 'SINGLES', scoringFormat: 'STABLEFORD', allowanceOverride: null, playMode: 'HANDICAP',
          selectedCourse: { id: 'gc-1', name: 'gc-1' }, creatorTeeKey: 'YELLOW|FEMALE', participants: [], scorerIds: [],
        },
      },
    });
    await waitFor(() => expect(mockGetGolfCourse).toHaveBeenCalled());

    await waitFor(() => expect(pulsada('quick-match-creator-tee-option-YELLOW|FEMALE')).toBe(true));
    expect(pulsada('quick-match-creator-tee-option-WHITE|MALE')).toBe(false);
  });

  it('P8: al añadir un amigo, el panel trae marcada la barra que llevó allí la última vez', async () => {
    mockListMine.mockResolvedValue({ quickMatches: [partidaEn('gc-1', [jugador('yo', 'YELLOW', 'MALE'), jugador('ana', 'RED', 'FEMALE')])] });
    abre();
    await eligeCampo();
    fireEvent.click(screen.getByTestId('quick-match-course-next'));
    fireEvent.click(await screen.findByTestId('quick-match-add-friend-f-1'));

    expect(pulsada('quick-match-tee-panel-option-RED|FEMALE')).toBe(true);
    expect(pulsada('quick-match-tee-panel-option-YELLOW|MALE')).toBe(false);
  });

  it('P10: un campo sin barras, sin «Tu barra»', async () => {
    abre();
    await eligeCampo('gc-sin');

    expect(screen.queryByText('create.course.yourTeeLabel')).not.toBeInTheDocument();
    expect(screen.queryByTestId(/quick-match-creator-tee/)).not.toBeInTheDocument();
  });

  it('P11: sin poder leer tus partidas, la de tu género', async () => {
    mockListMine.mockRejectedValue(new TypeError('Failed to fetch'));
    abre();
    await eligeCampo();

    await waitFor(() => expect(pulsada('quick-match-creator-tee-option-YELLOW|MALE')).toBe(true));
  });

  describe('lo que añadió el revisor', () => {
    afterEach(() => vi.useRealTimers());
    const colgada = () => {
      let responde;
      const promesa = new Promise((r) => { responde = r; });
      return { promesa, responde };
    };

    it('R1: con tus partidas en camino no se marca ninguna; luego la buena, y es la que viaja', async () => {
      // Reloj falso: con uno real, una máquina cargada agota los 2 s antes
      vi.useFakeTimers({ shouldAdvanceTime: true, advanceTimeDelta: 1 });
      const lista = colgada();
      mockListMine.mockReturnValue(lista.promesa);
      abre();
      await eligeCampo();

      expect(screen.getAllByTestId(/^quick-match-creator-tee-option-/).some((b) => b.getAttribute('aria-pressed') === 'true')).toBe(false);

      await act(async () => lista.responde({ quickMatches: [partidaEn('gc-1', [jugador('yo', 'WHITE', 'MALE')])] }));
      await waitFor(() => expect(pulsada('quick-match-creator-tee-option-WHITE|MALE')).toBe(true));
      await hastaElResumen();
      expect(peticion()).toMatchObject({ creatorTeeColor: 'WHITE', creatorTeeGender: 'MALE' });
    });

    it('R2: sin respuesta en 2 s, la de tu género, y ya no cambia aunque lleguen después', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const lista = colgada();
      mockListMine.mockReturnValue(lista.promesa);
      abre();
      await eligeCampo();

      await act(() => vi.advanceTimersByTimeAsync(2000));
      await waitFor(() => expect(pulsada('quick-match-creator-tee-option-YELLOW|MALE')).toBe(true));

      await act(async () => lista.responde({ quickMatches: [partidaEn('gc-1', [jugador('yo', 'WHITE', 'MALE')])] }));
      expect(pulsada('quick-match-creator-tee-option-YELLOW|MALE')).toBe(true);
      expect(pulsada('quick-match-creator-tee-option-WHITE|MALE')).toBe(false);
      await hastaElResumen();
      expect(peticion()).toMatchObject({ creatorTeeColor: 'YELLOW', creatorTeeGender: 'MALE' });
    });

    it('R3: un % a mano y se cruza a stroke play: vuelve al de por defecto y se ve', async () => {
      abre();
      await eligeCampo();
      fireEvent.click(screen.getByTestId('format-option-FOURBALL'));
      fireEvent.click(screen.getByTestId('quick-match-allowance-option-100'));
      const mas = screen.getByTestId('quick-match-mas-opciones');
      expect(mas.open).toBe(false);

      fireEvent.click(screen.getByTestId('scoring-format-option-STABLEFORD'));

      expect(mas.open).toBe(true);
      expect(pulsada('quick-match-allowance-option-95')).toBe(true);
    });

    it('R3: sin % a mano, cambiar de modalidad no abre nada', async () => {
      abre();
      await eligeCampo();
      fireEvent.click(screen.getByTestId('scoring-format-option-STABLEFORD'));
      expect(screen.getByTestId('quick-match-mas-opciones').open).toBe(false);
    });

    it('R4: al repetir, la barra copiada es la que viaja', async () => {
      mockListMine.mockResolvedValue({ quickMatches: [partidaEn('gc-1', [jugador('yo', 'WHITE', 'MALE')])] });
      abre({
        borrador: {
          paso: 1,
          avisos: [],
          inicial: {
            matchName: '', mode: 'FREE_PLAY', matchFormat: 'SINGLES', scoringFormat: 'STABLEFORD', allowanceOverride: null, playMode: 'HANDICAP',
            selectedCourse: { id: 'gc-1', name: 'gc-1' }, creatorTeeKey: 'YELLOW|FEMALE', participants: [], scorerIds: [],
          },
        },
      });
      await waitFor(() => expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled());

      await hastaElResumen();
      expect(peticion()).toMatchObject({ creatorTeeColor: 'YELLOW', creatorTeeGender: 'FEMALE' });
    });
  });

  describe('el nombre por defecto', () => {
    const hoy = (campo) => nombrePorDefecto(campo, new Date());
    const nombre = () => screen.getByTestId('quick-match-name-input').value;
    const cabecera = () => screen.getByTestId('quick-match-mas-opciones').querySelector('summary').textContent;
    const repite = (matchName, avisos = []) =>
      abre({
        borrador: {
          paso: 1,
          avisos,
          inicial: {
            matchName, mode: 'FREE_PLAY', matchFormat: 'SINGLES', scoringFormat: 'MEDAL', allowanceOverride: null, playMode: 'HANDICAP',
            selectedCourse: { id: 'gc-1', name: 'gc-1' }, creatorTeeKey: 'YELLOW|MALE', participants: [], scorerIds: [],
          },
        },
      });

    it('N3: al elegir campo, escrito, y viaja', async () => {
      abre();
      await eligeCampo('gc-1');
      expect(nombre()).toBe(hoy('gc-1'));
      await hastaElResumen();
      expect(peticion().name).toBe(hoy('gc-1'));
    });

    it('N4c: un campo sin nombre, sin nombre por defecto (y sin romperse)', async () => {
      abre({
        borrador: {
          paso: 1,
          avisos: [],
          inicial: {
            matchName: '', mode: 'FREE_PLAY', matchFormat: 'SINGLES', scoringFormat: 'MEDAL', allowanceOverride: null, playMode: 'HANDICAP',
            selectedCourse: { id: 'gc-1' }, creatorTeeKey: 'YELLOW|MALE', participants: [], scorerIds: [],
          },
        },
      });
      await waitFor(() => expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled());
      expect(nombre()).toBe('');
    });

    it('N4: sin campo, vacío', () => {
      abre();
      expect(nombre()).toBe('');
    });

    it('N4b: sigue al campo, el formato no lo toca, y no sale en la cabecera', async () => {
      abre();
      await eligeCampo('gc-1');
      fireEvent.click(screen.getByTestId('format-option-FOURBALL'));
      expect(nombre()).toBe(hoy('gc-1'));
      await eligeCampo('gc-2');
      expect(nombre()).toBe(hoy('gc-2'));
      expect(cabecera()).toBe('create.course.masOpciones');
    });

    it('N5: uno escrito se queda aunque cambie el campo, y sale en la cabecera', async () => {
      abre();
      await eligeCampo('gc-1');
      fireEvent.change(screen.getByTestId('quick-match-name-input'), { target: { value: 'Domingo' } });
      await eligeCampo('gc-2');
      expect(nombre()).toBe('Domingo');
      expect(cabecera()).toBe('create.course.masOpciones · Domingo');
      await hastaElResumen();
      expect(peticion().name).toBe('Domingo');
    });

    it('N6: vaciado, viaja el de por defecto', async () => {
      abre();
      await eligeCampo('gc-1');
      fireEvent.change(screen.getByTestId('quick-match-name-input'), { target: { value: '   ' } });
      await hastaElResumen();
      expect(peticion().name).toBe(hoy('gc-1'));
    });

    it('N7: al repetir una con nombre propio, se copia', async () => {
      repite('Liga de los martes');
      await waitFor(() => expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled());
      expect(nombre()).toBe('Liga de los martes');
    });

    it('N8: al repetir una con el de por defecto, el de hoy, y es el que viaja', async () => {
      repite('gc-1 · 28/10');
      await waitFor(() => expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled());
      expect(nombre()).toBe(hoy('gc-1'));
      await hastaElResumen();
      expect(peticion().name).toBe(hoy('gc-1'));
    });
  });

  describe('de la segunda revisión', () => {
    it('R5: al repetir con el aviso de elegir tu barra, no se marca ninguna', async () => {
      abre({
        borrador: {
          paso: 1,
          avisos: [{ tipo: 'barra', propia: true, color: 'BLACK', genero: 'MALE', paso: 1 }],
          inicial: {
            matchName: '', mode: 'FREE_PLAY', matchFormat: 'SINGLES', scoringFormat: 'MEDAL', allowanceOverride: null, playMode: 'HANDICAP',
            selectedCourse: { id: 'gc-1', name: 'gc-1' }, creatorTeeKey: '', participants: [], scorerIds: [],
          },
        },
      });
      await waitFor(() => expect(mockGetGolfCourse).toHaveBeenCalled());
      await act(() => new Promise((r) => setTimeout(r, 50)));

      expect(screen.getAllByTestId(/^quick-match-creator-tee-option-/).some((b) => b.getAttribute('aria-pressed') === 'true')).toBe(false);
    });

    it('R5: el aviso de la barra de otro jugador no impide sugerir la tuya', async () => {
      abre({
        borrador: {
          paso: 1,
          avisos: [{ tipo: 'barra', propia: false, nombre: 'Ana', color: 'BLACK', genero: 'FEMALE', paso: 2 }],
          inicial: {
            matchName: '', mode: 'FREE_PLAY', matchFormat: 'SINGLES', scoringFormat: 'MEDAL', allowanceOverride: null, playMode: 'HANDICAP',
            selectedCourse: { id: 'gc-1', name: 'gc-1' }, creatorTeeKey: '', participants: [], scorerIds: [],
          },
        },
      });

      await waitFor(() => expect(pulsada('quick-match-creator-tee-option-YELLOW|MALE')).toBe(true));
    });

    it('R6: elegir a mano el % que ya es el de por defecto no cuenta como a mano', async () => {
      abre();
      await eligeCampo();
      fireEvent.click(screen.getByTestId('quick-match-allowance-option-100'));
      expect(screen.getByTestId('quick-match-mas-opciones').querySelector('summary').textContent).toBe('create.course.masOpciones');
    });

    it('R7: «Otras» dice si su panel está abierto', async () => {
      abre();
      await eligeCampo();
      const otras = screen.getByTestId('quick-match-creator-tee-otras');
      expect(otras.getAttribute('aria-expanded')).toBe('false');
      fireEvent.click(otras);
      expect(otras.getAttribute('aria-expanded')).toBe('true');
    });
  });

  describe('de /code-review', () => {
    it('C1: el error de elegir tu barra se va cuando se marca sola', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true, advanceTimeDelta: 1 });
      const lista = { promesa: new Promise(() => {}) };
      mockListMine.mockReturnValue(lista.promesa);
      abre();
      await eligeCampo();
      fireEvent.click(screen.getByTestId('quick-match-course-next'));
      expect(screen.getByText('create.course.errorTeeRequired')).toBeInTheDocument();

      await act(() => vi.advanceTimersByTimeAsync(2000));

      await waitFor(() => expect(pulsada('quick-match-creator-tee-option-YELLOW|MALE')).toBe(true));
      expect(screen.queryByText('create.course.errorTeeRequired')).not.toBeInTheDocument();
      vi.useRealTimers();
    });

    it('K5 (pasada del Kind): el error de elegir tu barra se va al elegirla a mano', async () => {
      mockGetGolfCourse.mockResolvedValue({ tees: [tee('GREEN', null)], isFromRfeg: () => false });
      abre();
      await eligeCampo();
      fireEvent.click(screen.getByTestId('quick-match-course-next'));
      expect(screen.getByText('create.course.errorTeeRequired')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('quick-match-creator-tee-option-GREEN|'));

      expect(screen.queryByText('create.course.errorTeeRequired')).not.toBeInTheDocument();
    });

    it('K2 (pasada del Kind): al crear, los anotadores elegidos siguen tras volver al paso 2 sin cambiar a nadie', async () => {
      abre();
      await eligeCampo();
      fireEvent.click(screen.getByTestId('scoring-format-option-STABLEFORD'));
      fireEvent.click(screen.getByTestId('quick-match-course-next'));
      fireEvent.click(await screen.findByTestId('quick-match-add-friend-f-1'));
      fireEvent.click(await screen.findByTestId('quick-match-tee-panel-option-RED|FEMALE'));
      fireEvent.click(screen.getByTestId('quick-match-participants-next'));
      fireEvent.click(screen.getByRole('checkbox', { name: 'Ana' }));
      fireEvent.click(screen.getByTestId('quick-match-scorers-back'));
      fireEvent.click(screen.getByTestId('quick-match-participants-next'));

      expect(screen.getByRole('checkbox', { name: 'Ana' })).toBeChecked();
    });

    it('C2: al repetir, un nombre propio con la forma de uno de por defecto se copia', async () => {
      abre({
        borrador: {
          paso: 1,
          avisos: [],
          inicial: {
            matchName: 'Liga del club · 12/10', mode: 'FREE_PLAY', matchFormat: 'SINGLES', scoringFormat: 'MEDAL', allowanceOverride: null, playMode: 'HANDICAP',
            selectedCourse: { id: 'gc-1', name: 'gc-1' }, creatorTeeKey: 'YELLOW|MALE', participants: [], scorerIds: [],
          },
        },
      });
      await waitFor(() => expect(screen.getByTestId('quick-match-course-next')).not.toBeDisabled());
      expect(screen.getByTestId('quick-match-name-input').value).toBe('Liga del club · 12/10');
    });

    it('C3: un % a mano que pasa a ser el de por defecto no sale en la cabecera', async () => {
      abre();
      await eligeCampo();
      fireEvent.click(screen.getByTestId('format-option-FOURBALL'));
      fireEvent.click(screen.getByTestId('quick-match-allowance-option-100'));
      const cabecera = () => screen.getByTestId('quick-match-mas-opciones').querySelector('summary').textContent;
      expect(cabecera()).toContain('100%');

      fireEvent.click(screen.getByTestId('format-option-SINGLES'));

      expect(cabecera()).toBe('create.course.masOpciones');
    });

    it('C4: la cabecera parte un nombre largo sin espacios', async () => {
      abre();
      fireEvent.change(screen.getByTestId('quick-match-name-input'), { target: { value: 'x'.repeat(100) } });
      const resumen = screen.getByTestId('quick-match-mas-opciones').querySelector('summary span');
      expect(resumen.className).toMatch(/wrap-anywhere/);
    });
  });
});
