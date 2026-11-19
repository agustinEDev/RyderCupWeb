// Reglas puras del mapa del hoyo: sin React, sin estado

/**
 * La salida que se pinta mientras se pide el green: la recién tocada o, pidiendo
 * solo el green, la aprobada (para ver desde dónde se mide). Reportando, la que
 * se propone.
 */
export const salidaQueSePinta = ({
  reporte,
  pidiendo,
  marca,
  marcandoSalida,
  hoyo,
}) => {
  if (reporte?.fase === 'green') return reporte.tee;
  if (!pidiendo) return null;
  return marca.tee ?? (marcandoSalida ? null : (hoyo?.playLine?.[0] ?? null));
};

// «⋮», solo en un hoyo con línea y sin marcar otra cosa (la pregunta de la
// salida solo sale en un hoyo sin línea)
export const sePuedeReportarElHoyo = ({
  onReporte,
  sinMapa,
  hoyo,
  reporte,
  pidiendo,
}) =>
  Boolean(onReporte) &&
  !sinMapa &&
  (hoyo?.playLine?.length ?? 0) >= 2 &&
  !reporte &&
  !pidiendo;

/**
 * La vista del zoom al green (`encuadreAlGreen`). Tras una marca la pidió el
 * jugador (`porElJugador`): se aplica aunque hubiera movido el mapa (Agustín,
 * 19 nov); la que llega sola con el GPS, no.
 */
export const vistaAlGreen = ({ hoyo, rumbo }, trasMarcar) => ({
  tipo: 'alGreen',
  hoyo,
  rumbo,
  ...(trasMarcar ? { porElJugador: true } : {}),
});
