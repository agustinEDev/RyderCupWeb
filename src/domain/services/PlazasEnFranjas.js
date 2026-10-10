/**
 * Qué puede hacer un jugador en cada franja de un stroke play (FE #824, PR 4).
 *
 * Las reglas son las del backend (RyderCupAm#511 y #512), que es quien manda;
 * aquí están para ofrecer solo lo que tiene sentido:
 *
 *   - Una franja por jornada, y como mucho M jornadas por jugador.
 *   - Con sitio: coger plaza; si ya juega ese día, cambiarse desde la suya; y
 *     con las jornadas llenas, «cambiar por esta» dejando una de las suyas
 *     (decidido con Agustín el 10 oct 2026). Cambiarse es un solo paso: si la
 *     nueva falla, no pierde la vieja.
 *   - Llena: esperar, solo en un día en que no juega y con jornadas libres
 *     (la espera es para conseguir jornada, no para cambiarse).
 *   - En la suya, soltar; en la que espera, salir de la espera.
 *
 * La agenda no dice «la mía»: sale de quién juega y quién espera en cada una.
 */

export const COGER = 'COGER';
export const CAMBIAR = 'CAMBIAR';
export const SOLTAR = 'SOLTAR';
export const ESPERAR = 'ESPERAR';
export const DEJAR_DE_ESPERAR = 'DEJAR_DE_ESPERAR';

/**
 * @param {Array<{id: string, roundDate: string, teeSheet: Object|null}>} franjas
 * @param {string} userId
 * @param {number} [maxJornadas] - Las jornadas por jugador; sin ellas, una
 * @returns {{jornadas: {juega: number, maximo: number}, porFranja: Object<string, Object|null>}}
 */
export const situacionEnLasFranjas = (franjas, userId, maxJornadas) => {
  const conHoja = franjas.filter((f) => f.teeSheet);
  const mias = conHoja.filter((f) => f.teeSheet.playerIds.includes(userId));
  const diasQueJuega = new Set(mias.map((f) => f.roundDate));
  const maximo = maxJornadas ?? 1;
  const jornadasLlenas = diasQueJuega.size >= maximo;

  const accionEn = (f) => {
    if (!f.teeSheet) return null;
    const { playerIds, waitingIds, placesTaken, capacity } = f.teeSheet;
    if (playerIds.includes(userId)) return { tipo: SOLTAR };
    const enEspera = waitingIds.indexOf(userId);
    if (enEspera >= 0) return { tipo: DEJAR_DE_ESPERAR, posicion: enEspera + 1 };

    const delMismoDia = mias.filter((m) => m.roundDate === f.roundDate).map((m) => m.id);
    const hayHueco = placesTaken < capacity;
    if (hayHueco) {
      if (delMismoDia.length > 0) return { tipo: CAMBIAR, dejar: delMismoDia };
      if (!jornadasLlenas) return { tipo: COGER };
      return { tipo: CAMBIAR, dejar: mias.map((m) => m.id) };
    }
    if (delMismoDia.length === 0 && !jornadasLlenas) return { tipo: ESPERAR };
    return null;
  };

  return {
    jornadas: { juega: diasQueJuega.size, maximo },
    porFranja: Object.fromEntries(franjas.map((f) => [f.id, accionEn(f)])),
  };
};

/**
 * Adónde puede mover el organizador a un jugador desde una de sus franjas: a
 * otra con sitio del mismo día (es cambiarse) o de un día en que no juega. Las
 * demás el servidor las rechaza (una franja por jornada). Aquí, junto a las
 * reglas del jugador, para que no se separen (/code-review).
 */
export const destinosParaMover = (franjas, userId, desdeId) => {
  const desde = franjas.find((f) => f.id === desdeId);
  const diasQueJuega = new Set(
    franjas.filter((f) => f.teeSheet?.playerIds.includes(userId)).map((f) => f.roundDate)
  );
  return franjas.filter(
    (f) =>
      f.id !== desdeId &&
      f.teeSheet &&
      f.teeSheet.placesTaken < f.teeSheet.capacity &&
      (f.roundDate === desde?.roundDate || !diasQueJuega.has(f.roundDate))
  );
};
