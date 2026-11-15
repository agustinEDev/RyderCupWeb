import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PasswordRequirements from './PasswordRequirements';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));

// Cumplido = tachado. Si la lista no pide lo que pide el backend, el usuario la
// ve entera en verde y al enviar le salta un error (hotfix 2.40.1)
const cumplido = (clave) =>
  screen.getByText(clave).className.includes('line-through');

describe('PasswordRequirements', () => {
  it('pide un símbolo, como el backend', () => {
    render(<PasswordRequirements password="Abcdefghijk1" />);
    expect(cumplido('register.requirementSymbol')).toBe(false);
  });

  it('da el símbolo por cumplido solo con uno de los del backend', () => {
    const { rerender } = render(
      <PasswordRequirements password="Abcdefghij1~" />,
    );
    expect(cumplido('register.requirementSymbol')).toBe(false);
    rerender(<PasswordRequirements password="Abcdefghij1!" />);
    expect(cumplido('register.requirementSymbol')).toBe(true);
  });

  it('avisa de los espacios al principio o al final', () => {
    const { rerender } = render(
      <PasswordRequirements password=" Abcdefghi1!" />,
    );
    expect(cumplido('register.requirementNoEdgeSpaces')).toBe(false);
    rerender(<PasswordRequirements password="Abcdefghi1!x" />);
    expect(cumplido('register.requirementNoEdgeSpaces')).toBe(true);
  });

  it('los bordes se miran como el backend: U+0085 cuenta como espacio y U+FEFF no', () => {
    const { rerender } = render(
      <PasswordRequirements password={'Abcdefghi1!\u0085'} />,
    );
    expect(cumplido('register.requirementNoEdgeSpaces')).toBe(false);
    rerender(<PasswordRequirements password={'Abcdefghi1!\ufeff'} />);
    expect(cumplido('register.requirementNoEdgeSpaces')).toBe(true);
  });

  it('da la mayúscula por cumplida con una eñe, como el backend', () => {
    render(<PasswordRequirements password="Ñandúcorre12!" />);
    expect(cumplido('register.requirementUppercase')).toBe(true);
  });

  it('la longitud tiene máximo: 65 caracteres no salen en verde (B-14)', () => {
    // «Abc1!» son 5: con 59 más, 64; con 60, 65
    const { rerender } = render(
      <PasswordRequirements password={`Abc1!${'a'.repeat(59)}`} />,
    );
    expect(cumplido('register.requirementLength')).toBe(true);
    rerender(<PasswordRequirements password={`Abc1!${'a'.repeat(60)}`} />);
    expect(cumplido('register.requirementLength')).toBe(false);
  });

  it('con eñes, 73 bytes no salen en verde aunque sean menos de 64 caracteres (B-14)', () => {
    // «Abc1!» son 5 bytes; 33 eñes, 66: 71. Con una «a» más, 72; con dos, 73
    const { rerender } = render(
      <PasswordRequirements password={`Abc1!${'ñ'.repeat(33)}a`} />,
    );
    expect(cumplido('register.requirementLength')).toBe(true);
    rerender(<PasswordRequirements password={`Abc1!${'ñ'.repeat(33)}aa`} />);
    expect(cumplido('register.requirementLength')).toBe(false);
  });

  it('cuenta los caracteres como el backend: un emoji es uno', () => {
    // 11 caracteres para el backend aunque `length` diga 12
    render(<PasswordRequirements password="Abcdefgh1!😀" />);
    expect(cumplido('register.requirementLength')).toBe(false);
  });
});
