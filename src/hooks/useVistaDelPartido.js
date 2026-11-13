import { useState, useEffect, useCallback, useRef } from 'react';
import { loQueSeSupo, olvida, recuerda } from '../services/loUltimoConocido';
import { trasFallarLaCarga } from '../utils/fallosDeLaAnotacion';

/**
 * La petición de la vista de la anotación de competición, de `useScoring`:
 * qué respuesta vale todavía, de qué partido es y si lo que se pinta sale de
 * la foto del móvil. El estado de la vista, la espera y el fallo son del hook
 * que la usa: aquí llegan sus `set`.
 */
export const useVistaDelPartido = ({
  matchId,
  currentUserId,
  isOffline,
  leeLaVista,
  setScoringView,
  setFallo,
  setIsLoading,
}) => {
  // Una vista más vieja que otra ya aplicada no puede aplicarse después: traería
  // el hoyo como estaba y pisaría lo que acaba de entrar. Cada petición de la
  // vista toma un número al salir; al aplicarse, ese número pasa a ser «lo último
  // aplicado», y lo mismo cuando llega un envío, cuya respuesta ya trae el golpe.
  // Se descarta solo lo más viejo que eso (FE #606; partida rápida, FE #607):
  // - NO «salió otra después», como hacía partida rápida: aquí se sondea cada 10 s
  //   sin esperar al anterior y las peticiones no tienen tope, así que con mala
  //   cobertura cada respuesta llegaría con otra ya en camino y la vista no se
  //   movería nunca
  // - NI solo «salió antes del último envío»: con dos sondeos solapados, el viejo
  //   llegando detrás del nuevo hacía retroceder la vista
  const relojRef = useRef(0);
  const ultimaAplicadaRef = useRef(0);
  const marcaEscritura = useCallback(() => {
    ultimaAplicadaRef.current = ++relojRef.current;
  }, []);

  // El partido que está en pantalla AHORA. La ruta no lleva `key`, así que ir de
  // un partido a otro reutiliza este hook con las peticiones del anterior aún en
  // camino: lo que conteste tarde no se pinta en el nuevo, ni cuenta como lo último
  // aplicado, que haría descartar la vista del nuevo. Como `idVigenteRef` en
  // partida rápida
  const partidaVigenteRef = useRef(matchId);
  useEffect(() => {
    partidaVigenteRef.current = matchId;
  }, [matchId]);
  const esDeOtraPartida = useCallback(
    (id) => id !== partidaVigenteRef.current,
    [],
  );

  // Si lo que hay en pantalla salió de la foto del móvil y no del servidor. La
  // pantalla lo dice en ámbar: sin esto se pintaba la vista entera —resultado,
  // tarjeta, botón de entregar— como si fuera lo de ahora mismo, y con un 5xx eso
  // pasa CON cobertura, donde nadie sospecha nada. Como `pintadoDeMemoria` en
  // partida rápida
  // De qué partido es la foto que se está pintando, o `null` si lo que se ve
  // viene del servidor. Guarda el identificador y no un booleano por lo mismo que
  // `vistaDeRef`: así el aviso del partido anterior no se hereda sin tener que
  // reiniciarlo en un efecto, y la comparación de la que sale se hace entre dos
  // valores normales —estado y prop—, sin leer una referencia en el render, que
  // es lo que prohíbe `react-hooks/refs`
  const [memoriaDe, setMemoriaDe] = useState(null);

  // Si hay algo pintado ya, sea del servidor o de la foto. Lo guardado sirve para
  // ARRANCAR sin señal, no para corregir una pantalla que ya funciona, y con el
  // estado no se puede mirar: meter `scoringView` en las dependencias de la
  // petición la recrearía en cada cambio de vista y reiniciaría el sondeo. Como
  // `hayPartidaRef` en partida rápida
  // De QUÉ partido es lo que hay pintado, no un simple «hay algo». Con un
  // booleano había que reiniciarlo al cambiar de partido —si no, la vista del
  // anterior contaba como pintada y bloqueaba la foto del nuevo, que se quedaba
  // con los hoyos del viejo bajo su URL (CodeRabbit en la PR #616)— y ese
  // reinicio tiene que vivir en un efecto, que es justo lo que
  // `react-hooks/immutability` prohíbe para un valor que también se escribe en
  // la petición. Guardando el identificador no hay nada que sincronizar: la
  // pregunta «¿hay vista de ESTE partido?» se responde comparando
  const vistaDeRef = useRef(null);

  // Devuelve la vista si el servidor contestó con la de ESTE partido y se pintó,
  // y `null` si no: el sondeo la necesita para saber si merece la pena vaciar
  // la cola, y si el partido ya abre (FE #625)
  const fetchScoringView = useCallback(async () => {
    if (!matchId) return null;
    const salio = ++relojRef.current;
    const esVieja = () =>
      esDeOtraPartida(matchId) || salio < ultimaAplicadaRef.current;
    try {
      const data = await leeLaVista.execute(matchId);
      if (esVieja()) return null;
      ultimaAplicadaRef.current = salio;
      setScoringView(data);
      setFallo(null);
      setMemoriaDe(null);
      vistaDeRef.current = matchId;
      // La foto de lo último que se supo, para poder anotar al reabrir la
      // aplicación en el campo (FE #614). Va DESPUÉS de la guarda: una respuesta
      // vieja no pinta, así que tampoco puede guardarse. Solo lo que dio el
      // backend, como en partida rápida; aquí basta con una cosa porque esta
      // vista ya trae hoyos, pares, jugadores y golpes en la misma respuesta.
      // Si no cabe, `recuerda` devuelve `false` y no pasa nada más: el sitio es
      // compartido con la cola de golpes sin enviar, y perder eso sí sería grave.
      //
      // Solo las partidas que se juegan: las tres plazas que caben se comparten
      // con partida rápida, y mirar dos partidos ajenos desde el calendario
      // desalojaba la foto de la propia, que es la que hace falta en el campo.
      // Sale de la RESPUESTA y no de `isMatchPlayer`, que se deriva del estado y
      // en la primera carga todavía va vacío
      const laJuego = data.players?.some((p) => p.userId === currentUserId);
      if (laJuego) recuerda(matchId, { partida: data, campo: null });
      return data;
    } catch (err) {
      const estado = err?.status ?? err?.response?.status;
      // Una respuesta CON estado es una respuesta: si el servidor dice que ese
      // partido no está —o que no es tuyo— pintarlo desde el móvil sería enseñar
      // algo que no existe, y dejar anotar encima
      if ((estado === 404 || estado === 403) && !esVieja()) olvida(matchId);
      // El 401 no borra la foto AQUÍ, pero que sobreviva no se puede prometer: si
      // la sesión ha caducado de verdad, el interceptor cierra sesión antes de que
      // esto corra y `olvidaLoDeEstaCuenta` la borra y cierra el almacén. Esta
      // rama cubre los 401 que llegan sin cierre —sin sesión guardada no se
      // intenta refrescar, y uno que no se clasifica como caducidad se relanza—.
      // Un 5xx no desmiente nada —el backend está mal, el partido sigue ahí— y es
      // justo cuando lo guardado hace falta
      const desmentido = estado === 401 || estado === 403 || estado === 404;
      // Solo si no hay NADA en pantalla: lo guardado sirve para ARRANCAR sin
      // señal, no para corregir una pantalla que ya está funcionando
      if (!desmentido && !esVieja() && vistaDeRef.current !== matchId) {
        const recordado = loQueSeSupo(matchId);
        if (recordado?.partida) {
          setScoringView(recordado.partida);
          vistaDeRef.current = matchId;
          // Y que se sepa: la pantalla lo dice en ámbar. Con un 5xx esto ocurre
          // CON cobertura, donde nadie sospecha que está viendo una foto de antes
          setMemoriaDe(matchId);
        }
      }
      if (!isOffline && !esVieja()) {
        // Sin pisar lo que falló al anotar, entregar o conceder (FE #626)
        setFallo(trasFallarLaCarga(err, desmentido, matchId));
      }
      return null;
    } finally {
      setIsLoading(false);
    }
    // `currentUserId` entra porque la guarda de arriba lo lee: solo se guarda la
    // foto de las partidas que juegas. Recrea la petición —y reinicia el sondeo—
    // al cambiar de cuenta, que es lo que se quiere: la cola es por dueño desde
    // la FE #521, y la foto también. Los `set` son del hook que la usa y no
    // cambian nunca
  }, [
    matchId,
    isOffline,
    esDeOtraPartida,
    currentUserId,
    leeLaVista,
    setScoringView,
    setFallo,
    setIsLoading,
  ]);

  return { fetchScoringView, marcaEscritura, esDeOtraPartida, memoriaDe };
};
