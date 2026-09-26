/**
 * El número de una sección, en su pastilla junto al título.
 *
 * Iba entre paréntesis dentro del propio texto («Solicitudes Pendientes (1)»)
 * y a 360 px el «(1)» se quedaba solo en la línea siguiente. Aparte, el texto
 * se parte si no cabe, pero el número nunca se separa de él.
 */
const NumeroDeLaSeccion = ({ numero, testId = 'numero-de-la-seccion' }) => (
  <span
    data-testid={testId}
    className="flex-none rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600"
  >
    {numero}
  </span>
);

export default NumeroDeLaSeccion;
