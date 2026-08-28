// src/components/golf_course/GolfCourseSearchBox.test.jsx

import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GolfCourseSearchBox from './GolfCourseSearchBox';

// Se imita lo que hace i18next de verdad: si hay defaultValue, se usa y se le
// interpolan las variables. Sin eso, un texto con variables no se puede afirmar
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallbackOrOptions) => {
      if (typeof fallbackOrOptions === 'string') return fallbackOrOptions;
      if (fallbackOrOptions?.defaultValue) {
        return Object.entries(fallbackOrOptions).reduce(
          (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)),
          fallbackOrOptions.defaultValue
        );
      }
      return key;
    },
    i18n: { language: 'es' },
  }),
}));

const mockList = vi.fn();

vi.mock('../../composition', () => ({
  listGolfCoursesUseCase: { execute: (...args) => mockList(...args) },
}));

const course = (id, name) => ({
  id,
  name,
  courseType: 'STANDARD_18',
  tees: [{ color: 'YELLOW' }, { color: 'RED' }],
});

const renderBox = (props = {}) =>
  render(
    <GolfCourseSearchBox
      countryCode="ES"
      selectedCourse={null}
      onCourseSelect={vi.fn()}
      onRequestNewCourse={vi.fn()}
      {...props}
    />
  );

// El buscador es controlado: quien lo usa decide qué campo hay elegido. Con un
// espía suelto como `onCourseSelect` el prop nunca cambia y no se puede afirmar
// lo que acaba viéndose en la casilla, que es justo lo que se rompía
const ControlledBox = ({ initialCourse = null, onCourseSelect }) => {
  const [selectedCourse, setSelectedCourse] = useState(initialCourse);

  return (
    <GolfCourseSearchBox
      countryCode="ES"
      selectedCourse={selectedCourse}
      onCourseSelect={(course) => {
        setSelectedCourse(course);
        onCourseSelect(course);
      }}
      onRequestNewCourse={vi.fn()}
    />
  );
};

const renderControlledBox = (props) => render(<ControlledBox {...props} />);

describe('GolfCourseSearchBox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ courses: [course('1', 'Real Club de Golf')], total: 1 });
  });

  it('pide una página al backend, no el catálogo entero', async () => {
    renderBox();

    await waitFor(() => expect(mockList).toHaveBeenCalled());
    const filters = mockList.mock.calls[0][0];
    expect(filters.countryCode).toBe('ES');
    expect(filters.approvalStatus).toBe('APPROVED');
    // Sin límite se traería los 802 campos federados
    expect(filters.limit).toBeGreaterThan(0);
  });

  it('manda lo escrito al backend en vez de filtrar en el navegador', async () => {
    renderBox();
    await waitFor(() => expect(mockList).toHaveBeenCalled());

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Prat' } });

    await waitFor(() => {
      const lastFilters = mockList.mock.calls[mockList.mock.calls.length - 1][0];
      expect(lastFilters.name).toBe('Prat');
    });
  });

  it('no pregunta una vez por tecla', async () => {
    renderBox();
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'R' } });
    fireEvent.change(input, { target: { value: 'Re' } });
    fireEvent.change(input, { target: { value: 'Rea' } });
    fireEvent.change(input, { target: { value: 'Real' } });

    await waitFor(() => {
      const lastFilters = mockList.mock.calls[mockList.mock.calls.length - 1][0];
      expect(lastFilters.name).toBe('Real');
    });
    // La primera carga más una sola búsqueda: sin la espera serían cinco
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('deja seguir escribiendo mientras la petición está en vuelo', async () => {
    renderBox();
    await waitFor(() => expect(mockList).toHaveBeenCalled());

    // Antes el campo se deshabilitaba al cargar, lo que con una búsqueda por
    // pulsación habría hecho imposible escribir
    expect(screen.getByRole('textbox')).not.toBeDisabled();
  });

  it('avisa de que hay más campos de los que se ven', async () => {
    mockList.mockResolvedValue({ courses: [course('1', 'Uno')], total: 69 });
    renderBox();
    await waitFor(() => expect(mockList).toHaveBeenCalled());

    fireEvent.focus(screen.getByRole('textbox'));

    expect(await screen.findByText(/Showing 1 of 69/)).toBeInTheDocument();
  });

  it('no avisa cuando se ven todos', async () => {
    renderBox();
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fireEvent.focus(screen.getByRole('textbox'));

    await screen.findByText('Real Club de Golf');
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  it('no pregunta nada sin país', async () => {
    renderBox({ countryCode: '' });

    await new Promise(resolve => setTimeout(resolve, 400));
    expect(mockList).not.toHaveBeenCalled();
  });

  it('no pinta los campos del país anterior al cambiar de país', async () => {
    const { rerender } = renderBox();
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fireEvent.focus(screen.getByRole('textbox'));
    await screen.findByText('Real Club de Golf');

    // La respuesta del país nuevo tarda: mientras tanto no puede seguir
    // enseñando los campos españoles bajo la bandera francesa
    mockList.mockReturnValue(new Promise(() => {}));
    rerender(
      <GolfCourseSearchBox
        countryCode="FR"
        selectedCourse={null}
        onCourseSelect={vi.fn()}
        onRequestNewCourse={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Real Club de Golf')).not.toBeInTheDocument();
    });
  });

  it('suelta el campo elegido al teclear, para poder cambiarlo', async () => {
    // Con un campo elegido la casilla mostraba su nombre pase lo que pase: se
    // borraba y el texto seguía entero, sin manera de buscar otro campo.
    // Se afirma el valor visible, no solo el aviso: con un espía suelto el
    // padre nunca soltaría la selección y la casilla seguiría congelada aunque
    // el arreglo no estuviera
    const onCourseSelect = vi.fn();
    renderControlledBox({ initialCourse: course('1', 'Real Club de Golf'), onCourseSelect });

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('Real Club de Golf');

    fireEvent.change(input, { target: { value: 'Real Club de Gol' } });

    expect(onCourseSelect).toHaveBeenCalledWith(null);
    expect(input).toHaveValue('Real Club de Gol');
  });

  it('no avisa de deselección a quien no mantiene ninguna', async () => {
    // Los usos de "añadir campo" pasan selectedCourse={null} y su callback
    // recibe el campo elegido directamente: un null ahí les rompería
    const onCourseSelect = vi.fn();
    renderControlledBox({ onCourseSelect });

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'rea' } });

    expect(onCourseSelect).not.toHaveBeenCalled();
    expect(input).toHaveValue('rea');
  });

  describe('búsqueda por cercanía', () => {
    // Con toda la precisión que da una lectura real del GPS: es lo que hay que
    // demostrar que no sale del navegador
    const MADRID = { coords: { latitude: 40.41677382, longitude: -3.70379409 } };

    const stubGeolocation = (implementation) => {
      Object.defineProperty(navigator, 'geolocation', {
        value: { getCurrentPosition: vi.fn(implementation) },
        configurable: true,
        writable: true,
      });
    };

    const openDropdown = async () => {
      await waitFor(() => expect(mockList).toHaveBeenCalled());
      fireEvent.focus(screen.getByRole('textbox'));
    };

    beforeEach(() => {
      stubGeolocation((success) => success(MADRID));
    });

    it('no ofrece la cercanía a quien no la ha pedido', async () => {
      // Los otros tres usos del buscador (añadir campo a competición y los de
      // crear competición) eligen campo para otro día y otro sitio
      renderBox();
      await openDropdown();

      await screen.findByText('Real Club de Golf');
      expect(screen.queryByTestId('golf-course-nearby-button')).not.toBeInTheDocument();
    });

    it('no pide la ubicación a quien solo quería teclear', async () => {
      // El permiso es un diálogo del navegador: pedirlo al abrir es intrusivo
      renderBox({ allowNearby: true });
      await openDropdown();

      await screen.findByTestId('golf-course-nearby-button');
      expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
    });

    it('manda la posición al backend al pulsar el botón, redondeada', async () => {
      // La lectura del GPS llega con precisión de metros y la query string
      // acaba en los registros de nginx, Cloudflare, Render y Sentry. Tres
      // decimales (~110 m) ordenan igual y no dicen en qué casa está (FE #385)
      renderBox({ allowNearby: true });
      await openDropdown();

      fireEvent.click(await screen.findByTestId('golf-course-nearby-button'));

      await waitFor(() => {
        const lastFilters = mockList.mock.calls[mockList.mock.calls.length - 1][0];
        expect(lastFilters.lat).toBe(40.417);
        expect(lastFilters.lon).toBe(-3.704);
      });
    });

    it('no recorta por radio: enseña los más cercanos aunque estén lejos', async () => {
      // Un radio fijo deja Soria vacía. Más vale ver "a 78 km" que nada
      renderBox({ allowNearby: true });
      await openDropdown();

      fireEvent.click(await screen.findByTestId('golf-course-nearby-button'));

      await waitFor(() => {
        const lastFilters = mockList.mock.calls[mockList.mock.calls.length - 1][0];
        expect(lastFilters.lat).toBeDefined();
      });
      const lastFilters = mockList.mock.calls[mockList.mock.calls.length - 1][0];
      expect(lastFilters.radiusKm).toBeUndefined();
    });

    it('enseña la distancia de cada campo', async () => {
      mockList.mockResolvedValue({
        courses: [{ ...course('1', 'Club de Campo'), distanceKm: 78 }],
        total: 1,
      });
      renderBox({ allowNearby: true });
      await openDropdown();

      fireEvent.click(await screen.findByTestId('golf-course-nearby-button'));

      expect(await screen.findByText(/78 km away/)).toBeInTheDocument();
    });

    it('enseña la distancia de un campo que se pisa', async () => {
      // 0 es una distancia real, no un dato ausente: con `||` desaparecería
      mockList.mockResolvedValue({
        courses: [{ ...course('1', 'Club de Campo'), distanceKm: 0 }],
        total: 1,
      });
      renderBox({ allowNearby: true });
      await openDropdown();

      fireEvent.click(await screen.findByTestId('golf-course-nearby-button'));

      expect(await screen.findByText(/0 km away/)).toBeInTheDocument();
    });

    it('vuelve a buscar por nombre en cuanto se teclea', async () => {
      // 11 de los 802 campos importados no tienen coordenadas y solo se
      // alcanzan por nombre: la cercanía no puede secuestrar el buscador
      renderBox({ allowNearby: true });
      await openDropdown();
      fireEvent.click(await screen.findByTestId('golf-course-nearby-button'));
      await waitFor(() => {
        const filters = mockList.mock.calls[mockList.mock.calls.length - 1][0];
        expect(filters.lat).toBeDefined();
      });

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Prat' } });

      await waitFor(() => {
        const lastFilters = mockList.mock.calls[mockList.mock.calls.length - 1][0];
        expect(lastFilters.name).toBe('Prat');
        expect(lastFilters.lat).toBeUndefined();
      });
    });

    it('sigue sirviendo por nombre si se deniega el permiso', async () => {
      stubGeolocation((_success, failure) => failure({ code: 1 }));
      renderBox({ allowNearby: true });
      await openDropdown();

      fireEvent.click(await screen.findByTestId('golf-course-nearby-button'));

      expect(await screen.findByText(/Location permission is off/)).toBeInTheDocument();
      const input = screen.getByRole('textbox');
      expect(input).not.toBeDisabled();

      fireEvent.change(input, { target: { value: 'Prat' } });
      await waitFor(() => {
        const lastFilters = mockList.mock.calls[mockList.mock.calls.length - 1][0];
        expect(lastFilters.name).toBe('Prat');
      });
    });

    // El 14 de agosto la cercanía se rompió en dos dispositivos a la vez por
    // motivos distintos —permiso del sistema apagado en el iPhone, política de
    // permisos vieja servida por el service worker en el escritorio— y los dos
    // imprimían la misma frase. Distinguirlos es toda la issue (FE #387)
    it.each([
      [1, 'el permiso denegado manda a los ajustes', /Location permission is off/],
      [2, 'sin posición se apunta a los ajustes del dispositivo', /device settings/],
      [3, 'el tiempo agotado invita a reintentar', /took too long/],
    ])('código %i: %s', async (code, _description, expected) => {
      stubGeolocation((_success, failure) => failure({ code }));
      renderBox({ allowNearby: true });
      await openDropdown();

      fireEvent.click(await screen.findByTestId('golf-course-nearby-button'));

      expect(await screen.findByText(expected)).toBeInTheDocument();
      // El botón sigue ahí: en el caso del tiempo agotado es el reintento
      expect(screen.getByTestId('golf-course-nearby-button')).toBeInTheDocument();
    });

    it('trata una lectura de GPS que no es un número como falta de posición', async () => {
      // Extensiones que falsean la posición y algunos WebViews devuelven NaN.
      // Sin esto, `position` quedaría con lat/lon a null: la interfaz anunciaría
      // orden por distancia, el backend no recibiría coordenadas y el botón de
      // reintentar habría desaparecido
      stubGeolocation((success) => success({ coords: { latitude: NaN, longitude: NaN } }));
      renderBox({ allowNearby: true });
      await openDropdown();

      fireEvent.click(await screen.findByTestId('golf-course-nearby-button'));

      expect(await screen.findByText(/device settings/)).toBeInTheDocument();
      expect(screen.getByTestId('golf-course-nearby-button')).toBeInTheDocument();
      const lastFilters = mockList.mock.calls[mockList.mock.calls.length - 1][0];
      expect(lastFilters.lat).toBeUndefined();
    });

    it('ante un error sin código no manda a nadie a los ajustes', async () => {
      // Decirle "activa el permiso" a quien no ha denegado nada es peor que no
      // decir nada: manda a buscar un ajuste que ya está puesto
      stubGeolocation((_success, failure) => failure({}));
      renderBox({ allowNearby: true });
      await openDropdown();

      fireEvent.click(await screen.findByTestId('golf-course-nearby-button'));

      expect(await screen.findByText(/device settings/)).toBeInTheDocument();
    });

    it('no reutiliza la posición anterior cuando la nueva lectura falla', async () => {
      // Quien busca por cercanía, luego teclea un nombre y vuelve a pulsar
      // cercanía desde otra ciudad: si la segunda lectura falla y se conserva
      // la primera, el buscador seguiría ordenando por donde estuvo ayer, sin
      // mensaje que lo explique ni botón para reintentar
      let readingFails = false;
      stubGeolocation((success, failure) =>
        readingFails ? failure({ code: 3 }) : success(MADRID)
      );
      renderBox({ allowNearby: true });
      await openDropdown();

      fireEvent.click(await screen.findByTestId('golf-course-nearby-button'));
      await waitFor(() => {
        const filters = mockList.mock.calls[mockList.mock.calls.length - 1][0];
        expect(filters.lat).toBe(40.417);
      });

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Prat' } });
      await waitFor(() => {
        expect(mockList.mock.calls[mockList.mock.calls.length - 1][0].name).toBe('Prat');
      });

      readingFails = true;
      fireEvent.click(await screen.findByTestId('golf-course-nearby-button'));

      expect(await screen.findByText(/took too long/)).toBeInTheDocument();
      expect(screen.getByTestId('golf-course-nearby-button')).toBeInTheDocument();
      await waitFor(() => {
        const filters = mockList.mock.calls[mockList.mock.calls.length - 1][0];
        expect(filters.lat).toBeUndefined();
        expect(filters.lon).toBeUndefined();
      });
    });

    it('sigue sirviendo por nombre en un dispositivo sin ubicación', async () => {
      // Sin HTTPS, o en un navegador viejo, el objeto no existe siquiera
      Object.defineProperty(navigator, 'geolocation', {
        value: undefined,
        configurable: true,
        writable: true,
      });
      renderBox({ allowNearby: true });
      await openDropdown();

      fireEvent.click(await screen.findByTestId('golf-course-nearby-button'));

      expect(await screen.findByText(/device settings/)).toBeInTheDocument();
      expect(screen.getByRole('textbox')).not.toBeDisabled();
    });
  });
  describe('campos de otros países (FE #509)', () => {
    const MADRID = { coords: { latitude: 40.41677382, longitude: -3.70379409 } };

    const abroad = (id, name, countryCode) => ({ ...course(id, name), countryCode });

    const openDropdown = async () => {
      await waitFor(() => expect(mockList).toHaveBeenCalled());
      fireEvent.focus(screen.getByRole('textbox'));
    };

    const ultimaConsulta = () => mockList.mock.calls[mockList.mock.calls.length - 1][0];

    beforeEach(() => {
      Object.defineProperty(navigator, 'geolocation', {
        value: { getCurrentPosition: vi.fn((success) => success(MADRID)) },
        configurable: true,
        writable: true,
      });
    });

    it('busca sin país al pedir los campos cercanos', async () => {
      // Estando sobre el campo, la nacionalidad del jugador no dice nada del
      // campo que pisa: con el país puesto, "el más cercano" a Ponte de Lima
      // seguía buscando entre los españoles
      renderBox({ allowNearby: true });
      await openDropdown();

      fireEvent.click(await screen.findByTestId('golf-course-nearby-button'));

      await waitFor(() => expect(ultimaConsulta().lat).toBe(40.417));
      expect(ultimaConsulta().countryCode).toBeUndefined();
    });

    it('mantiene el país cuando se busca por nombre', async () => {
      // Quitarlo siempre llenaría de campos de fuera la lista de quien juega en
      // su país, que son casi todos
      renderBox();
      await openDropdown();

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Real' } });

      await waitFor(() => expect(ultimaConsulta().name).toBe('Real'));
      expect(ultimaConsulta().countryCode).toBe('ES');
    });

    it('amplía a todos los países cuando en el tuyo no hay ninguno', async () => {
      mockList
        .mockResolvedValueOnce({ courses: [], total: 0 })
        .mockResolvedValueOnce({ courses: [], total: 0 })
        .mockResolvedValueOnce({ courses: [abroad('9', 'Axis Golfe Ponte de Lima', 'PT')], total: 1 });

      renderBox({ allowOtherCountries: true });
      await openDropdown();
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Axis' } });

      expect(await screen.findByText('Axis Golfe Ponte de Lima')).toBeInTheDocument();
      expect(screen.getByTestId('golf-course-widened-notice')).not.toHaveTextContent('');

      const consultas = mockList.mock.calls.map(([f]) => f);
      const porNombre = consultas.filter((f) => f.name === 'Axis');
      expect(porNombre).toHaveLength(2);
      expect(porNombre[0].countryCode).toBe('ES');
      expect(porNombre[1].countryCode).toBeUndefined();
    });

    it('no amplía cuando no hay nada escrito', async () => {
      // La lista que se abre sin teclear es la del país propio: sin texto no
      // hay nada que buscar fuera, y saldría un mundo entero por orden alfabético
      mockList.mockResolvedValue({ courses: [], total: 0 });

      renderBox();
      await waitFor(() => expect(mockList).toHaveBeenCalled());

      expect(mockList).toHaveBeenCalledTimes(1);
      expect(mockList.mock.calls[0][0].countryCode).toBe('ES');
    });

    it('no anuncia la ampliación si fuera tampoco hay nada', async () => {
      mockList.mockResolvedValue({ courses: [], total: 0 });

      renderBox({ allowOtherCountries: true });
      await openDropdown();
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Inexistente' } });

      await waitFor(() => expect(ultimaConsulta().name).toBe('Inexistente'));
      await waitFor(() =>
        expect(screen.getByTestId('golf-course-widened-notice')).toHaveTextContent('')
      );
    });

    it('no amplía a otros países en los buscadores de competición', async () => {
      // Ahí el país no es "el tuyo", es una restricción del formulario:
      // `handleGolfCourseSelect` archiva el campo bajo el país del recuadro, y
      // uno de fuera quedaría guardado como español y se perdería al cambiar
      // de país (CreateCompetition.jsx:289)
      mockList.mockResolvedValue({ courses: [], total: 0 });

      renderBox();
      await openDropdown();
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Axis' } });

      await waitFor(() => expect(ultimaConsulta().name).toBe('Axis'));
      const porNombre = mockList.mock.calls.map(([f]) => f).filter((f) => f.name === 'Axis');
      expect(porNombre).toHaveLength(1);
      expect(porNombre[0].countryCode).toBe('ES');
    });

    it('no marca como extranjeros los campos del país propio escrito en minúsculas', async () => {
      // Hay cuentas con `country_code: 'es'` (countryUtils.test.js), y el
      // buscador recibe ese valor tal cual desde `currentUser.country_code`
      mockList.mockResolvedValue({ courses: [abroad('1', 'Real Club de Golf', 'ES')], total: 1 });

      renderBox({ countryCode: 'es' });
      await openDropdown();

      await screen.findByText('Real Club de Golf');
      expect(screen.queryByTestId('golf-course-country-1')).not.toBeInTheDocument();
    });

    it('enseña el país solo en los campos que no son del tuyo', async () => {
      mockList.mockResolvedValue({
        courses: [abroad('9', 'Axis Golfe Ponte de Lima', 'PT'), abroad('1', 'Real Club de Golf', 'ES')],
        total: 2,
      });

      renderBox();
      await openDropdown();

      await screen.findByText('Axis Golfe Ponte de Lima');
      // Dos campos con el mismo nombre a un lado y otro de la frontera se
      // eligen a ciegas si la fila no dice de dónde es cada uno
      expect(screen.getByTestId('golf-course-country-9')).toHaveTextContent('PT');
      expect(screen.queryByTestId('golf-course-country-1')).not.toBeInTheDocument();
    });
  });
});
