// src/components/ui/CountryAutocomplete.test.jsx

import { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CountryAutocomplete from './CountryAutocomplete';

// El idioma vive en un objeto mutable en vez de fijo: el orden de la lista
// depende de él, así que hay que poder cambiarlo dentro de un test. vi.hoisted
// es lo que permite que la fábrica del mock, que se iza, lo alcance.
const i18nState = vi.hoisted(() => ({ language: 'es' }));

// Se imita a i18next: con defaultValue se usa ese texto. El idioma por defecto
// es español, que es justo el caso donde el componente antiguo enseñaba los
// nombres en inglés
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => (typeof fallback === 'string' ? fallback : key),
    i18n: { language: i18nState.language },
  }),
}));

afterEach(() => {
  i18nState.language = 'es';
});

const COUNTRIES = [
  { code: 'ES', name_en: 'Spain', name_es: 'España' },
  { code: 'PT', name_en: 'Portugal', name_es: 'Portugal' },
  { code: 'FR', name_en: 'France', name_es: 'Francia' },
  { code: 'DE', name_en: 'Germany', name_es: 'Alemania' },
];

const renderSelect = (props = {}) =>
  render(
    <CountryAutocomplete
      countries={COUNTRIES}
      value=""
      onChange={vi.fn()}
      {...props}
    />
  );

const open = () => fireEvent.click(screen.getByTestId('country-autocomplete-trigger'));
const type = (text) =>
  fireEvent.change(screen.getByTestId('country-autocomplete-search'), { target: { value: text } });

/** Nombres de país visibles en la lista desplegada. */
const visibleOptions = () =>
  screen.getAllByRole('option').map(option => option.textContent);

/** Igual, pero sin el código de país que cada opción lleva al final. */
const visibleNames = () =>
  screen.getAllByRole('option').map(option => option.querySelector('.truncate')?.textContent);

// El control es controlado: quien lo usa decide el país elegido
const Controlled = ({ onChange }) => {
  const [value, setValue] = useState('');
  return (
    <CountryAutocomplete
      countries={COUNTRIES}
      value={value}
      onChange={(code) => {
        setValue(code);
        onChange(code);
      }}
    />
  );
};

describe('CountryAutocomplete', () => {
  it('no despliega nada hasta que se abre', () => {
    renderSelect();

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('afina la lista según se escribe', () => {
    // Es la razón de ser del componente: con 200 países, el select nativo
    // obligaba a recorrer el mundo entero para llegar a Portugal
    renderSelect();
    open();
    expect(visibleOptions()).toHaveLength(4);

    type('Por');

    expect(visibleOptions()).toHaveLength(1);
    expect(screen.getByRole('option')).toHaveTextContent('Portugal');
  });

  it('encuentra por el nombre en inglés aunque la aplicación esté en español', () => {
    renderSelect();
    open();

    type('Spain');

    expect(visibleOptions()).toHaveLength(1);
    expect(screen.getByRole('option')).toHaveTextContent('España');
  });

  it('encuentra por el código de país', () => {
    renderSelect();
    open();

    type('de');

    // "de" aparece en el código DE y dentro de nombres largos: lo que importa
    // es que Alemania esté entre los resultados
    expect(visibleOptions().join(' ')).toContain('Alemania');
  });

  it('enseña el nombre en el idioma activo, no siempre en inglés', () => {
    renderSelect();
    open();

    const names = visibleOptions().join(' ');
    expect(names).toContain('España');
    expect(names).toContain('Alemania');
    expect(names).not.toContain('Germany');
  });

  // El listado llega del backend ordenado por el nombre en inglés, y se pinta el
  // del idioma activo. Estos cuatro son el ejemplo exacto de la issue: en inglés
  // van seguidos, en español quedan entreverados.
  const ORDENADOS_EN_INGLES = [
    { code: 'ZA', name_en: 'South Africa', name_es: 'Sudáfrica' },
    { code: 'KR', name_en: 'South Korea', name_es: 'Corea del Sur' },
    { code: 'SS', name_en: 'South Sudan', name_es: 'Sudán del Sur' },
    { code: 'ES', name_en: 'Spain', name_es: 'España' },
  ];

  it('ordena la lista por el nombre que se ve, no por el inglés', () => {
    render(<CountryAutocomplete countries={ORDENADOS_EN_INGLES} value="" onChange={vi.fn()} />);
    open();

    // Sin ordenar saldrían tal cual llegan: Sudáfrica, Corea del Sur, Sudán del
    // Sur, España. Quien recorre la lista con el dedo no puede usar el alfabeto
    expect(visibleNames()).toEqual([
      'Corea del Sur',
      'España',
      'Sudáfrica',
      'Sudán del Sur',
    ]);
  });

  it('reordena la lista al cambiar de idioma', () => {
    // Se cambia el idioma con el componente ya montado: montarlo directamente
    // en inglés solo probaría que arranca ordenado, y seguiría pasando aunque
    // el orden se calculase una vez y se quedase fijo. Cada pasada crea además
    // un elemento nuevo, porque repetir el mismo objeto hace que React se salte
    // la reconciliación y entonces el test tampoco probaría nada.
    const lista = () => (
      <CountryAutocomplete countries={ORDENADOS_EN_INGLES} value="" onChange={vi.fn()} />
    );
    const { rerender } = render(lista());
    open();
    expect(visibleNames()).toEqual([
      'Corea del Sur',
      'España',
      'Sudáfrica',
      'Sudán del Sur',
    ]);

    i18nState.language = 'en';
    rerender(lista());

    // Ordenar en el componente y no en el servidor es lo que hace que el cambio
    // de idioma se note sin volver a pedir la lista
    expect(visibleNames()).toEqual([
      'South Africa',
      'South Korea',
      'South Sudan',
      'Spain',
    ]);
  });

  it('coloca los acentos donde los busca un hispanohablante', () => {
    // Comparando por código de carácter, "á" (U+00E1) va detrás de cualquier
    // letra ASCII y Suecia adelantaría a Sudán. localeCompare con el idioma
    // activo es lo que trata la tilde como la vocal que es
    const conTilde = [
      { code: 'SE', name_en: 'Sweden', name_es: 'Suecia' },
      { code: 'SS', name_en: 'South Sudan', name_es: 'Sudán del Sur' },
    ];
    render(<CountryAutocomplete countries={conTilde} value="" onChange={vi.fn()} />);
    open();

    expect(visibleNames()).toEqual(['Sudán del Sur', 'Suecia']);
  });

  it('avisa cuando la búsqueda no encuentra nada', () => {
    renderSelect();
    open();

    type('zzzz');

    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText('No countries match your search')).toBeInTheDocument();
  });

  it('devuelve el código del país elegido y cierra la lista', () => {
    const onChange = vi.fn();
    renderSelect({ onChange });
    open();

    fireEvent.click(screen.getByRole('option', { name: /Francia/ }));

    expect(onChange).toHaveBeenCalledWith('FR');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('enseña el país elegido con su bandera', () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    open();
    fireEvent.click(screen.getByRole('option', { name: /España/ }));

    const trigger = screen.getByTestId('country-autocomplete-trigger');
    expect(trigger).toHaveTextContent('España');
    // La bandera la pintaba el select anterior: perderla sería una regresión
    expect(trigger.querySelector('img, span[role="img"]')).toBeTruthy();
  });

  it('deja quitar el país elegido', () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    open();
    fireEvent.click(screen.getByRole('option', { name: /España/ }));

    fireEvent.click(screen.getByTestId('country-autocomplete-clear'));

    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('se maneja con el teclado', () => {
    // El componente anterior usaba <div onClick>, que ni recibe el foco con el
    // tabulador ni responde a Enter: el control entero quedaba fuera del
    // alcance de quien no usa ratón
    renderSelect();

    const trigger = screen.getByTestId('country-autocomplete-trigger');
    expect(trigger.tagName).toBe('BUTTON');

    trigger.focus();
    expect(trigger).toHaveFocus();
  });

  it('cierra con Escape sin elegir nada', () => {
    const onChange = vi.fn();
    renderSelect({ onChange });
    open();

    fireEvent.keyDown(screen.getByTestId('country-autocomplete-search'), { key: 'Escape' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('no se abre estando deshabilitado', () => {
    renderSelect({ disabled: true });

    open();

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('marca como elegida la opción que lo está', () => {
    renderSelect({ value: 'PT' });
    open();

    const selected = screen.getByRole('option', { name: /Portugal/ });
    expect(selected).toHaveAttribute('aria-selected', 'true');
  });

  it('abre posicionado en el país elegido', () => {
    // El select nativo lo hacía solo. Sin esto, quien tiene España guardada
    // abre y ve Afganistán, con su país fuera de la vista
    const scrollIntoView = vi.fn();
    globalThis.Element.prototype.scrollIntoView = scrollIntoView;

    renderSelect({ value: 'DE' });
    open();

    expect(scrollIntoView).toHaveBeenCalled();
    const scrolled = screen.getByRole('option', { name: /Alemania/ });
    expect(scrolled).toHaveAttribute('aria-selected', 'true');
  });

  it('no intenta posicionarse cuando no hay nada elegido', () => {
    const scrollIntoView = vi.fn();
    globalThis.Element.prototype.scrollIntoView = scrollIntoView;

    renderSelect({ value: '' });
    open();

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('corta el Enter en la búsqueda para que no envíe el formulario', () => {
    // La casilla vive dentro del <form> de las cinco pantallas que montan el
    // componente, y todas tienen botón de envío: sin cortarlo, teclear y
    // confirmar no elegía país y enviaba el formulario. En Registro eso daba
    // de alta la cuenta
    renderSelect();
    open();
    type('Portu');

    const seguirian = fireEvent.keyDown(screen.getByTestId('country-autocomplete-search'), {
      key: 'Enter',
    });

    expect(seguirian).toBe(false); // preventDefault: no hay envío implícito
  });

  it('elige el primer resultado al confirmar lo tecleado', () => {
    const onChange = vi.fn();
    renderSelect({ onChange });
    open();
    type('Portu');

    fireEvent.keyDown(screen.getByTestId('country-autocomplete-search'), { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('PT');
  });

  it('no elige nada al confirmar sin haber buscado', () => {
    // Quedarse con el primero de los 200 sería elegir por el usuario
    const onChange = vi.fn();
    renderSelect({ onChange });
    open();

    fireEvent.keyDown(screen.getByTestId('country-autocomplete-search'), { key: 'Enter' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('recorre la lista con las flechas y elige la resaltada', () => {
    // El <select> daba flechas gratis; sin esto había que tabular por 200
    // botones para llegar al país
    const onChange = vi.fn();
    renderSelect({ onChange });
    open();

    const search = screen.getByTestId('country-autocomplete-search');
    // La lista va ordenada por el nombre en español: Alemania, España,
    // Francia, Portugal
    fireEvent.keyDown(search, { key: 'ArrowDown' }); // Alemania
    fireEvent.keyDown(search, { key: 'ArrowDown' }); // España
    fireEvent.keyDown(search, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('ES');
  });

  it('suelta el resaltado cuando la lista se reordena bajo él', () => {
    // Cambiar de idioma con la lista abierta la reordena: el índice resaltado
    // seguiría siendo válido, pero apuntando a otro país. Enter elegiría uno
    // que nadie señaló
    const onChange = vi.fn();
    const lista = () => (
      <CountryAutocomplete countries={ORDENADOS_EN_INGLES} value="" onChange={onChange} />
    );
    const { rerender } = render(lista());
    open();

    const search = screen.getByTestId('country-autocomplete-search');
    fireEvent.keyDown(search, { key: 'ArrowDown' }); // Corea del Sur, en español

    i18nState.language = 'en';
    rerender(lista());

    fireEvent.keyDown(screen.getByTestId('country-autocomplete-search'), { key: 'Enter' });

    // En inglés la primera posición es Sudáfrica: sin soltar el resaltado, ese
    // Enter habría elegido ZA sin que nadie lo señalara
    expect(onChange).not.toHaveBeenCalled();
  });

  it('vuelve al final de la lista al subir desde el principio', () => {
    const onChange = vi.fn();
    renderSelect({ onChange });
    open();

    const search = screen.getByTestId('country-autocomplete-search');
    fireEvent.keyDown(search, { key: 'ArrowUp' });
    fireEvent.keyDown(search, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('PT'); // el último por nombre en español
  });

  it('salta al principio y al final con Home y End', () => {
    const onChange = vi.fn();
    renderSelect({ onChange });
    open();

    const search = screen.getByTestId('country-autocomplete-search');
    fireEvent.keyDown(search, { key: 'End' });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith('PT'); // Portugal cierra la lista

    open();
    fireEvent.keyDown(screen.getByTestId('country-autocomplete-search'), { key: 'Home' });
    fireEvent.keyDown(screen.getByTestId('country-autocomplete-search'), { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith('DE'); // Alemania la abre
  });

  it('anuncia con aria-activedescendant la opción resaltada', () => {
    renderSelect();
    open();

    const search = screen.getByTestId('country-autocomplete-search');
    expect(search).not.toHaveAttribute('aria-activedescendant');

    fireEvent.keyDown(search, { key: 'ArrowDown' });

    const activo = search.getAttribute('aria-activedescendant');
    expect(activo).toBeTruthy();
    expect(document.getElementById(activo)).toHaveAttribute('role', 'option');
  });

  it('saca la X de limpiar fuera del disparador', () => {
    // Anidada era un <span role="button"> dentro de un <button>: HTML inválido,
    // y WebKit reasigna ese clic al botón padre, así que en iOS tocar la X
    // abría la lista en vez de limpiar
    render(<CountryAutocomplete countries={COUNTRIES} value="ES" onChange={vi.fn()} />);

    const clear = screen.getByTestId('country-autocomplete-clear');
    const trigger = screen.getByTestId('country-autocomplete-trigger');

    expect(clear.tagName).toBe('BUTTON');
    expect(trigger.contains(clear)).toBe(false);
  });

  it('devuelve el foco al disparador al elegir', () => {
    // close() desmonta la casilla de búsqueda, que es donde estaba el foco: sin
    // devolverlo, el siguiente Tab reempieza arriba de la página
    renderSelect();
    open();

    fireEvent.click(screen.getByRole('option', { name: /España/ }));

    expect(screen.getByTestId('country-autocomplete-trigger')).toHaveFocus();
  });

  it('devuelve el foco al disparador al cerrar con Escape', () => {
    renderSelect();
    open();

    fireEvent.keyDown(screen.getByTestId('country-autocomplete-search'), { key: 'Escape' });

    expect(screen.getByTestId('country-autocomplete-trigger')).toHaveFocus();
  });

  it('cuelga las opciones directas del listbox, sin <li> por medio', () => {
    // Un <li> entre el role="listbox" y las role="option" no es una estructura
    // que ARIA admita
    renderSelect();
    open();

    const listbox = screen.getByRole('listbox');
    expect(listbox.querySelector('li')).toBeNull();
    for (const option of screen.getAllByRole('option')) {
      expect(option.parentElement).toBe(listbox);
    }
  });

  it('tapa la lista para no pedir 200 banderas de golpe', () => {
    // Cada opción monta un <img> de flagcdn: sin tope, abrir dispara ~200
    // peticiones a un CDN externo a la vez
    const muchos = Array.from({ length: 70 }, (_, i) => ({
      code: `X${i.toString().padStart(2, '0')}`,
      name_en: `Country ${i}`,
      name_es: `País ${i}`,
    }));

    render(<CountryAutocomplete countries={muchos} value="" onChange={vi.fn()} />);
    open();

    expect(screen.getAllByRole('option')).toHaveLength(50);
    expect(screen.getByTestId('country-autocomplete-more')).toBeInTheDocument();
  });

  it('devuelve el foco al disparador al limpiar el país', () => {
    // La X solo existe mientras hay país elegido: limpiar la desmonta con el
    // foco dentro, y sin devolverlo se cae al <body>
    render(<Controlled onChange={vi.fn()} />);
    open();
    fireEvent.click(screen.getByRole('option', { name: /España/ }));

    fireEvent.click(screen.getByTestId('country-autocomplete-clear'));

    expect(screen.getByTestId('country-autocomplete-trigger')).toHaveFocus();
  });

  it('anuncia el error y la obligatoriedad, no solo los pinta', () => {
    // El borde rojo y el asterisco solo existen para quien ve la pantalla
    renderSelect({ error: true, required: true, label: 'País' });

    const trigger = screen.getByTestId('country-autocomplete-trigger');
    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    expect(trigger).toHaveAttribute('aria-required', 'true');
  });

  it('apunta al listbox con aria-controls solo mientras está abierto', () => {
    renderSelect();
    const trigger = screen.getByTestId('country-autocomplete-trigger');
    expect(trigger).not.toHaveAttribute('aria-controls');

    open();

    expect(trigger.getAttribute('aria-controls')).toBe(screen.getByRole('listbox').id);
  });

  it('usa la etiqueta como nombre accesible del control', () => {
    // Como <label htmlFor> externo sobre un <button>, el <label> nativo gana a
    // name-from-content: se anunciaba "Nacionalidad" y nunca el país elegido
    render(
      <CountryAutocomplete
        countries={COUNTRIES}
        value="ES"
        onChange={vi.fn()}
        label="Nacionalidad"
      />
    );

    expect(screen.getByTestId('country-autocomplete-trigger')).toHaveAccessibleName(/Nacionalidad/);
  });
});
