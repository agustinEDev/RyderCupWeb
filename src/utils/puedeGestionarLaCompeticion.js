/**
 * Quién gestiona una competición: quien la creó, quien tiene el rol de
 * organizador o un admin. Una sola regla para la ficha, la agenda y «se puede
 * terminar» (antes, tres copias). Devuelve lo mismo que la expresión de antes
 * (no siempre un booleano): los componentes lo reciben tal cual. Sin usuario
 * identificado nadie gestiona: `undefined === undefined` daba permiso
 * (`/code-review`, CodeRabbit).
 */
export const puedeGestionarLaCompeticion = ({
  creatorId,
  userId,
  hasCreatorRole,
  isAdmin,
}) => Boolean(userId) && (creatorId === userId || hasCreatorRole || isAdmin);
