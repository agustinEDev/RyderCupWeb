import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

import GolfCourseDetailModal from './GolfCourseDetailModal';
import GolfCourse from '../../domain/entities/GolfCourse';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => (params && !('defaultValue' in params) ? `${key}:${JSON.stringify(params)}` : key),
    i18n: { language: 'es' },
  }),
}));

vi.mock('../../utils/countryUtils', () => ({
  CountryFlag: ({ countryCode }) => <span data-testid="bandera">{countryCode}</span>,
}));

/**
 * El ojo de la tabla solo sacaba un aviso de «próximamente». Este es el detalle
 * que lo sustituye, y lo que tiene que enseñar es justo lo que el formulario de
 * edición no sabe: la ubicación y la tarjeta de cada salida con sus metros.
 * Ver #586.
 */
describe('GolfCourseDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // En camelCase: una tarjeta que se mete directamente en `tee.holes` no pasa
  // por `Tee.fromDTO`, que es quien traduce las claves de la API
  const tarjetaYaMapeada = ({ conMetros = true, parDelNueve = 4 } = {}) =>
    Array.from({ length: 18 }, (_, i) => ({
      holeNumber: i + 1,
      par: i === 8 ? parDelNueve : 4,
      strokeIndex: i + 1,
      meters: conMetros ? 300 : null,
    }));

  const tarjeta = ({ conMetros = true, parDelNueve = 4 } = {}) =>
    Array.from({ length: 18 }, (_, i) => ({
      hole_number: i + 1,
      par: i === 8 ? parDelNueve : 4,
      stroke_index: i + 1,
      ...(conMetros ? { meters: 300 } : {}),
    }));

  const campo = (extra = {}) =>
    new GolfCourse({
      id: 'c1',
      name: 'La Marquesa',
      country_code: 'ES',
      course_type: 'STANDARD_18',
      approval_status: 'APPROVED',
      total_par: 72,
      holes: tarjeta({ conMetros: false }),
      tees: [
        { color: 'WHITE', tee_gender: 'MALE', course_rating: 71.2, slope_rating: 128, holes: tarjeta({ parDelNueve: 6 }) },
        { color: 'YELLOW', tee_gender: 'FEMALE', course_rating: 69.0, slope_rating: 120, holes: tarjeta() },
      ],
      ...extra,
    });

  const abrir = (curso = campo()) => {
    const onClose = vi.fn();
    render(<GolfCourseDetailModal course={curso} onClose={onClose} />);
    return onClose;
  };

  const tablaTarjeta = () => screen.getByRole('table');
  const filaDelHoyo = (numero) => {
    const celda = within(tablaTarjeta()).getAllByRole('cell').find(c => c.textContent === String(numero));
    return celda.closest('tr');
  };

  describe('datos generales', () => {
    it('enseña el nombre, el país, el tipo, el par y el estado', () => {
      abrir();

      expect(screen.getByRole('heading', { name: 'La Marquesa' })).toBeInTheDocument();
      expect(screen.getByTestId('bandera')).toHaveTextContent('ES');
      expect(screen.getByText('form.courseTypes.STANDARD_18')).toBeInTheDocument();
      expect(screen.getByText('72')).toBeInTheDocument();
      expect(screen.getByText('table.statuses.APPROVED')).toBeInTheDocument();
    });

    it('cierra tanto por el aspa como por el botón del pie', () => {
      const onClose = abrir();
      const cerrar = screen.getAllByRole('button', { name: 'detail.close' });

      expect(cerrar).toHaveLength(2);

      cerrar.forEach(boton => fireEvent.click(boton));

      expect(onClose).toHaveBeenCalledTimes(2);
    });
  });

  describe('ubicación', () => {
    it('la enseña cuando el campo la tiene', () => {
      abrir(campo({
        location: { latitude: 38.08, longitude: -0.71, address: 'Ctra. San Miguel', city: 'Rojales', province: 'Alicante' },
      }));

      expect(screen.getByText('detail.location')).toBeInTheDocument();
      expect(screen.getByText('Ctra. San Miguel')).toBeInTheDocument();
      expect(screen.getByText('Rojales')).toBeInTheDocument();
      expect(screen.getByText('Alicante')).toBeInTheDocument();
      expect(screen.getByText('38.08, -0.71')).toBeInTheDocument();
    });

    // Una sección vacía se lee como un dato que se ha perdido
    it('no enseña la sección cuando el campo no tiene ubicación', () => {
      abrir();

      expect(screen.queryByText('detail.location')).toBeNull();
    });

    it('no enseña la sección cuando la ubicación viene entera a null', () => {
      abrir(campo({ location: { latitude: null, longitude: null, address: null, city: null, province: null } }));

      expect(screen.queryByText('detail.location')).toBeNull();
    });

    // La condición de la sección y las de cada fila son la MISMA regla, en la
    // entidad: con dos reglas escritas aparte, media coordenada sacaba el
    // título sobre una lista vacía
    it('no enseña la sección con una coordenada suelta', () => {
      abrir(campo({ location: { latitude: 38.08, longitude: null, address: null, city: null, province: null } }));

      expect(screen.queryByText('detail.location')).toBeNull();
    });

    it('enseña solo lo que hay: dirección sin coordenadas', () => {
      abrir(campo({ location: { address: 'Ctra. San Miguel', city: null, province: null, latitude: null, longitude: null } }));

      expect(screen.getByText('Ctra. San Miguel')).toBeInTheDocument();
      expect(screen.queryByText('detail.coordinates')).toBeNull();
    });
  });

  describe('salidas', () => {
    it('lista cada salida con su valoración', () => {
      abrir();

      expect(screen.getByText('detail.tees:{"count":2}')).toBeInTheDocument();
      expect(screen.getByText(/71\.2/)).toBeInTheDocument();
      expect(screen.getByText(/128/)).toBeInTheDocument();
    });
  });

  describe('tarjeta por salida', () => {
    it('arranca con la tarjeta de la primera salida, con sus metros', () => {
      abrir();

      const fila = filaDelHoyo(9);
      expect(within(fila).getByText('6')).toBeInTheDocument();
      expect(within(fila).getByText('300')).toBeInTheDocument();
    });

    it('cambiar de salida cambia la tarjeta', () => {
      abrir();

      expect(within(filaDelHoyo(9)).getByText('6')).toBeInTheDocument();

      fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });

      // La segunda salida tiene el hoyo 9 en par 4, no en 6
      const fila = filaDelHoyo(9);
      expect(within(fila).queryByText('6')).toBeNull();
      expect(within(fila).getAllByText('4').length).toBeGreaterThan(0);
    });

    it('no ofrece selector cuando el campo tiene una sola salida', () => {
      const curso = campo();
      curso.tees = [curso.tees[0]];
      abrir(curso);

      expect(screen.queryByRole('combobox')).toBeNull();
    });

    it('avisa cuando la salida no tiene tarjeta propia y enseña la del campo', () => {
      const curso = campo();
      curso.tees = [{ ...curso.tees[0], holes: [] }];
      abrir(curso);

      expect(screen.getByText('detail.inheritedCard')).toBeInTheDocument();
    });

    // Un hoyo sin distancia se deja VACÍO. Un cero se leería como una distancia
    it('deja la celda de metros vacía cuando el hoyo no los tiene', () => {
      const curso = campo();
      curso.tees = [{ ...curso.tees[0], holes: tarjetaYaMapeada({ conMetros: false }) }];
      abrir(curso);

      const celdas = within(filaDelHoyo(9)).getAllByRole('cell');
      expect(celdas[3].textContent).toBe('');
    });

    it('suma el par de la tarjeta que se está viendo', () => {
      abrir();

      // 17 hoyos de par 4 más el 9, que es par 6
      expect(screen.getByText('74')).toBeInTheDocument();
    });

    it('suma los metros solo si están todos', () => {
      abrir();
      expect(screen.getByText('5400')).toBeInTheDocument();
    });

    it('no suma metros a medias', () => {
      const curso = campo();
      const media = tarjetaYaMapeada();
      media[0].meters = null;
      curso.tees = [{ ...curso.tees[0], holes: media }];
      abrir(curso);

      expect(screen.queryByText('5100')).toBeNull();
    });
  });
});
