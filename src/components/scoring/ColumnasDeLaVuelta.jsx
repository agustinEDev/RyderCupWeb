/**
 * El reparto de columnas de la tarjeta horizontal, el mismo para la ida y la
 * vuelta (FE #938; Agustín, 24 oct 2026). Son dos tablas, y con el ancho
 * automático cada una medía sus columnas por su cuenta: el hoyo 1 no caía
 * encima del 10. Con `table-fixed` y estas columnas, la primera, la del tramo
 * y la del total miden lo mismo en las dos, y los hoyos se reparten el resto a
 * partes iguales.
 *
 * La última columna es la del TOTAL: la tabla que no lo lleva deja el hueco.
 */
export const CLASE_DE_LA_TABLA = 'w-full min-w-[32rem] table-fixed text-xs';

const ColumnasDeLaVuelta = ({ hoyos, anchoPrimera }) => (
  <colgroup>
    <col className={anchoPrimera} />
    {hoyos.map((h) => (
      <col key={h.holeNumber} />
    ))}
    <col className="w-14" />
    <col className="w-14" />
  </colgroup>
);

export default ColumnasDeLaVuelta;
