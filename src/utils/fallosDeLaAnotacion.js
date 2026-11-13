// Los fallos de la anotación de competición (`useScoring`) y de dónde salieron.

// Un fallo y de dónde salió (FE #626). La pantalla cuenta distinto que no
// cargara la vista que no se pudiera anotar, entregar o conceder: lo primero se
// calla si lo que se ve sale de la foto —el aviso ámbar ya lo dice— y lo otro se
// dice siempre, con su texto. Vivían en el mismo estado sin forma de
// distinguirlos, y el recuadro rojo tomaba cualquier fallo por uno de carga.
// Y de qué partido es: la ruta no lleva `key`, así que ir de uno a otro
// reutiliza el hook, y el fallo del anterior no es del nuevo (CodeRabbit en la
// PR #627)
const falloDe = (origen) => (err, matchId) => (err ? { err, origen, matchId } : null);
export const deCarga = falloDe('carga');
export const delGolpe = falloDe('golpe');
export const deLaTarjeta = falloDe('tarjeta');
export const deLaConcesion = falloDe('concesion');
export const deLaRetirada = falloDe('retirada');

// Un 409 de la retirada trae su motivo (RyderCupAM#665): se explica con su texto
export const conClaveDeRetirada = (err) => {
  const motivo = err?.errorCode === 'WITHDRAWAL_NOT_ALLOWED' ? err?.data?.reason : null;
  return motivo ? Object.assign(err, { i18nKey: `withdraw.errors.${motivo}` }) : err;
};
// Un fallo de carga no pisa el de una acción del mismo partido: con el servidor
// caído el sondeo falla cada 10 s, y el aviso de un golpe que no se guardó
// duraba hasta el siguiente. Salvo que desmienta el partido —ya no está, no es
// tuyo, no hay sesión—, que manda sobre todo. Fuera del hook y no en línea: una
// función creada dentro del `catch` hace que el análisis de `react-hooks`
// abandone el hook entero
export const trasFallarLaCarga = (err, desmiente, matchId) => (antes) =>
  (antes && antes.matchId === matchId && antes.origen !== 'carga' && !desmiente
    ? antes
    : deCarga(err, matchId));
