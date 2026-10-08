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

  it('avisa de los espacios al principio o al final', () => {
    const { rerender } = render(<PasswordRequirements password=" Abcdefghi1!" />);
    expect(cumplido('register.requirementNoEdgeSpaces')).toBe(false);
    rerender(<PasswordRequirements password="Abcdefghi1!x" />);
    expect(cumplido('register.requirementNoEdgeSpaces')).toBe(true);
  });

  it('los bordes se miran como el backend: U+0085 cuenta como espacio y U+FEFF no', () => {
    const { rerender } = render(<PasswordRequirements password={'Abcdefghi1!\u0085'} />);
    expect(cumplido('register.requirementNoEdgeSpaces')).toBe(false);
    rerender(<PasswordRequirements password={'Abcdefghi1!\ufeff'} />);
    expect(cumplido('register.requirementNoEdgeSpaces')).toBe(true);
  });

  it('da la mayúscula por cumplida con una eñe, como el backend', () => {
    render(<PasswordRequirements password="Ñandúcorre12!" />);
    expect(cumplido('register.requirementUppercase')).toBe(true);
  });

  it('cuenta los caracteres como el backend: un emoji es uno', () => {
    // 11 caracteres para el backend aunque `length` diga 12
    render(<PasswordRequirements password="Abcdefgh1!😀" />);
    expect(cumplido('register.requirementLength')).toBe(false);
  });
});
