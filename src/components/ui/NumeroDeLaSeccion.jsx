/**
 * El número de una sección, en su pastilla junto al título.
 *
 * Iba entre paréntesis dentro del propio texto («Solicitudes Pendientes (1)»)
 * y a 360 px el «(1)» se quedaba solo en la línea siguiente. Va dentro del
 * propio texto del título, tras un espacio que no se parte: si el título no
 * cabe, el número sigue a la última palabra («aprobados 3») y no a la caja
 * entera, donde se quedaba solo en el borde derecho.
 */
const NumeroDeLaSeccion = ({ numero, testId = 'numero-de-la-seccion' }) => (
  <span
    data-testid={testId}
    className="inline-block align-middle rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600"
  >
    {numero}
  </span>
);

export default NumeroDeLaSeccion;
