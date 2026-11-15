import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import AvisoVerificaParaLlegarAOtros from './AvisoVerificaParaLlegarAOtros';
import es from '../../i18n/locales/es/auth.json';
import en from '../../i18n/locales/en/auth.json';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));
const reenviar = vi.fn();
vi.mock('../../hooks/useReenvioDeVerificacion', () => ({
  useReenvioDeVerificacion: () => ({
    reenviar,
    enviando: false,
    mensaje: '',
    esError: false,
  }),
}));

describe('AvisoVerificaParaLlegarAOtros (B-17)', () => {
  it('dice por qué y deja reenviar el correo', () => {
    render(<AvisoVerificaParaLlegarAOtros correo="yo@x.test" />);

    expect(
      screen.getByText('emailVerification.outreachNotice'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText('emailVerification.resend'));
    expect(reenviar).toHaveBeenCalled();
  });

  it('sin el correo a mano (sin conexión) no ofrece reenviar', () => {
    render(<AvisoVerificaParaLlegarAOtros />);

    expect(screen.queryByText('emailVerification.resend')).toBeNull();
  });

  it('los textos aprobados, en los dos idiomas', () => {
    expect(es.emailVerification.outreachNotice).toBe(
      'Verifica tu correo para invitar, pedir amistad o crear competiciones',
    );
    expect(en.emailVerification.outreachNotice).toBe(
      'Verify your email to invite, send friend requests or create competitions',
    );
  });
});
