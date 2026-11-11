/**
 * El cuerpo de una petición sin secretos, para lo que sale hacia Sentry: contraseñas,
 * tokens de sesión, los enlaces de un solo uso (verificar, restablecer) y el canje de
 * Google con PKCE (fase 3). Lo usa el procesador de eventos de `sentryScrubbing`, el
 * que corre de verdad en el navegador (main.jsx).
 *
 * Sin dependencias: va en el primer chunk.
 */
const CAMPOS_SECRETOS = ['password', 'access_token', 'refresh_token', 'token', 'code_verifier', 'authorization_code'];
const TACHADO = '[Filtered]';
const PATRONES_SECRETOS = CAMPOS_SECRETOS.flatMap((campo) => [
  // JSON (también roto o cortado): "campo": "valor"
  [new RegExp(`("${campo}"\\s*:\\s*)"(?:[^"\\\\]|\\\\.)*"`, 'g'), `$1"${TACHADO}"`],
  // Formulario: campo=valor
  [new RegExp(`(^|[&?\\s])(${campo}=)[^&\\s]*`, 'g'), `$1$2${TACHADO}`],
]);

const esObjeto = (valor) => Boolean(valor) && typeof valor === 'object' && !Array.isArray(valor);

const sinCamposSecretos = (datos) => {
  const limpio = { ...datos };
  for (const campo of CAMPOS_SECRETOS) delete limpio[campo];
  return limpio;
};

/**
 * @param {unknown} datos El cuerpo: objeto, texto JSON (se vuelve a serializar) u otro texto
 * @returns {unknown} El mismo cuerpo sin secretos; lo que no es objeto ni texto, tal cual
 */
export const tachaElCuerpo = (datos) => {
  if (esObjeto(datos)) return sinCamposSecretos(datos);
  if (typeof datos !== 'string') return datos;
  try {
    const leido = JSON.parse(datos);
    if (esObjeto(leido)) return JSON.stringify(sinCamposSecretos(leido));
  } catch {
    // No es JSON: por patrón
  }
  return PATRONES_SECRETOS.reduce((texto, [patron, cambio]) => texto.replace(patron, cambio), datos);
};
