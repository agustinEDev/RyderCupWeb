import { Link } from 'react-router';

/** El nombre de una persona: enlace a su perfil si lo hay, texto si no. */
export const NombreDePersona = ({ persona }) =>
  persona.enlace ? (
    <Link to={persona.enlace} className="relative z-10 font-semibold text-gray-900 hover:underline">
      {persona.nombre}
    </Link>
  ) : (
    <span className="font-semibold text-gray-900">{persona.nombre}</span>
  );

/**
 * Pinta una frase de Actividad troceada por `fraseCon`: el texto tal cual y
 * cada persona con su enlace. Los enlaces van por encima del de la tarjeta.
 */
const FraseDeActividad = ({ frase }) =>
  frase.trozos.map((trozo, i) =>
    trozo.tipo === 'persona' ? (
      <NombreDePersona key={i} persona={trozo.persona} />
    ) : (
      <span key={i}>{trozo.valor}</span>
    )
  );

export default FraseDeActividad;
