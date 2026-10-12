import { describe, it, expect, vi } from 'vitest';
import {
  passwordErrorMessage,
  passwordErrorTranslation,
  validatePassword,
  validatePasswordStrength,
  validateEmail,
  validateName,
} from './validation';

describe('validation utilities', () => {
  // ========================================
  // validatePassword() tests
  // ========================================
  describe('validatePassword', () => {
    // Test: Minimum length requirement (12 characters)
    it('should reject password with less than 12 characters', () => {
      const result = validatePassword('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('at least 12 characters');
    });

    it('should accept password with exactly 12 characters and complexity', () => {
      const result = validatePassword('ValidPass12!');
      expect(result.isValid).toBe(true);
      expect(result.message).toBe('Strong password');
    });

    // Test: Maximum length requirement (128 characters)
    it('should reject password with more than 128 characters', () => {
      const longPassword = 'A1' + 'a'.repeat(127); // 129 characters
      const result = validatePassword(longPassword);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('must not exceed 128 characters');
    });

    it('should accept password with exactly 128 characters and complexity', () => {
      const maxPassword = 'A1!' + 'a'.repeat(125); // 128 characters
      const result = validatePassword(maxPassword);
      expect(result.isValid).toBe(true);
    });

    // Test: Complexity requirements (uppercase + lowercase + numbers)
    it('should reject password without uppercase letters', () => {
      const result = validatePassword('alllowercase123');
      expect(result.isValid).toBe(false);
      expect(result.messageKey).toBe('validation.passwordWeak');
    });

    it('should reject password without lowercase letters', () => {
      const result = validatePassword('ALLUPPERCASE123');
      expect(result.isValid).toBe(false);
      expect(result.messageKey).toBe('validation.passwordWeak');
    });

    it('should reject password without numbers', () => {
      const result = validatePassword('NoNumbersHere');
      expect(result.isValid).toBe(false);
      expect(result.messageKey).toBe('validation.passwordWeak');
    });

    it('should accept password with uppercase, lowercase, and numbers', () => {
      const result = validatePassword('ValidPassword123!');
      expect(result.isValid).toBe(true);
      expect(result.message).toBe('Strong password');
    });

    // Test: Special characters (optional but increase strength)
    it('should accept password with special characters', () => {
      const result = validatePassword('StrongPass123!@#');
      expect(result.isValid).toBe(true);
      expect(result.strength).toBeGreaterThanOrEqual(4);
    });

    // Test: Empty or null input
    it('should reject empty password', () => {
      const result = validatePassword('');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Password is required');
    });

    it('should reject null password', () => {
      const result = validatePassword(null);
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Password is required');
    });

    // Test: Strength calculation
    it('should calculate correct strength score for weak password', () => {
      const result = validatePassword('weakpassword1'); // 13 chars, no uppercase
      expect(result.strength).toBeLessThan(4);
    });

    it('should calculate correct strength score for strong password', () => {
      const result = validatePassword('StrongP@ssw0rd!'); // 15 chars, all types
      expect(result.strength).toBeGreaterThanOrEqual(4);
    });

    // La misma política que el backend (`Password._validate_password_strength`).
    // El front no pedía símbolo ni miraba los espacios, dejaba enviar una
    // contraseña que el backend rechazaba, y el usuario veía «Error interno del
    // servidor» (hotfix 2.40.1, BE 2.26.1)
    describe('la misma política que el backend', () => {
      it('rechaza una contraseña sin símbolo', () => {
        const result = validatePassword('Abcdefghijk1');
        expect(result.isValid).toBe(false);
        expect(result.messageKey).toBe('validation.passwordNoSymbol');
      });

      it.each(['~', '`', '€', "'", '"', '/', '\\', ' '])(
        'no cuenta «%s» como símbolo, igual que el backend',
        (caracter) => {
          const result = validatePassword(`Abcdefghi1${caracter}x`);
          expect(result.isValid).toBe(false);
          expect(result.messageKey).toBe('validation.passwordNoSymbol');
        }
      );

      it.each('!@#$%^&*()_+-=[]{}|;:,.<>?'.split(''))(
        'acepta «%s» como símbolo',
        (simbolo) => {
          expect(validatePassword(`Abcdefghi1${simbolo}x`).isValid).toBe(true);
        }
      );

      it.each([
        ['un espacio al principio', ' Abcdefghi1!'],
        ['un espacio al final', 'Abcdefghi1! '],
        ['un tabulador al final', 'Abcdefghi1!\t'],
      ])('rechaza %s', (_caso, password) => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.messageKey).toBe('validation.passwordSpaces');
      });

      it('cuenta los caracteres como el backend: un emoji es uno', () => {
        // `length` dice 12 (el emoji son dos unidades UTF-16); Python, 11
        const result = validatePassword('Abcdefgh1!😀');
        expect(result.isValid).toBe(false);
        expect(result.messageKey).toBe('validation.passwordTooShort');
      });

      it('acepta mayúsculas y minúsculas con tilde o eñe, como el backend', () => {
        // `isupper()` de Python sabe que «Ñ» es mayúscula; /[A-Z]/ no
        expect(validatePassword('Ñandúcorre12!').isValid).toBe(true);
        expect(validatePassword('ÁRBOLÉS1234ñ!').isValid).toBe(true);
      });

      // FE #827: los 29 de `str.isspace()` de Python, por delante y por detrás
      const ESPACIOS_DE_PYTHON = [
        ...[0x9, 0xa, 0xb, 0xc, 0xd, 0x1c, 0x1d, 0x1e, 0x1f, 0x20, 0x85, 0xa0, 0x1680],
        ...Array.from({ length: 11 }, (_v, i) => 0x2000 + i),
        0x2028, 0x2029, 0x202f, 0x205f, 0x3000,
      ].map((codigo) => String.fromCodePoint(codigo));

      it('son 29, como en Python', () => {
        expect(ESPACIOS_DE_PYTHON).toHaveLength(29);
      });

      it.each(ESPACIOS_DE_PYTHON.map((c) => [`U+${c.codePointAt(0).toString(16).padStart(4, '0')}`, c]))(
        '%s se rechaza al principio y al final',
        (_codigo, caracter) => {
          expect(validatePassword(`${caracter}Abcdefghi1!`).messageKey).toBe('validation.passwordSpaces');
          expect(validatePassword(`Abcdefghi1!${caracter}`).messageKey).toBe('validation.passwordSpaces');
        }
      );

      // FE #827: «espacio» es lo que quita `str.strip()` de Python, no `trim()`
      it.each([['NEL (U+0085)', '\u0085'], ['separador (U+001F)', '\u001f']])(
        'rechaza un %s al final, como el backend',
        (_nombre, caracter) => {
          const result = validatePassword(`Abcdefghi1!${caracter}`);
          expect(result.isValid).toBe(false);
          expect(result.messageKey).toBe('validation.passwordSpaces');
        }
      );

      it('admite una marca de orden de bytes (U+FEFF) al final, como el backend', () => {
        expect(validatePassword('Abcdefghi1!\ufeff').isValid).toBe(true);
      });

      it('admite un espacio en medio, como el backend', () => {
        expect(validatePassword('Abcde fghi1!').isValid).toBe(true);
      });
    });
  });

  // ========================================
  // validateEmail() tests
  // ========================================
  describe('validateEmail', () => {
    // Test: Valid emails
    it('should accept valid email address', () => {
      const result = validateEmail('user@example.com');
      expect(result.isValid).toBe(true);
      expect(result.message).toBe('');
    });

    it('should accept email with subdomain', () => {
      const result = validateEmail('user@mail.example.com');
      expect(result.isValid).toBe(true);
    });

    it('should accept email with plus sign', () => {
      const result = validateEmail('user+tag@example.com');
      expect(result.isValid).toBe(true);
    });

    // Test: Maximum length (254 characters per RFC 5321)
    it('should reject email with more than 254 characters', () => {
      // Create email with 255 characters
      const longEmail = 'a'.repeat(243) + '@example.com'; // 243 + 12 = 255 chars
      const result = validateEmail(longEmail);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('must not exceed 254 characters');
    });

    it('should accept email with exactly 254 characters', () => {
      // Create email with exactly 254 characters
      const maxEmail = 'a'.repeat(242) + '@example.com'; // 242 + 12 = 254 chars
      const result = validateEmail(maxEmail);
      expect(result.isValid).toBe(true);
    });

    // Test: Invalid formats
    it('should reject email without @ symbol', () => {
      const result = validateEmail('userexample.com');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('valid email address');
    });

    it('should reject email without domain', () => {
      const result = validateEmail('user@');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('valid email address');
    });

    it('should reject email without local part', () => {
      const result = validateEmail('@example.com');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('valid email address');
    });

    // Test: Empty or null input
    it('should reject empty email', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Email is required');
    });

    it('should reject whitespace-only email', () => {
      const result = validateEmail('   ');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Email is required');
    });
  });

  // ========================================
  // validateName() tests
  // ========================================
  describe('validateName', () => {
    // Test: Valid names
    it('should accept valid name', () => {
      const result = validateName('John', 'First name');
      expect(result.isValid).toBe(true);
      expect(result.message).toBe('');
    });

    it('should accept name with exactly 2 characters', () => {
      const result = validateName('Li', 'First name');
      expect(result.isValid).toBe(true);
    });

    it('should accept name with Spanish accents', () => {
      const result = validateName('José', 'First name');
      expect(result.isValid).toBe(true);
    });

    it('should accept name with multiple accents and ñ', () => {
      const result = validateName('María Peña', 'Full name');
      expect(result.isValid).toBe(true);
    });

    it('should accept name with hyphens', () => {
      const result = validateName('Mary-Jane', 'First name');
      expect(result.isValid).toBe(true);
    });

    it('should accept name with apostrophes', () => {
      const result = validateName("O'Connor", 'Last name');
      expect(result.isValid).toBe(true);
    });

    // Test: Maximum length (100 characters - updated from 50)
    it('should reject name with more than 100 characters', () => {
      const longName = 'A'.repeat(101);
      const result = validateName(longName, 'First name');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('must not exceed 100 characters');
    });

    it('should accept name with exactly 100 characters', () => {
      const maxName = 'A'.repeat(100);
      const result = validateName(maxName, 'First name');
      expect(result.isValid).toBe(true);
    });

    it('should accept long compound Spanish name (51-100 chars)', () => {
      // This name was previously rejected with 50 char limit
      const longSpanishName = 'María del Carmen Fernández-González de la Torre y Habsburgo';
      expect(longSpanishName.length).toBeGreaterThan(50);
      expect(longSpanishName.length).toBeLessThanOrEqual(100);

      const result = validateName(longSpanishName, 'Full name');
      expect(result.isValid).toBe(true);
    });

    // Test: Minimum length (2 characters)
    it('should reject name with less than 2 characters', () => {
      const result = validateName('A', 'First name');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('at least 2 characters');
    });

    // Test: Invalid characters
    it('should reject name with numbers', () => {
      const result = validateName('John123', 'First name');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('invalid characters');
    });

    it('should reject name with special symbols', () => {
      const result = validateName('John@Doe', 'First name');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('invalid characters');
    });

    // Test: Empty or null input
    it('should reject empty name', () => {
      const result = validateName('', 'First name');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('First name is required');
    });

    it('should reject whitespace-only name', () => {
      const result = validateName('   ', 'Last name');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Last name is required');
    });

    // Test: Field name parameter
    it('should use custom field name in error messages', () => {
      const result = validateName('', 'Custom Field');
      expect(result.message).toContain('Custom Field');
    });
  });

  // El gemelo de validatePassword: el indicador de fuerza no puede ponerse en
  // verde con algo que el formulario va a rechazar (hotfix 2.40.1)
  describe('validatePasswordStrength con la política del backend', () => {
    it('no da la máxima a una contraseña sin símbolo', () => {
      expect(validatePasswordStrength('Abcdefghijk1').score).toBeLessThan(4);
    });

    it('cuenta los caracteres como el backend: un emoji es uno', () => {
      expect(validatePasswordStrength('Abcdefgh1!😀').score).toBeLessThan(3);
    });

    it('da la máxima a una que cumple la política', () => {
      expect(validatePasswordStrength('Abcdefghij1!').score).toBe(4);
    });
  });

  // BE #519: el 400 de la política trae `error_code`; el texto del backend va
  // en español, así que la pantalla lo traduce con la misma clave que usaría
  // si lo hubiera detectado ella
  describe('passwordErrorTranslation', () => {
    it.each([
      ['PASSWORD_EMPTY', 'validation.passwordRequired'],
      ['PASSWORD_EDGE_SPACES', 'validation.passwordSpaces'],
      ['PASSWORD_TOO_SHORT', 'validation.passwordTooShort'],
      ['PASSWORD_TOO_LONG', 'validation.passwordTooLong'],
      ['PASSWORD_NO_UPPERCASE', 'validation.passwordWeak'],
      ['PASSWORD_NO_LOWERCASE', 'validation.passwordWeak'],
      ['PASSWORD_NO_DIGIT', 'validation.passwordWeak'],
      ['PASSWORD_NO_SYMBOL', 'validation.passwordNoSymbol'],
      ['PASSWORD_TOO_COMMON', 'validation.passwordCommon'],
    ])('%s se dice con %s', (codigo, clave) => {
      expect(passwordErrorTranslation(codigo).key).toBe(clave);
    });

    it('passwordErrorMessage traduce con el espacio de nombres auth, sea cual sea el de la pantalla', () => {
      const t = vi.fn((clave, opciones) => `${opciones?.ns}:${clave}`);

      expect(passwordErrorMessage({ errorCode: 'PASSWORD_TOO_COMMON' }, t)).toBe('auth:validation.passwordCommon');
      expect(passwordErrorMessage({ errorCode: 'PASSWORD_TOO_SHORT' }, t)).toBe('auth:validation.passwordTooShort');
      expect(t).toHaveBeenLastCalledWith('validation.passwordTooShort', { ns: 'auth', min: 12 });
      expect(passwordErrorMessage({ errorCode: 'OTRO' }, t)).toBeNull();
      expect(passwordErrorMessage(new Error('sin código'), t)).toBeNull();
    });

    it('las de longitud llevan su límite', () => {
      expect(passwordErrorTranslation('PASSWORD_TOO_SHORT').options).toEqual({ min: 12 });
      expect(passwordErrorTranslation('PASSWORD_TOO_LONG').options).toEqual({ max: 128 });
    });

    it.each([null, undefined, 'CSRF_VALIDATION_FAILED', 'OTRO', 'constructor', 'toString'])(
      'un código que no es de la contraseña (%s) no se traduce',
      (codigo) => {
        expect(passwordErrorTranslation(codigo)).toBeNull();
      }
    );
  });
});
