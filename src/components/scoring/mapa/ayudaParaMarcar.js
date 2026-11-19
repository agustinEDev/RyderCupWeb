import { codosDelPar } from '../../../domain/services/hoyoMarcado';

// Reglas puras de la ayuda para marcar un hoyo sin datos: sin React, sin estado

const marcando = (fase) => fase === 'pregunta' || fase === 'pidiendo';

/**
 * Si se ve la guía «Marca este hoyo»: la primera vez que se empieza a marcar
 * (G1) o cuando se pide con el «?» (B1). Sin WebGL no hay nada que tocar, y
 * reportando no se marca (G4). Hasta saber que hay mapa (`sinMapa` null) no
 * se abre: si luego no lo hay, se iría sola y el foco con ella (revisor, 19 nov).
 */
export const seVeLaGuia = ({ fase, sinMapa, reporte, vista, pedida }) =>
  sinMapa === false && !reporte && (pedida || (!vista && marcando(fase)));

/**
 * Si se sabe SEGURO que al tocar el green sobre la línea aprobada habrá puntos
 * que llevar a la calle (y la placa del último paso): solo sin puntos en medio
 * (la salida, o salida y final) y en un par con codos. Con puntos en medio
 * depende de dónde se toque el green (la línea se reduce contra él), así que no
 * se sabe: el aviso va sin número, y si al final hay puntos, la placa sale
 * igual (Agustín, 19 nov).
 */
export const habraPuntosQueArrastrar = (aprobada, par) =>
  aprobada.length >= 1 && aprobada.length <= 2 && codosDelPar(par) > 0;

/**
 * El «Paso N de M» del aviso de lo que se pide (P1-P3). La pregunta de la
 * salida no lleva número (P5). La curva cuenta como paso solo si habrá placa
 * del último paso; si no, un paso suelto va sin número (Agustín, 19 nov): el
 * par 3 (sin puntos que arrastrar), el green tras el «No», solo la salida con el green ya puesto y
 * solo el green sobre una línea aprobada que ya trae los codos de su par.
 *
 * @returns {{n: number, de: number}|null}
 */
export const pasoDeLaMarca = ({
  pidiendo,
  marca,
  marcandoSalida,
  greenYaPuesto,
  par,
  lineaAprobada = [],
}) => {
  if (!pidiendo) return null;
  // Tras el «No», el green se mide desde ti: no hay línea ni placa
  if (marca.soloGreen) return null;
  if (!marcandoSalida)
    return habraPuntosQueArrastrar(lineaAprobada, par) ? { n: 1, de: 2 } : null;
  const de = par === 3 ? 2 : 3;
  if (marca.tee) return { n: 2, de };
  return greenYaPuesto ? null : { n: 1, de };
};

/**
 * Los puntos de la placa «Último paso» (P4), o 0 sin placa: tras guardar, los
 * que puso la app y quedan por llevar a la calle (`conAyudaDeCodos`; un par 3
 * no tiene; se van al arrastrar uno o con «Listo»). No cuenta los codos que ya
 * traía la línea. Con un aviso de la marca delante, espera a que se resuelva.
 */
export const puntosDelUltimoPaso = ({ conAyudaDeCodos, avisoDeMarca }) =>
  avisoDeMarca ? 0 : Number(conAyudaDeCodos);
