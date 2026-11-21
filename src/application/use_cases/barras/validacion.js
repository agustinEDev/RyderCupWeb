import TeeColor from '../../../domain/value_objects/TeeColor';

/**
 * La entrada de los casos de uso de barras: un texto no vacío y un color de
 * `TeeColor` o null (`undefined` llegaría a la API como ausencia de campo, y
 * el backend respondería 422 sin decir qué).
 */
export const exigeTexto = (valor, nombre) => {
  if (!valor || typeof valor !== 'string')
    throw new Error(`${nombre} es requerido y debe ser un string`);
};

export const exigeColorONull = (color) => {
  if (color !== null && !TeeColor.isValid(color))
    throw new Error(`teeColor no válido: ${color}`);
};
