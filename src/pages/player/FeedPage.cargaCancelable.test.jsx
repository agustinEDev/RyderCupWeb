import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import feedEs from '../../i18n/locales/es/feed.json';
import feedEn from '../../i18n/locales/en/feed.json';
import commonEs from '../../i18n/locales/es/common.json';
import commonEn from '../../i18n/locales/en/common.json';
import FeedPage from './FeedPage';

/**
 * La primera carga de Actividad descarta lo que llega tarde (T2).
 *
 *   #     caso                                                   | qué pasa
 *   ------|--------------------------------------------------------|-----------------------------------
 *   T2-1  la primera falla y se pulsa «Reintentar»               | una espera, el feed, sin un segundo aviso
 *   T2-2  cambia el usuario con la primera en vuelo              | la vieja ni se pinta ni avisa
 *   T2-3  cambia el idioma con el feed ya cargado                | no se vuelve a pedir
 *   T2-20 «Cargar más» en vuelo y cambia el usuario           | lo del anterior no se mezcla en el feed nuevo
 *   T2-21 recarga de fondo en vuelo y cambia el usuario        | ni se mezcla ni se da por visto en su cuenta
 *   N1    el número de novedades se vuelve a fijar igual           | no se recarga (solo al cambiar)
 */
const mockSesion = vi.hoisted(() => ({ user: { id: 'me' } }));
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockSesion.user, loading: false }),
}));
vi.mock('../../components/layout/HeaderAuth', () => ({
  default: () => <header data-testid="header" />,
}));
vi.mock('../../components/ui/Avatar', () => ({
  default: ({ userId }) => <div data-testid={`avatar-${userId}`} />,
}));
// El número de Actividad, como pieza que avisa a quien escucha cada vez que se
// fija, aunque sea el mismo
const mockNovedades = vi.hoisted(() => {
  let valor = 0;
  const oyentes = new Set();
  return {
    lee: () => valor,
    fija: (n) => {
      valor = n;
      oyentes.forEach((f) => f());
    },
    suscribe: (f) => {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
  };
});
vi.mock('../../hooks/useNovedadesDeActividad', async () => {
  const { useSyncExternalStore } = await import('react');
  return {
    ponLasNovedadesACero: () => {},
    useNovedadesDeActividad: () => useSyncExternalStore(mockNovedades.suscribe, mockNovedades.lee),
    leeLasNovedades: () => mockNovedades.lee(),
    suscribeALasNovedades: (f) => mockNovedades.suscribe(f),
  };
});
const toastError = vi.fn();
vi.mock('../../utils/toast', () => ({
  default: { error: (...a) => toastError(...a), success: vi.fn() },
}));
const getFeed = vi.fn();
const markSeen = vi.fn(() => Promise.resolve());
vi.mock('../../composition', () => ({
  getFriendsFeedUseCase: { execute: (...args) => getFeed(...args) },
  markFeedAsSeenUseCase: { execute: () => markSeen() },
  respondFriendRequestUseCase: { execute: () => Promise.resolve({}) },
}));

let i18n;
beforeAll(async () => {
  i18n = i18next.createInstance();
  await i18n.use(initReactI18next).init({
    lng: 'es',
    fallbackLng: 'es',
    ns: ['feed', 'common'],
    defaultNS: 'feed',
    resources: { es: { feed: feedEs, common: commonEs }, en: { feed: feedEn, common: commonEn } },
    interpolation: { escapeValue: false },
  });
});

const aMano = () => {
  let resolver;
  let rechazar;
  const promesa = new Promise((res, rej) => {
    resolver = res;
    rechazar = rej;
  });
  return { promesa, resolver, rechazar };
};

const pagina = (id, nextCursor = null) => ({
  events: [
    {
      id,
      userId: 'u1',
      type: 'BIRDIE',
      occurredAt: new Date(),
      publishedAt: new Date(),
      payload: { count: 1, holes: [1] },
      sourceMatchId: 'm1',
      groupKey: null,
    },
  ],
  authors: { u1: { id: 'u1', firstName: 'Ana', lastName: 'García' } },
  courses: {},
  nextCursor,
  unseenCount: 0,
  pendingFriendRequests: [],
});

const arbol = () => (
  <I18nextProvider i18n={i18n}>
    <MemoryRouter initialEntries={['/feed']}>
      <FeedPage />
    </MemoryRouter>
  </I18nextProvider>
);

describe('FeedPage: la primera carga descarta lo que llega tarde (T2)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockSesion.user = { id: 'me' };
    mockNovedades.fija(0);
    markSeen.mockImplementation(() => Promise.resolve());
    await i18n.changeLanguage('es');
  });

  it('T2-1: falla, «Reintentar» → una sola espera, el feed y ningún aviso más', async () => {
    // Given la primera carga falla
    const reintento = aMano();
    getFeed.mockRejectedValueOnce(new Error('500')).mockReturnValueOnce(reintento.promesa);
    render(arbol());
    const boton = await screen.findByRole('button', { name: 'Reintentar' });
    expect(toastError).toHaveBeenCalledTimes(1);

    // When se reintenta
    fireEvent.click(boton);

    // Then espera (una vez) y luego el feed, sin otro aviso
    expect(screen.getAllByRole('status')).toHaveLength(1);
    await act(async () => reintento.resolver(pagina('e1')));
    expect(await screen.findByTestId('activity-event-e1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(getFeed).toHaveBeenCalledTimes(2);
  });

  it('T2-2: si cambia el usuario con la primera en vuelo, la vieja ni se pinta ni avisa', async () => {
    // Given la carga del primer usuario en vuelo
    const vieja = aMano();
    const nueva = aMano();
    getFeed.mockReturnValueOnce(vieja.promesa).mockReturnValueOnce(nueva.promesa);
    const { rerender } = render(arbol());

    // When cambia el usuario y la vieja llega (y otra vez, fallando) después
    mockSesion.user = { id: 'otro' };
    rerender(arbol());
    expect(getFeed).toHaveBeenCalledTimes(2);
    await act(async () => vieja.resolver(pagina('del-primero')));

    // Then no se pinta; se sigue esperando a la del nuevo
    expect(screen.queryByTestId('activity-event-del-primero')).not.toBeInTheDocument();
    await act(async () => nueva.resolver(pagina('del-segundo')));
    expect(await screen.findByTestId('activity-event-del-segundo')).toBeInTheDocument();
    expect(screen.queryByTestId('activity-event-del-primero')).not.toBeInTheDocument();
  });

  it('T2-2: el fallo de la carga de otro usuario no avisa', async () => {
    const vieja = aMano();
    getFeed.mockReturnValueOnce(vieja.promesa).mockResolvedValueOnce(pagina('del-segundo'));
    const { rerender } = render(arbol());

    mockSesion.user = { id: 'otro' };
    rerender(arbol());
    await screen.findByTestId('activity-event-del-segundo');
    await act(async () => vieja.rechazar(new Error('tarde')));

    expect(toastError).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  });

  it('T2-20: con «Cargar más» en vuelo cambia el usuario: su página no se mezcla en el feed del nuevo', async () => {
    // Given el feed del primero, con «Cargar más» pedido
    const mas = aMano();
    getFeed
      .mockResolvedValueOnce(pagina('del-primero', 'c1'))
      .mockReturnValueOnce(mas.promesa)
      .mockResolvedValueOnce(pagina('del-segundo'));
    const { rerender } = render(arbol());
    fireEvent.click(await screen.findByRole('button', { name: 'Cargar más' }));
    expect(getFeed).toHaveBeenLastCalledWith({ limit: 20, cursor: 'c1' });

    // When cambia el usuario, llega su feed y después la página del anterior
    mockSesion.user = { id: 'otro' };
    rerender(arbol());
    await screen.findByTestId('activity-event-del-segundo');
    await act(async () => mas.resolver(pagina('mas-del-primero')));

    // Then en el feed del nuevo no entra nada del anterior
    expect(screen.queryByTestId('activity-event-mas-del-primero')).not.toBeInTheDocument();
    expect(screen.getByTestId('activity-event-del-segundo')).toBeInTheDocument();
  });

  it('T2-20: el fallo de ese «Cargar más» tampoco avisa en el feed del nuevo', async () => {
    const mas = aMano();
    getFeed
      .mockResolvedValueOnce(pagina('del-primero', 'c1'))
      .mockReturnValueOnce(mas.promesa)
      .mockResolvedValueOnce(pagina('del-segundo'));
    const { rerender } = render(arbol());
    fireEvent.click(await screen.findByRole('button', { name: 'Cargar más' }));

    mockSesion.user = { id: 'otro' };
    rerender(arbol());
    await screen.findByTestId('activity-event-del-segundo');
    await act(async () => mas.rechazar(new Error('500')));

    expect(toastError).not.toHaveBeenCalled();
  });

  it('T2-21: con la recarga de fondo en vuelo cambia el usuario: ni se mezcla ni se da por visto', async () => {
    // Given el feed del primero ya visto, y una recarga de fondo pedida
    const recarga = aMano();
    getFeed
      .mockResolvedValueOnce(pagina('del-primero'))
      .mockReturnValueOnce(recarga.promesa)
      .mockResolvedValueOnce(pagina('del-segundo'));
    const { rerender } = render(arbol());
    await screen.findByTestId('activity-event-del-primero');
    await act(async () => {});
    expect(markSeen).toHaveBeenCalledTimes(1);
    act(() => mockNovedades.fija(2));
    expect(getFeed).toHaveBeenCalledTimes(2);

    // When cambia el usuario, llega su feed y después la recarga del anterior
    mockSesion.user = { id: 'otro' };
    rerender(arbol());
    await screen.findByTestId('activity-event-del-segundo');
    await act(async () => recarga.resolver(pagina('recarga-del-primero')));
    await act(async () => {});

    // Then ni entra en el feed del nuevo ni se marca como visto por ella
    expect(screen.queryByTestId('activity-event-recarga-del-primero')).not.toBeInTheDocument();
    expect(markSeen).toHaveBeenCalledTimes(1);
  });

  it('N1: volver a fijar el mismo número de novedades no recarga; cambiarlo sí', async () => {
    getFeed.mockResolvedValue(pagina('e1'));
    render(arbol());
    await screen.findByTestId('activity-event-e1');
    act(() => mockNovedades.fija(2));
    await act(async () => {});
    expect(getFeed).toHaveBeenCalledTimes(2);

    act(() => mockNovedades.fija(2));
    await act(async () => {});
    expect(getFeed).toHaveBeenCalledTimes(2);

    act(() => mockNovedades.fija(3));
    await act(async () => {});
    expect(getFeed).toHaveBeenCalledTimes(3);
  });

  it('T2-3: cambiar de idioma con el feed cargado no lo vuelve a pedir', async () => {
    getFeed.mockResolvedValue(pagina('e1'));
    render(arbol());
    await screen.findByTestId('activity-event-e1');

    await act(async () => {
      await i18n.changeLanguage('en');
    });
    await act(async () => {});

    expect(getFeed).toHaveBeenCalledTimes(1);
  });
});
