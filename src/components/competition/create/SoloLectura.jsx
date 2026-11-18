/**
 * Lo que no se toca con la competición cerrada por el plazo: desactivado, no
 * escondido (15 nov 2026). Sin eso, lo de dentro queda igual que siempre.
 */
const SoloLectura = ({ activa, className, children }) =>
  activa ? (
    <fieldset disabled className={`min-w-0 ${className ?? ''}`}>
      {children}
    </fieldset>
  ) : (
    children
  );

export default SoloLectura;
