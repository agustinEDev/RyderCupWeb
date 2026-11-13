import { useState, useEffect, useCallback, useRef } from 'react';
import { getQuickMatchUseCase, getGolfCourseUseCase } from '../composition';
import * as offlineQueue from '../utils/scoringOfflineQueue';
import { loQueSeSupo, olvida, recuerda } from '../services/loUltimoConocido';
import { conGolpe } from '../utils/colaDePartidaRapida';

// Un minuto, y no diez segundos: esto es golf, entre hoyo y hoyo pasan minutos
// y preguntar seis veces por minuto gasta batería y datos para nada. Lo que no
// puede esperar —enviar lo que quedó guardado en el móvil— no depende del
// reloj: se dispara al volver la red y al volver a la aplicación, más abajo
const POLL_INTERVAL = 60000; // 1 minute

/**
 * La carga de la partida rápida y su campo, de `useQuickMatchScoring`: la
 * petición, qué respuesta vale todavía, la foto del móvil, el sondeo y lo que
 * se limpia al cambiar de partida. Lo que limpia y no es suyo —la cola, los
 * perdidos, los desacuerdos— llega con sus `set`.
 *
 * Sus tres efectos —limpiar, escuchar la red y sondear— corren en ese orden y
 * antes que los del hook que lo usa.
 */
export const useCargaDePartidaRapida = ({
  quickMatchId,
  currentUserId,
  vaciarRef,
  setPerdidos,
  setDiscrepancias,
  setPendientes,
}) => {
  const [quickMatch, setQuickMatch] = useState(null);
  const [holes, setHoles] = useState([]);
  const [tees, setTees] = useState([]);
  const [courseName, setCourseName] = useState(null);
  // El país del campo: el mapa solo tiene imagen en España (19 oct)
  const [courseCountryCode, setCourseCountryCode] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // Dos errores y no uno: el mismo status significa cosas distintas según de
  // dónde venga. Un 403 al cargar es "no juegas esta partida"; un 403 al anotar
  // es "no eres el anotador de ese jugador". Con un solo estado no había forma
  // de distinguirlos, y mirar si ya había partida en pantalla no vale: el
  // sondeo cada 10 s puede fallar mucho después de que la partida cargara, y
  // `fetchQuickMatch` conserva la anterior a propósito para no vaciar la
  // pantalla por un fallo de red pasajero. Este es el de cargar; el de anotar
  // es del hook que lo usa
  const [loadError, setLoadError] = useState(null);
  // Si lo que se está viendo sale de la memoria del móvil. Lo mira la pantalla
  // para avisar: sin esto, con un 5xx salía la partida entera bajo un error
  // rojo y sin decir que era una foto de antes
  const [pintadoDeMemoria, setPintadoDeMemoria] = useState(false);

  const holesLoadedRef = useRef(false);
  // El campo tal y como lo dio el backend, para poder volver a guardarlo sin
  // releerlo del almacenamiento
  const campoRef = useRef(null);
  // Si hay ya una partida pintada. Por referencia y no por estado: ponerlo en
  // las dependencias del sondeo lo reiniciaba en cada cambio de la partida
  const hayPartidaRef = useRef(false);
  // Una respuesta más vieja que algo ya aplicado no puede aplicarse después:
  // traería la partida como estaba y pisaría lo que acaba de entrar. Cada
  // petición toma un número al salir; al aplicarse, ese número pasa a ser «lo
  // último aplicado», y lo mismo al cerrar la partida o al llegar un golpe.
  // Se descarta solo lo más viejo que eso (FE #607, como competición en la
  // FE #606):
  // - NO «salió otra después»: el sondeo no espera al anterior, la vuelta de la
  //   red y a la aplicación piden otra, y las peticiones no tienen tope, así
  //   que con mala cobertura cada respuesta llegaba con otra ya en camino y la
  //   pantalla no se movía nunca —ni para decir que había un error—
  // - Y sí lo que es más viejo que un cierre: un sondeo que salió ANTES del
  //   POST volvía a aplicar su `IN_PROGRESS`, la pantalla dejaba anotar otra
  //   vez y cada guardado se estrellaba con un 409
  const relojRef = useRef(0);
  const ultimaAplicadaRef = useRef(0);
  const marcaEscritura = useCallback(() => {
    ultimaAplicadaRef.current = ++relojRef.current;
  }, []);
  // La partida que se está mirando AHORA. El reloj es uno solo y no distingue
  // de quién es cada respuesta: al ir de una partida a otra, una petición de la
  // anterior que siga en vuelo se aplicaba sobre la nueva
  const idVigenteRef = useRef(quickMatchId);
  const pollIntervalRef = useRef(null);

  const fetchQuickMatch = useCallback(async () => {
    if (!quickMatchId) {
      setIsLoading(false);
      return;
    }
    const salio = ++relojRef.current;
    const esVieja = () => quickMatchId !== idVigenteRef.current || salio < ultimaAplicadaRef.current;
    // Si esta respuesta contó cuando llegó. Se decide ahí y no en el `finally`:
    // la primera carga espera al campo después de pintar, y un golpe del
    // vaciado que llega en ese rato la dejaba por vieja con la espera puesta
    let seAplico = false;
    try {
      const data = await getQuickMatchUseCase.execute(quickMatchId);
      // Si mientras tanto se aplicó algo más nuevo —otra respuesta, un cierre o
      // un golpe que llegó—, aplicar esta retrocedería lo que se ve
      if (esVieja()) return;
      ultimaAplicadaRef.current = salio;
      seAplico = true;
      setQuickMatch(data);
      hayPartidaRef.current = true;
      setLoadError(null);
      // La partida está: si alguna vez se marcó como desaparecida, aquel 404
      // era mentira y la marca se retira
      offlineQueue.marcaDesaparecida(quickMatchId, currentUserId ?? null, false);

      // El sondeo ha respondido, así que hay conexión: es el momento de enviar
      // lo que quedó guardado. Se le pasan los hoyos que el servidor ya tiene,
      // que vienen en esta misma respuesta, para poder comparar sin pedir nada
      vaciarRef.current?.(data);

      if (!holesLoadedRef.current) {
        holesLoadedRef.current = true;
        try {
          const course = await getGolfCourseUseCase.execute(data.golfCourseId);
          // El campo tarda más que la partida, así que es el que más fácil
          // llega tarde. Y `holes` no se vuelve a escribir nunca: aplicarlo
          // aquí dejaba la partida nueva con los pares y los índices de la
          // anterior el resto de la sesión, y el siguiente sondeo los guardaba
          if (quickMatchId !== idVigenteRef.current) return;
          setHoles(course.holes || []);
          setTees(course.tees || []);
          setCourseName(course.name ?? null);
          setCourseCountryCode(course.countryCode ?? null);
          // La partida Y su campo: sin hoyos no hay par ni índice, y la
          // pantalla no se puede dibujar aunque se sepa quién juega
          campoRef.current = course;
          recuerda(quickMatchId, { partida: data, campo: course });
        } catch {
          if (quickMatchId !== idVigenteRef.current) return;
          holesLoadedRef.current = false;
          recuerda(quickMatchId, { partida: data, campo: campoRef.current });
        }
      } else {
        // Desde lo que ya se tiene, y NO releyendo lo que se va a sobrescribir:
        // si la entrada se hubiera desalojado, esa relectura daba `null` y el
        // sondeo dejaba sin campo la partida que está en pantalla, con lo que
        // la siguiente vez sin señal no había hoyos con los que pintar nada
        recuerda(quickMatchId, { partida: data, campo: campoRef.current });
      }
      setPintadoDeMemoria(false);
    } catch (err) {
      const estado = err?.status ?? err?.response?.status;
      // Si esta respuesta sigue siendo la última palabra. Una petición vieja
      // que muere DESPUÉS de que otra más nueva haya cargado bien la partida no
      // puede deshacer nada de lo que hizo la buena: le borraba la foto
      // guardada, le ponía su error encima y le quitaba la espera
      const esLaUltimaPalabra = !esVieja();
      seAplico = esLaUltimaPalabra;

      // Una respuesta CON estado es una respuesta: si el servidor dice que esa
      // partida ya no está —o que no es nuestra— pintarla desde el móvil sería
      // enseñar algo que no existe, y dejar anotar encima
      if ((estado === 404 || estado === 403) && esLaUltimaPalabra) {
        olvida(quickMatchId);
      }

      // Solo el 404, y solo si esta respuesta sigue siendo la última palabra.
      //
      // Lo que quedó guardado se marca, no se borra: esta pantalla es la ÚNICA
      // que sabe enviar anotaciones de partida rápida, así que si no carga, lo
      // suyo se queda en la cola para siempre y el panel avisa de golpes que
      // nadie puede mandar. Marcado, el panel puede ofrecer descartarlo;
      // borrarlo aquí perdería un golpe bueno cada vez que el 404 lo devuelva
      // un proxy o el portal cautivo de un club.
      //
      // El 403 NO se marca: ahí la partida existe, lo que pasa es que no es
      // nuestra —o es un tropiezo de CSRF—, y marcarla ofrecía tirar unos
      // golpes perfectamente enviables. Y sin la guarda de secuencia, un 404
      // lento de un portal cautivo aterrizaba DESPUÉS del sondeo que ya había
      // cargado bien la partida, y volvía a marcarla
      if (estado === 404 && esLaUltimaPalabra) {
        offlineQueue.marcaDesaparecida(quickMatchId, currentUserId ?? null, true);
      }

      // Se pinta lo último que se supo, que es lo que permite seguir anotando
      // al volver a abrir la aplicación en el campo. `loadError` se queda
      // puesto a propósito: es lo que la pantalla mira para decir que puede no
      // estar al día.
      //
      // Salvo que el servidor haya dicho algo que lo desmienta: que la partida
      // no está o no es nuestra (404, 403), o que no hemos entrado (401). Un
      // 5xx no desmiente nada —el backend está mal, la partida sigue ahí— y con
      // él tampoco se puede anotar, así que ahí lo guardado hace falta igual
      const desmentido = estado === 401 || estado === 403 || estado === 404;
      // Y solo cuando no hay NADA en pantalla. Lo guardado sirve para arrancar
      // sin señal, no para corregir a una pantalla que ya está funcionando:
      // cerrar la partida se aplica en local a propósito —para que un corte
      // justo después del POST no la deje viva— y reponer aquí la foto de
      // antes la devolvía a «en curso», con la pantalla dejando anotar otra vez
      const recordado = desmentido || hayPartidaRef.current ? null : loQueSeSupo(quickMatchId);
      if (recordado && esLaUltimaPalabra) {
        setQuickMatch(recordado.partida);
        hayPartidaRef.current = true;
        setPintadoDeMemoria(true);
        if (recordado.campo) {
          campoRef.current = recordado.campo;
          setHoles(recordado.campo.holes || []);
          setTees(recordado.campo.tees || []);
          setCourseName(recordado.campo.name ?? null);
          setCourseCountryCode(recordado.campo.countryCode ?? null);
          holesLoadedRef.current = true;
        }
      }

      if (esLaUltimaPalabra) setLoadError(err);
    } finally {
      // Si no, una respuesta rezagada de la partida anterior quitaba la espera
      // de la nueva estando todavía sin datos, y la pantalla pintaba la tarjeta
      // vacía —sin nombre, sin jugadores y con dieciocho «Anotar»—
      if (seAplico && quickMatchId === idVigenteRef.current) setIsLoading(false);
    }
  }, [quickMatchId, currentUserId, vaciarRef]);

  // Un golpe que acaba de llegar se pinta YA, con la respuesta del envío, antes
  // de que salga de la cola: esperar a la partida que se pide después dejaba
  // ese hoyo sin golpe en pantalla —ni en la cola ni en la partida—, o con el
  // número de antes si era una corrección, y con mala cobertura eso son
  // segundos invitando a anotarlo otra vez (FE #607). Cuenta como lo último
  // aplicado, para que un sondeo que salió antes no lo deshaga. Y solo si la
  // pantalla sigue en esta partida: lo que llega de la anterior ni se pinta ni
  // cuenta, que haría descartar la vista de la nueva
  const pintaElGolpe = useCallback(
    (golpe) => {
      if (golpe?.holeNumber == null || quickMatchId !== idVigenteRef.current) return;
      marcaEscritura();
      setQuickMatch((previa) => (previa ? conGolpe(previa, golpe) : previa));
    },
    [quickMatchId, marcaEscritura]
  );

  // La ruta no lleva `key`, así que ir de una partida a otra reutiliza este
  // hook: sin limpiar, el aviso rojo y el conflicto de la partida anterior se
  // quedarían en pantalla contra los hoyos de la nueva
  useEffect(() => {
    idVigenteRef.current = quickMatchId;
    hayPartidaRef.current = false;
    campoRef.current = null;
    holesLoadedRef.current = false;
    // Y lo que se está viendo: si la nueva no llega a cargar —y no hay nada
    // guardado de ella— se quedaba en pantalla la partida ANTERIOR, con sus
    // hoyos y su campo, lista para anotar encima
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on match change, same pattern as the fetch effect below
    setQuickMatch(null);
    setHoles([]);
    setTees([]);
    setCourseName(null);
    setCourseCountryCode(null);
    setPintadoDeMemoria(false);
    setIsLoading(true);
    setLoadError(null);
    setPerdidos([]);
    setDiscrepancias([]);
    setPendientes(quickMatchId ? offlineQueue.size(quickMatchId, currentUserId) : 0);
  }, [quickMatchId, currentUserId, setPerdidos, setDiscrepancias, setPendientes]);

  // Los dos momentos en los que de verdad importa preguntar, y que el reloj no
  // ve: cuando el navegador dice que vuelve la red, y cuando el jugador vuelve
  // a la aplicación —saca el móvil del bolsillo al llegar al hoyo—. El aviso
  // del navegador no vale como verdad —en un campo con dos barras dice que hay
  // conexión sin haberla— pero sí como excusa para probar: si el intento sale,
  // es que había
  useEffect(() => {
    // La vuelta de la red se aprovecha SIEMPRE, se esté mirando o no: es una
    // ocasión de sacar del móvil lo que quedó guardado, y desaprovecharla
    // porque la pantalla esté en segundo plano no le ahorra nada a nadie
    const alVolverLaRed = () => fetchQuickMatch();
    // La visibilidad, en cambio, solo cuando se vuelve: el mismo evento avisa
    // de que la aplicación se va al fondo, y ahí no hay nada que preguntar
    const alVolverALaApp = () => {
      if (document.visibilityState !== 'visible') return;
      fetchQuickMatch();
    };
    window.addEventListener('online', alVolverLaRed);
    document.addEventListener('visibilitychange', alVolverALaApp);

    return () => {
      window.removeEventListener('online', alVolverLaRed);
      document.removeEventListener('visibilitychange', alVolverALaApp);
    };
  }, [fetchQuickMatch]);

  useEffect(() => {
    holesLoadedRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch + polling, same pattern as useScoring.js
    fetchQuickMatch();
    pollIntervalRef.current = setInterval(fetchQuickMatch, POLL_INTERVAL);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [fetchQuickMatch]);

  return {
    quickMatch,
    setQuickMatch,
    holes,
    tees,
    courseName,
    courseCountryCode,
    isLoading,
    loadError,
    pintadoDeMemoria,
    idVigenteRef,
    marcaEscritura,
    fetchQuickMatch,
    pintaElGolpe,
  };
};
