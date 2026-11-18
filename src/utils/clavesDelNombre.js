/**
 * La clave del aviso (`create.errors.<clave>`) de cada problema del nombre de
 * una competición que da el dominio (`CompetitionName.problemWith`). Es la
 * única lista: la validación traduce con ella y el formulario saca de ella
 * cuáles se dicen junto al campo. Vive aparte para que los tests que simulan
 * la validación no se la lleven por delante.
 */
export const CLAVES_DE_LOS_PROBLEMAS_DEL_NOMBRE = Object.freeze({
  REQUIRED: 'nameRequired',
  TOO_SHORT: 'nameTooShort',
  UNREADABLE: 'nameUnreadable',
  TOO_LONG: 'nameTooLong',
  HAS_LINK: 'nameHasLink',
});
