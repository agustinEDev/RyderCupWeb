/**
 * Lo que se guarda del usuario en el dispositivo (fase 3, FE-06; Agustín, opción A).
 *
 * En `localStorage` vive lo justo para arrancar y pintar sin conexión: quién es, su
 * nombre, la versión del avatar, sus permisos (también los Términos, que deciden a qué
 * pantalla va el arranque sin red) y si verificó el correo. El correo, el pendiente, el
 * género, el hándicap, el país, las fechas y lo de los proveedores NO: en un móvil
 * compartido o robado se leían sin sesión. En memoria el usuario sigue completo: viene
 * de la API.
 *
 * Sirve para el DTO del backend (snake_case) y para la entidad (camelCase). Vive en
 * infraestructura y no en el dominio porque conoce la forma de la API (revisión).
 */
const CAMPOS_QUE_SE_GUARDAN = [
  'id',
  // Nombre: el que pinta la interfaz
  'first_name',
  'last_name',
  'firstName',
  'lastName',
  'alias',
  'display_name',
  'displayName',
  // La versión del avatar
  'updated_at',
  'updatedAt',
  // Permisos y lo que decide a dónde va el arranque
  'is_admin',
  'isAdmin',
  'roles',
  'terms_accepted',
  'termsAccepted',
  'terms_version_required',
  'termsVersionRequired',
  'email_verified',
  'emailVerified',
];

/**
 * @param {unknown} usuario
 * @returns {Object|null} Solo los campos que se pueden guardar; null si no es un usuario.
 */
const esObjeto = (valor) => Boolean(valor) && typeof valor === 'object' && !Array.isArray(valor);

/**
 * @param {unknown} usuario
 * @returns {Object|null} Solo los campos que se pueden guardar; null si no es un usuario
 *   (no es un objeto, es una lista o no tiene `id`).
 */
export const copiaDelUsuarioEnElDispositivo = (usuario) => {
  if (!esObjeto(usuario) || usuario.id === undefined || usuario.id === null) return null;
  return Object.fromEntries(
    CAMPOS_QUE_SE_GUARDAN.filter((campo) => Object.hasOwn(usuario, campo)).map((campo) => [campo, usuario[campo]])
  );
};

/**
 * Si una copia guardada ya está reducida: una de antes de la fase 3 se reescribe. Lo que
 * no es un usuario (lista, objeto vacío o sin `id`, otro valor) no cuenta como copia.
 * @param {unknown} usuario
 * @returns {boolean}
 */
export const esLaCopiaReducida = (usuario) =>
  copiaDelUsuarioEnElDispositivo(usuario) !== null &&
  Object.keys(usuario).every((campo) => CAMPOS_QUE_SE_GUARDAN.includes(campo));
