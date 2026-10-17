import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';

/**
 * «Todos los campos» de la sección Hoyos (17 oct, entrega 4). Casos T2–T9
 * aprobados en el chat.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, o) => (o ? `${k} ${JSON.stringify(o)}` : k) }),
}));
vi.mock('../../../hooks/useAuth', () => ({ useAuth: () => ({ user: USUARIO, loading: false }) }));
const { USUARIO } = vi.hoisted(() => ({ USUARIO: { id: 'a-1', is_admin: true, country_code: 'PT' } }));

const buscador = vi.hoisted(() => ({ props: null }));
vi.mock('../../golf_course/GolfCourseSearchBox', () => ({
  default: (props) => {
    buscador.props = props;
    return <button type="button" onClick={() => props.onCourseSelect({ id: 'gc-1', name: 'Alcanada' })}>elegir campo</button>;
  },
}));
const revision = vi.hoisted(() => ({ props: null }));
vi.mock('./RevisarHoyo', () => ({
  default: (props) => {
    revision.props = props;
    return <div data-testid="revisar-hoyo" />;
  },
}));
const casos = vi.hoisted(() => ({ campo: vi.fn() }));
vi.mock('../../../composition', () => ({ getHoleReviewUseCase: { execute: casos.campo } }));

const { default: TodosLosCampos } = await import('./TodosLosCampos');

const T = { lat: 36.28, lon: -5.33 };
const LINEA = { tee: T, bends: [], greenCenter: T };
const hoyo = (holeNumber, extra = {}) => ({ holeNumber, guardada: null, osm: null, muestras: [], barras: [], ...extra });
const CAMPO = {
  golfCourseId: 'gc-1',
  name: 'Alcanada',
  ubicacion: T,
  holes: [
    hoyo(1, { guardada: LINEA, osm: { puntos: [T, T], green: T }, muestras: [{ id: 's' }] }),
    hoyo(2, { osm: { puntos: [T, T], green: T }, muestras: [{ id: 's' }] }),
    hoyo(3, { muestras: [{ id: 's1' }, { id: 's2' }] }),
    ...Array.from({ length: 15 }, (_, i) => hoyo(i + 4)),
  ],
};

const DondeEstoy = () => {
  const { pathname, search } = useLocation();
  return <p data-testid="ruta">{pathname + search}</p>;
};
const abrir = (ruta = '/admin/hoyos?ver=campos') =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/admin/:seccion" element={<TodosLosCampos />} />
      </Routes>
      <DondeEstoy />
    </MemoryRouter>,
  );

describe('TodosLosCampos', () => {
  beforeEach(() => {
    casos.campo.mockReset();
    casos.campo.mockResolvedValue(CAMPO);
    buscador.props = null;
    revision.props = null;
  });

  it('T2: empieza con el buscador de campos de la app, en cualquier país', () => {
    abrir();

    expect(buscador.props).toMatchObject({ countryCode: 'PT', allowOtherCountries: true, selectedCourse: null });
    expect(casos.campo).not.toHaveBeenCalled();
  });

  it('T3/T6: elegir un campo lo pone en la URL y enseña sus 18 hoyos', async () => {
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'elegir campo' }));

    expect(screen.getByTestId('ruta')).toHaveTextContent('/admin/hoyos?ver=campos&campo=gc-1');
    const campo = await screen.findByRole('region', { name: 'Alcanada' });
    expect(casos.campo).toHaveBeenCalledWith('gc-1');
    expect(within(campo).getAllByRole('button', { name: /allCourses.hole/ })).toHaveLength(18);
  });

  it('T4: cada hoyo dice cómo está: guardado, de OSM, sus muestras o sin datos (manda el primero)', async () => {
    abrir('/admin/hoyos?ver=campos&campo=gc-1');
    const filas = within(await screen.findByRole('region', { name: 'Alcanada' })).getAllByRole('button', { name: /allCourses.hole/ });

    expect(filas.slice(0, 4).map((f) => f.textContent)).toEqual([
      'allCourses.hole {"numero":1}allCourses.saved',
      'allCourses.hole {"numero":2}allCourses.osm',
      'allCourses.hole {"numero":3}holeReviews.samples {"count":2}',
      'allCourses.hole {"numero":4}allCourses.empty',
    ]);
    for (const fila of filas) expect(fila).toHaveClass('w-full');
  });

  it('T5: tocar un hoyo abre la misma revisión de siempre', async () => {
    abrir('/admin/hoyos?ver=campos&campo=gc-1');
    fireEvent.click(await screen.findByRole('button', { name: /allCourses.hole {"numero":2}/ }));

    expect(screen.getByTestId('revisar-hoyo')).toBeInTheDocument();
    expect(revision.props).toMatchObject({ golfCourseId: 'gc-1', nombre: 'Alcanada', numeroDeHoyo: 2 });
  });

  it('T9: al cerrar la revisión tras un cambio, el campo se vuelve a pedir; sin cambio, no', async () => {
    abrir('/admin/hoyos?ver=campos&campo=gc-1');
    fireEvent.click(await screen.findByRole('button', { name: /allCourses.hole {"numero":2}/ }));
    await act(async () => revision.props.onCerrar({ cambiado: false }));
    expect(casos.campo).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('revisar-hoyo')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /allCourses.hole {"numero":2}/ }));
    casos.campo.mockResolvedValue({ ...CAMPO, holes: CAMPO.holes.map((h) => (h.holeNumber === 2 ? { ...h, guardada: LINEA } : h)) });
    await act(async () => revision.props.onCerrar({ cambiado: true, guardado: true }));

    expect(casos.campo).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: /allCourses.hole {"numero":2}/ })).toHaveTextContent('allCourses.saved');
  });

  it('T6: «Cambiar de campo» vuelve al buscador y quita el campo de la URL', async () => {
    abrir('/admin/hoyos?ver=campos&campo=gc-1');
    fireEvent.click(await screen.findByRole('button', { name: 'allCourses.changeCourse' }));

    expect(screen.getByTestId('ruta')).toHaveTextContent(/^\/admin\/hoyos\?ver=campos$/);
    expect(screen.getByRole('button', { name: 'elegir campo' })).toBeInTheDocument();
  });

  it('un campo que no se puede cargar lo dice, y se puede cambiar de campo', async () => {
    casos.campo.mockRejectedValue(new Error('404'));
    abrir('/admin/hoyos?ver=campos&campo=gc-x');

    expect(await screen.findByText('allCourses.error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'allCourses.changeCourse' })).toBeInTheDocument();
  });
  it('si dos recargas del campo se cruzan, manda la última que se pidió', async () => {
    const guardado2 = { ...CAMPO, holes: CAMPO.holes.map((h) => (h.holeNumber === 2 ? { ...h, guardada: LINEA } : h)) };
    let primera;
    casos.campo.mockResolvedValueOnce(CAMPO);
    casos.campo.mockReturnValueOnce(new Promise((ok) => { primera = ok; }));
    casos.campo.mockResolvedValueOnce(guardado2);
    abrir('/admin/hoyos?ver=campos&campo=gc-1');
    const hoyo2 = () => screen.getByRole('button', { name: /allCourses.hole {"numero":2}/ });
    await screen.findByRole('region', { name: 'Alcanada' });

    fireEvent.click(hoyo2());
    await act(async () => revision.props.onCerrar({ cambiado: true }));
    fireEvent.click(hoyo2());
    await act(async () => revision.props.onCerrar({ cambiado: true }));
    await act(async () => primera(CAMPO));

    expect(hoyo2()).toHaveTextContent('allCourses.saved');
  });
});
