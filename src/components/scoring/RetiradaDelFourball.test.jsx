import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider } from 'react-i18next';
import scoring from '../../i18n/locales/es/scoring.json';
import common from '../../i18n/locales/es/common.json';
import RetiradaDelFourball from './RetiradaDelFourball';

/**
 * Los botones de la retirada en un fourball de torneo (25 oct 2026, F2, F3).
 * Qué enseñar lo decide `opcionesDeRetirada`; aquí, que cada botón pida
 * confirmación al retirar y llame con quién y si es deshacer.
 */
const i18n = i18next.createInstance();
await i18n.init({
  lng: 'es',
  ns: ['scoring', 'common'],
  defaultNS: 'scoring',
  resources: { es: { scoring, common } },
  interpolation: { escapeValue: false },
});
const conTextos = (ui) => <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>;

const NADA = { pareja: null, yoRetirado: false, retirarme: false, retirarPareja: false, volver: false, deshacerPareja: false };
const BEA = { userId: 'a2', userName: 'Bea' };

const pinta = (opciones, onRetirar = vi.fn()) => {
  render(conTextos(<RetiradaDelFourball opciones={{ ...NADA, ...opciones }} yo="a1" onRetirar={onRetirar} enviando={false} />));
  return onRetirar;
};

describe('RetiradaDelFourball', () => {
  it('F2: retirarme pide confirmación y me retira a mí', () => {
    const onRetirar = pinta({ pareja: BEA, retirarme: true, retirarPareja: true });

    fireEvent.click(screen.getByRole('button', { name: 'Retirarme del partido' }));
    expect(onRetirar).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toHaveTextContent('Desde ahora su bola no cuenta');
    fireEvent.click(screen.getByRole('button', { name: 'Sí, retirar' }));

    expect(onRetirar).toHaveBeenCalledWith('a1', { deshacer: false });
  });

  it('F2: a mi pareja, con su nombre', () => {
    const onRetirar = pinta({ pareja: BEA, retirarme: true, retirarPareja: true });

    fireEvent.click(screen.getByRole('button', { name: 'Marcar a Bea como retirado' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí, retirar' }));

    expect(onRetirar).toHaveBeenCalledWith('a2', { deshacer: false });
  });

  it('F2: cancelar la confirmación no retira a nadie', () => {
    const onRetirar = pinta({ pareja: BEA, retirarme: true, retirarPareja: true });

    fireEvent.click(screen.getByRole('button', { name: 'Retirarme del partido' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onRetirar).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('F3: retirado, el aviso y «Volver al partido», sin confirmación', () => {
    const onRetirar = pinta({ pareja: BEA, yoRetirado: true, volver: true });

    expect(screen.getByText('Estás retirado de este partido')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver al partido' }));

    expect(onRetirar).toHaveBeenCalledWith('a1', { deshacer: true });
    expect(screen.queryByRole('button', { name: 'Retirarme del partido' })).not.toBeInTheDocument();
  });

  it('F3b: mi pareja retirada, «Deshacer la retirada de Bea»', () => {
    const onRetirar = pinta({ pareja: BEA, deshacerPareja: true });

    fireEvent.click(screen.getByRole('button', { name: 'Deshacer la retirada de Bea' }));

    expect(onRetirar).toHaveBeenCalledWith('a2', { deshacer: true });
  });

  it('sin nada que ofrecer, no pinta nada', () => {
    const { container } = render(conTextos(<RetiradaDelFourball opciones={NADA} yo="a1" onRetirar={vi.fn()} enviando={false} />));
    expect(container).toBeEmptyDOMElement();
  });
});
