import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PasswordRequirements from './PasswordRequirements';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));

// Cumplido = tachado. Si la lista no pide lo que pide el backend, el usuario la
// ve entera en verde y al enviar le salta un error (hotfix 2.40.1)
const cumplido = (clave) => screen.getByText(clave).className.includes('line-through');

describe('PasswordRequirements', () => {
  it('pide un símbolo, como el backend', () => {
    render(<PasswordRequirements password="Abcdefghijk1" />);
    expect(cumplido('register.requirementSymbol')).toBe(false);
  });

  it('da el símbolo por cumplido solo con uno de los del backend', () => {
    const { rerender } = render(<PasswordRequirements password="Abcdefghij1~" />);
    expect(cumplido('register.requirementSymbol')).toBe(false);
    rerender(<PasswordRequirements password="Abcdefghij1!" />);
    expect(cumplido('register.requirementSymbol')).toBe(true);
  });

  it('cuenta los caracteres como el backend: un emoji es uno', () => {
    // 11 caracteres para el backend aunque `length` diga 12
    render(<PasswordRequirements password="Abcdefgh1!😀" />);
    expect(cumplido('register.requirementLength')).toBe(false);
  });
});
