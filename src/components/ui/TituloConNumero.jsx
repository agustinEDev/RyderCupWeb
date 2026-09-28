import NumeroDeLaSeccion from './NumeroDeLaSeccion';

/**
 * El título de una sección con su número, para ir dentro de una fila flex.
 *
 * El texto ocupa lo que sobra y se parte si no cabe; el número, en su
 * pastilla, va al borde derecho y centrado en altura. Dentro del texto, a 360
 * px se quedaba solo en la línea siguiente. Así lo decidió Agustín en la
 * ronda 2 de pruebas, igual en todas las secciones de la ficha.
 */
const TituloConNumero = ({ texto, numero, claseDelTexto = '' }) => (
  <>
    <span className={`min-w-0 flex-1 ${claseDelTexto}`}>{texto}</span>
    <NumeroDeLaSeccion numero={numero} />
  </>
);

export default TituloConNumero;
