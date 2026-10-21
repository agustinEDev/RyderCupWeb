/**
 * Recorre `elementos` con `tarea`, sin tener nunca más de `tope` en vuelo: en
 * cuanto acaba una entra la siguiente, sin esperar a que acabe la tanda.
 *
 * Una tarea que falla no corta el recorrido —lo que haya que hacer con el
 * fallo lo decide la propia tarea—. Con `sigue` a falso no empieza ninguna
 * más; las que ya estaban en vuelo terminan igual (FE #418).
 */
export const recorreConTope = async (elementos, tope, tarea, { sigue = () => true } = {}) => {
  let siguiente = 0;
  const trabajador = async () => {
    while (siguiente < elementos.length && sigue()) {
      const elemento = elementos[siguiente];
      siguiente += 1;
      try {
        await tarea(elemento);
      } catch {
        // La tarea ya decidió qué hacer con su fallo; el resto sigue
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(tope, elementos.length) }, trabajador));
};
