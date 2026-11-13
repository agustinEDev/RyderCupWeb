import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';
import { getDraftUseCase, startDraftUseCase, makeDraftPickUseCase } from '../composition';
import { useCargaCancelableEffect } from './useCargaCancelableEffect';

/**
 * La sala de draft en directo (FE #653).
 *
 * Dos decisiones que vienen del diseño del 22 sep:
 *
 * - **El contador se dibuja contra la hora del SERVIDOR.** La respuesta trae
 *   `server_time`, y de ahí sale el desfase con el reloj del móvil. Contando
 *   con el reloj local, un móvil adelantado daría el turno por perdido antes
 *   de tiempo y otro atrasado seguiría contando cuando ya eligió la app.
 * - **Se refresca sola cada pocos segundos**, que es además lo que hace que el
 *   servidor resuelva los turnos agotados: no hay ningún proceso de fondo
 *   contándolos (igual que la anotación se abre sola al llegar el primer
 *   golpe). Terminada la sala deja de preguntar: ya no cambia nada.
 *
 * Sin websockets, como el resto de la aplicación: un draft son doce minutos,
 * y el polling ya se usa en la clasificación y en la anotación.
 */
// Cinco segundos: la sala la miran los doce a la vez y **comparten el mismo
// cubo de rate limit** (ADR-038, un cubo por IP y el proxy es la misma IP para
// todos). A tres segundos, doce móviles pasan de 240 peticiones por minuto
// contra un endpoint limitado, y la ceremonia entera se cae con 429 —y con
// ella el turno agotado, que lo resuelve justo este GET—. El resto de pollings
// del producto van a 10 s, 30 s y 60 s; aquí se baja a 5 porque lo que se
// espera es la elección del rival, y el contador no depende de esto
// Los avisos que cuentan lo que pasó: un refresco no los borra
const AVISOS_QUE_SE_QUEDAN = new Set(['turnoPerdido', 'turnoPerdidoYTerminado']);
const INTERVALO_MS = 5000;

/**
 * El reloj de la sala, en hora del SERVIDOR: `Date.now()` más el desfase que
 * dijo la última respuesta. Late cada segundo mientras alguien lo escucha, y
 * la pantalla lee su hora al pintar (useSyncExternalStore): la hora entra por
 * el borde, no se lee el reloj del móvil dentro del render.
 *
 * Uno por sala montada y no uno del módulo: compartido, arrastraba su hora de
 * una pantalla (o de un test) a la siguiente.
 */
const crearReloj = () => {
  let desfase = 0;
  let ahoraEnElServidor = 0;
  const oyentes = new Set();
  const ponerEnHora = () => {
    ahoraEnElServidor = Date.now() + desfase;
  };
  const latir = () => {
    ponerEnHora();
    oyentes.forEach((avisar) => avisar());
  };
  return {
    // El desfase nuevo se nota en el siguiente latido, no al llegar: dentro del
    // mismo turno, el contador no salta de golpe con cada refresco
    fijarDesfase: (ms) => {
      desfase = ms;
    },
    // Sin avisar: lo lee el pintado que trae la sala nueva, que ya va a llegar.
    // Avisando, salía antes un pintado con la sala vieja y la hora nueva
    ponerEnHora,
    suscribir: (avisar) => {
      oyentes.add(avisar);
      const id = setInterval(latir, 1000);
      return () => {
        clearInterval(id);
        oyentes.delete(avisar);
      };
    },
    leer: () => ahoraEnElServidor,
  };
};
// Sin turno en marcha no hay nada que contar: nadie escucha el reloj
const sinReloj = () => () => {};

/**
 * @param {string} competitionId
 * @param {string} userId - Quien mira, para saber si le toca elegir
 * @returns {Object} sala, cargando, error, segundosRestantes, esMiTurno y las acciones
 */
const useDraftRoom = (competitionId, userId) => {
  const [sala, setSala] = useState(null);
  const [error, setError] = useState(null);
  // Qué competición se pudo ver alguna vez: decide si se sigue esperando el sorteo
  const [cargadaPara, setCargadaPara] = useState(null);
  // La espera de pantalla completa solo hasta la PRIMERA carga, como siempre:
  // al pasar de una competición a otra sin salir no vuelve
  const [primeraTerminada, setPrimeraTerminada] = useState(false);
  const [reloj] = useState(crearReloj);
  // El turno que cuenta el reloj: al cambiar se pone en hora ya, para que el
  // primer pintado del turno nuevo no enseñe el número del anterior
  const turnoRef = useRef(null);
  // Una respuesta de antes no puede devolver la sala al estado anterior: el
  // refresco que salió ANTES de una elección (o de lanzar el sorteo) y vuelve
  // DESPUÉS resucitaba al jugador ya elegido, o la sala a «todavía no se ha
  // lanzado». `escrituraRef` sube con cada elección o apertura que deja la
  // sala en pantalla; `leidaTrasRef`, con cuál salió la lectura vigente
  const escrituraRef = useRef(0);
  const leidaTrasRef = useRef(0);

  const guardar = useCallback(
    (nueva) => {
      if (nueva?.serverTime) reloj.fijarDesfase(Date.parse(nueva.serverTime) - Date.now());
      const turno = `${nueva?.status}|${nueva?.turnStartedAt}|${nueva?.secondsPerTurn}`;
      if (turno !== turnoRef.current) {
        turnoRef.current = turno;
        reloj.ponerEnHora();
      }
      setSala(nueva);
    },
    [reloj]
  );

  // La carga de la sala, y cada refresco es un `recargar` silencioso: el que
  // llega cuando ya salió otro más nuevo (o tras cambiar de competición, o al
  // salir) no se aplica ni avisa de su fallo
  const { recargar } = useCargaCancelableEffect(
    () => {
      leidaTrasRef.current = escrituraRef.current;
      return getDraftUseCase.execute(competitionId);
    },
    [competitionId],
    {
      activa: Boolean(competitionId),
      // `silenciosa`: un refresco trae la sala nueva pero no borra un aviso
      // que la pantalla todavía tiene que enseñar, como el turno perdido, que
      // dejaría al capitán sin saber por qué eligió otro por él. Sí borra un
      // error de red que ya se ha superado
      alCargar: (nueva, { silenciosa }) => {
        setPrimeraTerminada(true);
        if (leidaTrasRef.current < escrituraRef.current) return;
        guardar(nueva);
        // De ESTA competición: si se cambia de una a otra, lo cargado de la
        // anterior no dice nada de la nueva (CodeRabbit en la #720)
        setCargadaPara(competitionId);
        setError((antes) => (!silenciosa || !AVISOS_QUE_SE_QUEDAN.has(antes) ? null : antes));
      },
      // También el fallo: el GET que salió antes puede fallar DESPUÉS de una
      // elección correcta, y dejaría un error que ya no describe nada
      alFallar: (e) => {
        setPrimeraTerminada(true);
        if (leidaTrasRef.current < escrituraRef.current) return;
        setError(e.message);
      },
    }
  );
  const cargando = !primeraTerminada;

  // El refresco, mientras la sala está en marcha y también mientras se espera el
  // sorteo (#710): el capitán que entraba antes se quedaba en «todavía no se ha
  // lanzado» con su turno corriendo en el servidor. Si la PRIMERA carga falló,
  // no: una sala que no se puede ver no se pide cada cinco segundos. Un fallo
  // después (un 429, un corte) no para la espera
  const esperandoElSorteo = !cargando && sala === null && cargadaPara === competitionId;
  useEffect(() => {
    if (sala?.status !== 'IN_PROGRESS' && !esperandoElSorteo) return undefined;
    const id = setInterval(() => recargar({ silenciosa: true }), INTERVALO_MS);
    return () => clearInterval(id);
  }, [sala?.status, esperandoElSorteo, recargar]);

  // El contador, segundo a segundo y sin volver a preguntar al servidor,
  // derivado al pintar de la sala y de la hora del reloj del servidor. Una
  // fecha que no se entiende da NaN, y de ahí salía un «NaN:NaN» en el sitio
  // del minuto: mejor sin contador que con uno imposible
  const empezo = sala?.turnStartedAt ? Date.parse(sala.turnStartedAt) : Number.NaN;
  const porTurno = Number(sala?.secondsPerTurn);
  const hayContador = sala?.status === 'IN_PROGRESS' && !Number.isNaN(empezo) && Number.isFinite(porTurno);
  const ahora = useSyncExternalStore(hayContador ? reloj.suscribir : sinReloj, reloj.leer);
  const segundosRestantes = hayContador
    ? Math.max(0, Math.round(porTurno - (ahora - empezo) / 1000))
    : null;

  const abrirSala = useCallback(async () => {
    try {
      const nueva = await startDraftUseCase.execute(competitionId);
      // La sala recién abierta manda sobre el refresco de la espera en vuelo
      escrituraRef.current += 1;
      guardar(nueva);
      setError(null);
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }, [competitionId, guardar]);

  const elegir = useCallback(
    async (playerId) => {
      try {
        // La elección manda sobre cualquier refresco en vuelo: su respuesta es
        // posterior a todos ellos
        const nueva = await makeDraftPickUseCase.execute(competitionId, playerId);
        escrituraRef.current += 1;
        guardar(nueva);
        setError(null);
      } catch (e) {
        // 409: se le acabó el minuto y la aplicación eligió por él. No es un
        // fallo que contar como tal: la sala siguió sin él, y lo que toca es
        // enseñarle lo que pasó
        if (e?.status !== 409) {
          setError(e.message);
          await recargar({ silenciosa: true });
          return;
        }
        // Con la sala de la recarga, y no al pintar: si la app eligió al
        // penúltimo por él y el último entró solo, ya no le toca a nadie. Un
        // turno perdido de antes no cambia de texto cuando luego la cierra el
        // rival. Si un refresco sustituye a la recarga, trae lo de ese
        // refresco, que es más nuevo
        setError('turnoPerdido');
        const recarga = await recargar({ silenciosa: true });
        if (recarga.estado === 'cargada' && recarga.datos?.status === 'COMPLETED') {
          setError('turnoPerdidoYTerminado');
        }
      }
    },
    [competitionId, guardar, recargar]
  );

  const capitanDeTurno =
    sala?.currentTeam === 'A'
      ? sala?.teamACaptainId
      : sala?.currentTeam === 'B'
        ? sala?.teamBCaptainId
        : null;

  return {
    sala,
    cargando,
    error,
    segundosRestantes,
    esMiTurno: Boolean(userId) && capitanDeTurno === userId,
    abrirSala,
    elegir,
  };
};

export default useDraftRoom;
