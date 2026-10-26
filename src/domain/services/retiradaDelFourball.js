/**
 * La retirada de un jugador de un fourball de torneo, vista desde la pantalla
 * de anotar (25 oct 2026, tabla F1–F10; regla en RyderCupAM#665).
 *
 * El backend decide y rechaza lo que no vale; aquí solo se calcula qué ofrecer,
 * para no enseñar un botón que va a devolver un 409: solo fourball, programado o
 * en juego, sin tarjetas entregadas, y nunca dejar un bando sin nadie.
 */
const ESTADOS_EN_JUEGO = new Set(['SCHEDULED', 'IN_PROGRESS']);

const NADA = Object.freeze({
  pareja: null,
  yoRetirado: false,
  retirarme: false,
  retirarPareja: false,
  volver: false,
  deshacerPareja: false,
});

/**
 * @param {object|null} vista - La vista de anotar (`ScoringMapper`)
 * @param {string} yo - El id de quien mira
 * @returns {{pareja: {userId: string, userName: string}|null, yoRetirado: boolean,
 *   retirarme: boolean, retirarPareja: boolean, volver: boolean, deshacerPareja: boolean}}
 */
export const opcionesDeRetirada = (vista, yo) => {
  const jugadores = vista?.players ?? [];
  const mio = jugadores.find((p) => p.userId === yo);
  if (!mio) return NADA;
  const retirados = vista.withdrawnPlayerIds ?? [];
  const companero = jugadores.find((p) => p.team === mio.team && p.userId !== yo) ?? null;
  const pareja = companero ? { userId: companero.userId, userName: companero.userName } : null;
  const disponible =
    vista.matchFormat === 'FOURBALL' &&
    ESTADOS_EN_JUEGO.has(vista.matchStatus) &&
    (vista.scorecardSubmittedBy ?? []).length === 0;
  if (!disponible) return { ...NADA, pareja, yoRetirado: retirados.includes(yo) };

  const yoRetirado = retirados.includes(yo);
  const parejaRetirada = Boolean(pareja) && retirados.includes(pareja.userId);
  // Con uno de los dos fuera, el otro es el último del bando: no se retira
  const bandoCompleto = Boolean(pareja) && !yoRetirado && !parejaRetirada;
  return {
    pareja,
    yoRetirado,
    retirarme: bandoCompleto,
    retirarPareja: bandoCompleto,
    volver: yoRetirado,
    deshacerPareja: parejaRetirada,
  };
};

/**
 * A quiénes marco, en el orden del backend y sin repetir: con mi pareja
 * retirada, también al rival que ella marcaba (F5).
 */
export const aQuienesMarco = (asignaciones, yo) => [
  ...new Set((asignaciones ?? []).filter((a) => a.scorerUserId === yo).map((a) => a.marksUserId)),
];

/**
 * Si la bola de una fila cuenta para cerrar el hoyo: la del retirado, solo si
 * ya estaba validada (F6, como `BolasFuera.cuenta` en el backend).
 */
export const cuentaLaBola = (fila, retirados) =>
  !(retirados ?? []).includes(fila.userId) || fila.validationStatus === 'match';
