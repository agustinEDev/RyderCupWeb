/**
 * El nombre, el icono y el país de un dispositivo, en el idioma de la app (FE #1046).
 *
 * El backend manda códigos —tipo, plataforma, navegador, si es la app instalada y
 * el país— y aquí se traducen. Antes se pintaba el nombre en inglés que el backend
 * fijaba al darlo de alta, y se equivocaba: Chrome en el iPhone era «Safari on iOS».
 */

const TIPOS = new Set(['phone', 'tablet', 'computer']);
const PLATAFORMAS = new Set([
  'iphone',
  'ipad',
  'mac',
  'android',
  'windows',
  'chromebook',
  'linux',
]);
const NAVEGADORES = new Set([
  'safari',
  'chrome',
  'firefox',
  'edge',
  'opera',
  'samsung',
  'instagram',
  'google',
  'facebook',
]);

/** El icono: phone, tablet, computer o unknown. */
export const iconoDelDispositivo = (dispositivo) =>
  TIPOS.has(dispositivo?.deviceType) ? dispositivo.deviceType : 'unknown';

/**
 * «iPhone · Safari», «iPhone · app instalada» o solo «iPhone». Con la plataforma
 * desconocida, el nombre que mandó el backend, o «Dispositivo desconocido».
 *
 * @param {{platform?: string, browser?: string, installedApp?: boolean, deviceName?: string}} dispositivo
 * @param {(clave: string) => string} t - del espacio `devices`
 */
export const nombreDelDispositivo = (dispositivo, t) => {
  if (!PLATAFORMAS.has(dispositivo?.platform)) {
    return dispositivo?.deviceName || t('device.unknown');
  }
  const plataforma = t(`platform.${dispositivo.platform}`);
  if (dispositivo.installedApp)
    return `${plataforma} · ${t('browser.installedApp')}`;
  if (!NAVEGADORES.has(dispositivo.browser)) return plataforma;
  return `${plataforma} · ${t(`browser.${dispositivo.browser}`)}`;
};

/**
 * El nombre del país (ISO 3166 alfa-2) en el idioma de la app, o null.
 * Un idioma que `Intl` no entiende lanza RangeError: entonces, el del navegador.
 */
export const paisDelDispositivo = (codigo, idioma) => {
  if (typeof codigo !== 'string' || !/^[A-Za-z]{2}$/.test(codigo)) return null;
  const region = codigo.toUpperCase();
  try {
    return (
      new Intl.DisplayNames([idioma], { type: 'region' }).of(region) ?? null
    );
  } catch {
    try {
      return (
        new Intl.DisplayNames(undefined, { type: 'region' }).of(region) ?? null
      );
    } catch {
      return null;
    }
  }
};
