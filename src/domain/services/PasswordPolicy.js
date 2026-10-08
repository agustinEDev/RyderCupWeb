/**
 * La política de contraseñas, la MISMA que el backend
 * (`Password._validate_password_strength` en RyderCupAm).
 *
 * Vive en el dominio porque es una regla de negocio y la usan el value object
 * `Password` y la interfaz: el dominio no puede importar nada de fuera de él
 * (`domain-is-pure`), así que `utils/validation.js` la reexporta para las
 * pantallas en vez de ser su dueño.
 */

/**
 * Símbolos que cuentan, los MISMOS que el backend (`Password._validate_password_strength`):
 * `!@#$%^&*()_+-=[]{}|;:,.<>?`. Contar aquí uno que allí no cuenta —`~`, `/`,
 * comillas— dejaba enviar una contraseña que el backend rechazaba.
 */
export const PASSWORD_SPECIAL_CHARS = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/;

/**
 * Longitud en caracteres, como `len()` en el backend. `length` cuenta unidades
 * UTF-16 y un emoji vale dos: «Abcdefgh1!😀» pasaba aquí con 12 y el backend lo
 * rechazaba con 11.
 */
export const passwordLength = (password) => [...password].length;

/**
 * Mayúscula, minúscula y dígito en Unicode, como `isupper()`, `islower()` e
 * `isdigit()` del backend: con /[A-Z]/ una «Ñ» no contaba y el formulario
 * rechazaba «Ñandúcorre12!», que el backend acepta.
 */
export const PASSWORD_UPPERCASE = /\p{Lu}/u;
export const PASSWORD_LOWERCASE = /\p{Ll}/u;
export const PASSWORD_DIGIT = /\p{Nd}/u;

/**
 * Lo que el backend considera espacio en los bordes: los 29 caracteres de
 * `str.isspace()`, que son los que quita `str.strip()`. `trim()` no es lo mismo:
 * quita U+FEFF, que Python deja, y deja U+0085 y U+001C-U+001F, que Python
 * quita (FE #827). Sin igualarlos, front y back no estaban de acuerdo.
 */
// U+001C-U+001F son de control y son justo los que hay que detectar: Python los
// cuenta como espacio
const EDGE_WHITESPACE =
  // eslint-disable-next-line no-control-regex
  /^[\t\n\v\f\r\u001c-\u001f \u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]|[\t\n\v\f\r\u001c-\u001f \u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]$/;

/** Si la contraseña empieza o acaba en un espacio, contado como el backend. */
export const hasEdgeWhitespace = (password) => EDGE_WHITESPACE.test(password);

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {Object} - { isValid: boolean, message: string, strength: number }
 */
export const validatePassword = (password) => {
  if (!password) {
    return {
      isValid: false,
      messageKey: 'validation.passwordRequired',
      message: 'Password is required',
      strength: 0
    };
  }

  const minLength = 12; // OWASP ASVS V2.1.1 requirement
  const maxLength = 128; // Prevent DoS attacks via excessive hashing
  const hasUpperCase = PASSWORD_UPPERCASE.test(password);
  const hasLowerCase = PASSWORD_LOWERCASE.test(password);
  const hasNumbers = PASSWORD_DIGIT.test(password);
  const hasSpecialChar = PASSWORD_SPECIAL_CHARS.test(password);

  // Calculate strength (0-5)
  let strength = 0;
  if (passwordLength(password) >= 8) strength++;
  if (passwordLength(password) >= 12) strength++;
  if (hasUpperCase && hasLowerCase) strength++;
  if (hasNumbers) strength++;
  if (hasSpecialChar) strength++;

  // Los espacios al principio o al final los rechaza el backend (suelen venir
  // de copiar y pegar); en medio sí valen
  if (hasEdgeWhitespace(password)) {
    return {
      isValid: false,
      messageKey: 'validation.passwordSpaces',
      message: 'Password must not start or end with whitespace.',
      strength
    };
  }

  // Validation: Check minimum length (12 characters required)
  if (passwordLength(password) < minLength) {
    return {
      isValid: false,
      messageKey: 'validation.passwordTooShort',
      messageOptions: { min: minLength },
      message: `Password must be at least ${minLength} characters long.`,
      strength
    };
  }

  // Validation: Check maximum length (128 characters)
  if (passwordLength(password) > maxLength) {
    return {
      isValid: false,
      messageKey: 'validation.passwordTooLong',
      messageOptions: { max: maxLength },
      message: `Password must not exceed ${maxLength} characters.`,
      strength
    };
  }

  // Validation: Check complexity (uppercase + lowercase + numbers required).
  // Una sola clave para la interfaz; el texto dice qué falta, que es lo que
  // lanza el value object `Password`
  const missing = [
    [hasUpperCase, 'an uppercase letter'],
    [hasLowerCase, 'a lowercase letter'],
    [hasNumbers, 'a number'],
  ].find(([ok]) => !ok);
  if (missing) {
    return {
      isValid: false,
      messageKey: 'validation.passwordWeak',
      message: `Password must contain at least ${missing[1].replace(/^an? /, 'one ')}.`,
      strength
    };
  }

  // El backend exige un símbolo. Sin esta regla el formulario dejaba pasar
  // una contraseña que el backend rechazaba, y el usuario leía «Error interno
  // del servidor» (hotfix 2.40.1)
  if (!hasSpecialChar) {
    return {
      isValid: false,
      messageKey: 'validation.passwordNoSymbol',
      message: 'Password must contain at least one special character.',
      strength
    };
  }

  return {
    isValid: true,
    message: 'Strong password',
    strength
  };
};
