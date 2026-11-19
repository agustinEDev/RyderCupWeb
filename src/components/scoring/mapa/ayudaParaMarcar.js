// Reglas puras de la ayuda para marcar un hoyo sin datos: sin React, sin estado

const marcando = (fase) => fase === 'pregunta' || fase === 'pidiendo';

/**
 * Si se ve la guía «Marca este hoyo»: la primera vez que se empieza a marcar
 * (G1) o cuando se pide con el «?» (B1). Sin WebGL no hay nada que tocar, y
 * reportando no se marca (G4).
 */
export const seVeLaGuia = ({ fase, sinMapa, reporte, vista, pedida }) =>
  !sinMapa && !reporte && (pedida || (!vista && marcando(fase)));

/**
 * El «Paso N de M» del aviso de lo que se pide (P1-P3). La pregunta de la
 * salida no lleva número (P5). La curva cuenta como paso, salvo en un par 3,
 * que no tiene puntos que arrastrar (Agustín, 19 nov): ahí, si solo falta el
 * green, sin número. Con el green ya puesto la tabla no dice nada: sin número.
 *
 * @returns {{n: number, de: number}|null}
 */
export const pasoDeLaMarca = ({
  pidiendo,
  marca,
  marcandoSalida,
  greenYaPuesto,
  par,
}) => {
  if (!pidiendo) return null;
  const conCurva = par !== 3;
  if (marca.soloGreen || !marcandoSalida)
    return conCurva ? { n: 1, de: 2 } : null;
  const de = conCurva ? 3 : 2;
  if (marca.tee) return { n: 2, de };
  return greenYaPuesto ? null : { n: 1, de };
};

/**
 * La placa «Último paso» (P4): tras guardar, mientras quedan puntos puestos por
 * nosotros que llevar a la calle (`conAyudaDeCodos`: un par 3 no tiene; se va
 * al arrastrar uno o con «Listo»). Con un aviso de la marca delante, espera a
 * que se resuelva.
 */
export const seVeElUltimoPaso = ({ conAyudaDeCodos, avisoDeMarca }) =>
  conAyudaDeCodos && !avisoDeMarca;
