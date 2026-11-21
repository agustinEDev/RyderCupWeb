import TeeColor from '../domain/value_objects/TeeColor';

/**
 * Las barras que se pueden elegir como barra general de una inscripción
 * (barras por campo): todos los colores menos OTHER, que no es un color sino
 * un nombre libre de cada campo, en el orden de los selectores (`TeeColor`). Es la barra de siempre del jugador, no la de
 * un campo: cada campo la usa si la tiene.
 */
export const BARRAS_GENERALES = Object.freeze(TeeColor.getSelectorOrder());
