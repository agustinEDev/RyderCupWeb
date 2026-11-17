/**
 * El otro nombre de una persona, pequeño debajo del que va delante (SB-08).
 *
 * El alias es el apodo con el que te conocen tus amigos, no un dato oculto
 * (Agustín, 17 nov 2026): debajo del alias va el nombre real, y debajo del nombre
 * real (competiciones públicas), el alias. El texto lo calcula `nombrePequeno`
 * (`utils/nombreVisible`); aquí solo se pinta, igual en todas las pantallas.
 * Sin texto no ocupa sitio. Se corta con puntos suspensivos: nunca empuja la fila.
 *
 * @param {object} props
 * @param {string|null|undefined} props.texto - El otro nombre, o nada
 * @param {string} [props.className] - Para ajustar el color en fondos de color
 */
const NombrePequeno = ({ texto, className = 'text-gray-500' }) =>
  texto ? (
    <span
      data-testid="nombre-pequeno"
      className={`block truncate text-xs font-normal ${className}`}
    >
      {texto}
    </span>
  ) : null;

export default NombrePequeno;
