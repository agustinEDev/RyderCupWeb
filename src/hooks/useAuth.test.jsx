import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

/**
 * Lo que este hook dejó de hacer (FE #489): su propia petición. Veinte ficheros
 * lo llaman, así que cada uno abría la suya y un arranque pedía
 * `/current-user` cuatro veces antes de que el panel pidiera su primer dato.
 */
const peticiones = [];
/** Puesto a una función, la siguiente respuesta se queda esperando a que se la
 *  suelte: es la única forma de mirar el estado a mitad de un refresco. */
const retenida = { soltar: null };

vi.mock('../utils/tokenRefreshInterceptor', () => ({
  fetchWithTokenRefresh: (url) => {
    peticiones.push(url);
    const buena = { ok: true, status: 200, json: async () => ({ id: 'u-1', first_name: 'Agustin' }) };
    if (retenida.soltar === 'siguiente') {
      return new Promise((resuelve) => { retenida.soltar = () => resuelve(buena); });
    }
    return Promise.resolve(buena);
  },
}));

vi.mock('../utils/deviceRevocationLogout', () => ({
  isDeviceRevoked: () => false,
  handleDeviceRevocationLogout: vi.fn(),
  clearDeviceRevocationFlag: vi.fn(),
}));

const { reiniciaLaSesionCompartida, consultaLaSesion } = await import('../services/sesionCompartida');
const { useAuth } = await import('./useAuth');

const Pantalla = ({ nombre }) => {
  const { user, loading } = useAuth();
  return <div data-testid={nombre}>{loading ? 'cargando' : (user?.first_name ?? 'sin sesion')}</div>;
};

/** Lo que mira el guardia de rol: si puede fiarse de lo que se le enseña. */
const Guardia = () => {
  const { sinConfirmar } = useAuth();
  return <div data-testid="guardia-rol">{sinConfirmar ? 'sin confirmar' : 'confirmada'}</div>;
};

describe('useAuth', () => {
  beforeEach(() => {
    reiniciaLaSesionCompartida();
    peticiones.length = 0;
  });

  it('tres pantallas a la vez son UNA sola petición', async () => {
    // El arranque de verdad: el guardia de rutas, el panel y la barra inferior
    render(
      <>
        <Pantalla nombre="guardia" />
        <Pantalla nombre="panel" />
        <Pantalla nombre="barra" />
      </>
    );

    await waitFor(() => expect(screen.getByTestId('panel')).toHaveTextContent('Agustin'));

    expect(peticiones).toHaveLength(1);
    expect(screen.getByTestId('guardia')).toHaveTextContent('Agustin');
    expect(screen.getByTestId('barra')).toHaveTextContent('Agustin');
  });

  it('quien monta despues ya nace con el usuario puesto', async () => {
    // Y no con `loading` en alto: eso es lo que hacia que el panel se diera por
    // cargado en el render en que llegaba el usuario, con las peticiones sin
    // salir todavia (FE #485)
    const { rerender } = render(<Pantalla nombre="primera" />);
    await waitFor(() => expect(screen.getByTestId('primera')).toHaveTextContent('Agustin'));

    rerender(
      <>
        <Pantalla nombre="primera" />
        <Pantalla nombre="tardia" />
      </>
    );

    expect(screen.getByTestId('tardia')).toHaveTextContent('Agustin');
    expect(peticiones).toHaveLength(1);
  });

  it('sigue diciendo que carga mientras no se sabe', () => {
    render(<Pantalla nombre="sola" />);

    expect(screen.getByTestId('sola')).toHaveTextContent('cargando');
  });
  it('un refresco corriente no deja la sesión como sin confirmar', async () => {
    // `sinConfirmar` sale de su propio campo y no de `refrescando`, que también
    // se levanta refrescando una sesión buena: deducirlo de ahí bloqueaba la
    // pantalla del guardia de rol en cada `refetch` (FE #529)
    render(<Guardia />);
    await waitFor(() => expect(screen.getByTestId('guardia-rol')).toHaveTextContent('confirmada'));

    // A mitad del refresco, que es cuando `refrescando` está arriba
    retenida.soltar = 'siguiente';
    let enCurso;
    await act(async () => { enCurso = consultaLaSesion({ forzar: true }); });

    expect(screen.getByTestId('guardia-rol')).toHaveTextContent('confirmada');

    await act(async () => { retenida.soltar(); await enCurso; });
    retenida.soltar = null;

    expect(screen.getByTestId('guardia-rol')).toHaveTextContent('confirmada');
  });
});
