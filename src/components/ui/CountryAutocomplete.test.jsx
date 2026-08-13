// src/components/ui/CountryAutocomplete.test.jsx

import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CountryAutocomplete from './CountryAutocomplete';

// Se imita a i18next: con defaultValue se usa ese texto. El idioma es español,
// que es justo el caso donde el componente antiguo enseñaba los nombres en
// inglés
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => (typeof fallback === 'string' ? fallback : key),
    i18n: { language: 'es' },
  }),
}));

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
});
