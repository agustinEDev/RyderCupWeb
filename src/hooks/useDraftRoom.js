import { useState, useEffect, useCallback, useRef } from 'react';
import { getDraftUseCase, startDraftUseCase, makeDraftPickUseCase } from '../composition';

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
const INTERVALO_MS = 5000;

/**
 * @param {string} competitionId
 * @param {string} userId - Quien mira, para saber si le toca elegir
 * @returns {Object} sala, cargando, error, segundosRestantes, esMiTurno y las acciones
 */
const useDraftRoom = (competitionId, userId) => {
  const [sala, setSala] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  // Si alguna vez se pudo ver: decide si se sigue esperando el sorteo
  const [cargadaUnaVez, setCargadaUnaVez] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(null);
  // El desfase entre el reloj del servidor y el del móvil, en milisegundos.
  // En una `ref` porque el contador lo lee cada segundo y cambiarlo no tiene
  // que volver a pintar nada por sí mismo
  const desfaseRef = useRef(0);
  // Qué respuesta es la última pedida. Sin esto, el refresco que salió ANTES
  // puede volver DESPUÉS de la elección y devolver la sala al estado anterior:
  // el jugador recién elegido reaparece en «por elegir», el capitán vuelve a
  // pulsar y se lleva un 409 que es mentira
  const generacionRef = useRef(0);

  const guardar = useCallback((nueva, generacion = generacionRef.current) => {
    // Una respuesta de antes ya no manda: lo que hay en pantalla es más nuevo
    if (generacion < generacionRef.current) return;
    setSala(nueva);
    if (nueva?.serverTime) {
      desfaseRef.current = Date.parse(nueva.serverTime) - Date.now();
    }
  }, []);

  /**
   * @param {boolean} limpiaElAviso - Falso al refrescar detrás de un aviso que
   *   la pantalla todavía tiene que enseñar, como el turno perdido: el refresco
   *   trae la sala nueva, y borrar el aviso dejaría al capitán sin saber por
   *   qué eligió otro por él
   */
  const cargar = useCallback(async (limpiaElAviso = true) => {
    const generacion = (generacionRef.current += 1);
    try {
      const nueva = await getDraftUseCase.execute(competitionId);
      guardar(nueva, generacion);
      setCargadaUnaVez(true);
      if (limpiaElAviso && generacion >= generacionRef.current) setError(null);
      return nueva;
    } catch (e) {
      // También el fallo respeta la generación: el GET que salió antes puede
      // fallar DESPUÉS de una elección correcta, y dejaría en pantalla un
      // error que ya no describe nada
      if (generacion >= generacionRef.current) setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [competitionId, guardar]);

  useEffect(() => {
    if (!competitionId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la carga inicial de una pantalla, el mismo patrón que el resto del repo tras el bump del plugin (ver SchedulePage)
    cargar();
  }, [competitionId, cargar]);

  // El refresco, mientras la sala está en marcha y también mientras se espera el
  // sorteo (#710): el capitán que entraba antes se quedaba en «todavía no se ha
  // lanzado» con su turno corriendo en el servidor. Si la PRIMERA carga falló,
  // no: una sala que no se puede ver no se pide cada cinco segundos. Un fallo
  // después (un 429, un corte) no para la espera
  const esperandoElSorteo = !cargando && sala === null && cargadaUnaVez;
  useEffect(() => {
    if (sala?.status !== 'IN_PROGRESS' && !esperandoElSorteo) return undefined;
    // `cargar(false)`: el refresco trae la sala nueva, pero no borra un aviso
    // que la pantalla todavía tiene que enseñar, como el turno perdido. Pasarlo
    // directo a `setInterval` lo llamaba sin argumentos y el aviso duraba tres
    // segundos
    const id = setInterval(() => cargar(false), INTERVALO_MS);
    return () => clearInterval(id);
  }, [sala?.status, esperandoElSorteo, cargar]);

  // El contador, segundo a segundo y sin volver a preguntar al servidor. Se
  // cuenta contra la hora del SERVIDOR: `Date.now()` más el desfase que dijo
  // la última respuesta. Vive en un estado y no en un valor derivado porque
  // leer el reloj al pintar es impuro —y el lint lo prohíbe—: la hora tiene
  // que entrar por el borde, que es este efecto
  useEffect(() => {
    if (sala?.status !== 'IN_PROGRESS' || !sala?.turnStartedAt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronizar con el reloj, que es un sistema externo
      setSegundosRestantes(null);
      return undefined;
    }
    const empezo = Date.parse(sala.turnStartedAt);
    // Una fecha que no se entiende da NaN, y de ahí salía un «NaN:NaN» en el
    // sitio del minuto: mejor sin contador que con uno imposible
    if (Number.isNaN(empezo) || !Number.isFinite(Number(sala.secondsPerTurn))) {
      setSegundosRestantes(null);
      return undefined;
    }
    const calcular = () => {
      const pasados = (Date.now() + desfaseRef.current - empezo) / 1000;
      setSegundosRestantes(Math.max(0, Math.round(sala.secondsPerTurn - pasados)));
    };
    // El primer valor, sin esperar al primer segundo
    calcular();
    const id = setInterval(calcular, 1000);
    return () => clearInterval(id);
  }, [sala?.status, sala?.turnStartedAt, sala?.secondsPerTurn]);

  const abrirSala = useCallback(async () => {
    try {
      guardar(await startDraftUseCase.execute(competitionId));
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
        generacionRef.current += 1;
        guardar(nueva);
        setError(null);
      } catch (e) {
        // 409: se le acabó el minuto y la aplicación eligió por él. No es un
        // fallo que contar como tal: la sala siguió sin él, y lo que toca es
        // enseñarle lo que pasó
        if (e?.status !== 409) {
          setError(e.message);
          await cargar(false);
          return;
        }
        // Con la sala que trae el 409, y no al pintar: si la app eligió al
        // penúltimo por él y el último entró solo, ya no le toca a nadie. Un
        // turno perdido de antes no cambia de texto cuando luego la cierra el
        // rival
        setError('turnoPerdido');
        const nueva = await cargar(false);
        if (nueva?.status === 'COMPLETED') setError('turnoPerdidoYTerminado');
      }
    },
    [competitionId, guardar, cargar]
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
    refrescar: cargar,
    abrirSala,
    elegir,
  };
};

export default useDraftRoom;
