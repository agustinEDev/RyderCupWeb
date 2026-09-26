import NumeroDeLaSeccion from './NumeroDeLaSeccion';

/**
 * El título de una sección con su número al final.
 *
 * La última palabra y el número van en un bloque que no se parte. Con solo un
 * espacio que no se parte delante de la pastilla, el navegador aún cortaba
 * antes de ella y el número caía solo a la línea siguiente (visto en el Kind a
 * 360 px). Así, si el título no cabe, baja «rechazadas 2» entero.
 */
const TituloConNumero = ({ texto, numero }) => {
  const corte = texto.lastIndexOf(' ');
  const principio = corte >= 0 ? texto.slice(0, corte + 1) : '';
  const ultima = corte >= 0 ? texto.slice(corte + 1) : texto;
  return (
    <>
      {principio}
      <span className="whitespace-nowrap">
        <span>{ultima}</span>
        {' '}
        <NumeroDeLaSeccion numero={numero} />
      </span>
    </>
  );
};

export default TituloConNumero;
