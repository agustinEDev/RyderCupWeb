import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Bot, Check, Lock, Undo2 } from 'lucide-react';
import HeaderAuth from '../components/layout/HeaderAuth';
import { useAuth } from '../hooks/useAuth';
import FullScreenLoader from '../components/ui/FullScreenLoader';
import customToast from '../utils/toast';
import { fechaYHoraDelCampo } from '../services/partidosSinCobertura';
import {
  getCompetitionDetailUseCase,
  getEnvelopesUseCase,
  submitEnvelopeUseCase,
  revealEnvelopesUseCase,
} from '../composition';
import BloqueoDePartidos from '../components/schedule/BloqueoDePartidos';

/**
 * El sobre de un capitán (FE #655).
 *
 * Se ordena **tocando**: el primer toque es el primero que juega. En un
 * teléfono es lo único que funciona bien —arrastrar filas con el dedo se pelea
 * con el scroll de la página— y de paso el orden se ve mientras se construye.
 *
 * Dos cosas que esta pantalla no hace nunca: enseñar la lista del rival antes
 * de que se abran los sobres, y ofrecer «abrir» cuando el servidor lo va a
 * rechazar. Lo segundo no es cosmética: el relleno automático es predecible
 * —por hándicap—, así que abrir antes de que el rival entregue dejaría armar
 * la lista propia para ganar todos los cruces.
 */
// Cada cuánto se pregunta si ya se abrieron, mientras se espera (#710)
const REFRESCO_MS = 10000;

const EnvelopePage = () => {
  const navigate = useNavigate();
  const { id, roundId } = useParams();
  const { t, i18n } = useTranslation('competitions');
  const { user } = useAuth();
  const [vista, setVista] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(null);
  const [orden, setOrden] = useState([]);
  const [cambiando, setCambiando] = useState(false);
  // Pedir que se abran en cuanto estén los dos, sin esperar a la hora. Hacen
  // falta los DOS capitanes: con uno solo se espera (decidido el 23 sep)
  const [sinEsperar, setSinEsperar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [abriendo, setAbriendo] = useState(false);
  const [cambiandoPermiso, setCambiandoPermiso] = useState(false);

  // Cada lectura lleva su número: la que vuelve tarde no pisa a una posterior,
  // como un refresco que sale antes de dar el permiso y llega después
  const generacion = useRef(0);
  const refrescoEnVuelo = useRef(false);

  const cargar = useCallback(async () => {
    const mia = ++generacion.current;
    try {
      const datos = await getEnvelopesUseCase.execute(roundId);
      if (mia !== generacion.current) return;
      setVista(datos);
      setFallo(null);
    } catch (error) {
      if (mia !== generacion.current) return;
      // Y se guarda: sin esto la pantalla caía en «aquí verás los
      // enfrentamientos en cuanto se abran», que es tranquilizador y falso
      setFallo(error.message);
      customToast.error(error.message);
    } finally {
      setCargando(false);
    }
  }, [roundId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la carga inicial de una pantalla, el mismo patrón que el resto del repo
    cargar();
  }, [cargar]);

  const jugadores = useMemo(() => vista?.myPlayers || [], [vista]);

  // Los nombres de los equipos, solo para decir de quién es el sobre que
  // rellenó la aplicación: la vista del sobre no los trae. Sin ellos el aviso
  // sale igual, sin nombre
  const hayAutomatico = Boolean(vista?.teamAAutomatic || vista?.teamBAutomatic);
  const [nombresDeLosEquipos, setNombresDeLosEquipos] = useState(null);
  useEffect(() => {
    if (!hayAutomatico) return undefined;
    let vigente = true;
    (async () => getCompetitionDetailUseCase.execute(id))()
      .then(
        (competicion) =>
          vigente &&
          setNombresDeLosEquipos({ id, A: competicion.team1Name, B: competicion.team2Name })
      )
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, [hayAutomatico, id]);
  const capitanea = jugadores.length > 0;
  // Lo dice el servidor mirando los DOS equipos, porque quien puede
  // arreglarlo —el organizador, cambiando el formato o rehaciendo los
  // equipos— no tiene sobre y no vería nada. En parejas el cruce va por
  // posición: con un equipo impar alguien se queda fuera, no se puede
  // entregar, el relleno automático revienta y el plazo vence sin abrir nada
  const equipoImpar = vista != null && vista.teamsFitFormat === false;
  // Cambiar solo tiene sentido con los equipos cuadrando: si la vista llega
  // con el equipo impar a media corrección, el formulario ya no se pinta
  // (FE #741) y, sin esto, tampoco el sobre entregado: solo quedaba el aviso
  const reordenando = cambiando && !equipoImpar;
  const entregado = Boolean(vista?.mine?.submitted) && !reordenando;

  // Con el sobre entregado y aún cerrados, se pregunta sola (#710): con los dos
  // permisos, el capitán que da el suyo primero espera justo ese momento y no
  // lo veía. Solo mientras espera algo: una página abierta toda la tarde no
  // puede gastar el cupo de peticiones que comparten todos. Y en silencio: un
  // fallo del refresco no es algo que el capitán haya hecho
  const esperandoAlRival = !vista?.revealed && entregado;
  useEffect(() => {
    if (!esperandoAlRival) return undefined;
    const id = setInterval(async () => {
      // Con una red lenta no se amontonan: uno a la vez (CodeRabbit en la #720)
      if (refrescoEnVuelo.current) return;
      refrescoEnVuelo.current = true;
      const mia = ++generacion.current;
      try {
        const datos = await getEnvelopesUseCase.execute(roundId);
        if (mia !== generacion.current) return;
        setVista(datos);
        setFallo(null);
      } catch {
        // Lo que ya había sigue valiendo: se vuelve a preguntar en el siguiente
      } finally {
        refrescoEnVuelo.current = false;
      }
    }, REFRESCO_MS);
    return () => clearInterval(id);
  }, [esperandoAlRival, roundId]);
  // Lo decide el servidor: hacen falta los dos sobres dentro, sea quien sea.
  // Repetir esa regla aquí es donde se desincronizan
  const puedeAbrir = Boolean(vista?.canReveal);
  const faltaAlgunSobre = !vista?.teamASubmitted || !vista?.teamBSubmitted;
  // Lo dice el servidor: 1 en individuales, 2 en los formatos de parejas.
  // Saber aquí qué formatos son de parejas es duplicar una regla del dominio
  const porFila = vista?.playersPerRow || 1;
  // La pareja que el capitán está formando y todavía le falta el compañero
  const parejaAMedias = orden.length % porFila !== 0;

  const puestoDe = (userId) => orden.indexOf(userId);
  // Las elegidas suben, en el orden en que se tocaron: si no, el «2» se
  // quedaba encima del «1» (#710). Las demás, como vinieron
  const jugadoresEnOrden = [...jugadores]
    .map((jugador, i) => ({ jugador, i }))
    .sort((a, b) => {
      const puesto = ({ jugador, i }) => {
        const p = orden.indexOf(jugador.userId);
        return p >= 0 ? p : orden.length + i;
      };
      return puesto(a) - puesto(b);
    })
    .map(({ jugador }) => jugador);
  // El número que se ve es el de la FILA: en parejas, dos jugadores con el 1
  // juegan juntos
  const filaDe = (userId) => Math.floor(puestoDe(userId) / porFila) + 1;

  const tocar = (userId) => {
    if (orden.includes(userId)) return;
    setOrden([...orden, userId]);
  };

  const deshacer = () => setOrden(orden.slice(0, -1));

  const entregar = async () => {
    setEnviando(true);
    try {
      // De `porFila` en `porFila`: una fila por jugador en individuales, y las
      // parejas ya formadas en los demás formatos
      const filas = [];
      for (let i = 0; i < orden.length; i += porFila) {
        filas.push(orden.slice(i, i + porFila));
      }
      await submitEnvelopeUseCase.execute(roundId, filas, sinEsperar);
      customToast.success(t('envelope.submitted'));
      setCambiando(false);
      setOrden([]);
      await cargar();
    } catch (error) {
      // El orden NO se pierde: rehacerlo entero por un fallo del servidor es
      // lo más irritante que puede pasarle aquí a un capitán
      customToast.error(error.message);
    } finally {
      setEnviando(false);
    }
  };

  // Dar o retirar el permiso para abrirlos antes de hora, ya entregado: se
  // reenvía el MISMO orden con el permiso cambiado, sin volver a ordenar (FE
  // #717). Abrir antes de hora lo deciden los dos capitanes (RyderCupAM#374)
  const cambiarPermiso = async (conPermiso) => {
    if (cambiandoPermiso || !vista?.mine) return;
    setCambiandoPermiso(true);
    try {
      await submitEnvelopeUseCase.execute(roundId, vista.mine.entries, conPermiso);
      await cargar();
    } catch (error) {
      customToast.error(error.message);
    } finally {
      setCambiandoPermiso(false);
    }
  };

  const abrir = async () => {
    // Dos toques seguidos mandaban dos aperturas, y la segunda se llevaba un
    // «ya estaban abiertos» que el capitán veía en rojo aunque todo fue bien
    if (abriendo) return;
    setAbriendo(true);
    try {
      await revealEnvelopesUseCase.execute(roundId);
      await cargar();
    } catch (error) {
      customToast.error(error.message);
    } finally {
      setAbriendo(false);
    }
  };

  const nombreDe = (userId) => vista?.playerNames?.[userId] || userId;

  // Qué sobres rellenó la aplicación, en UN aviso que dice de quién (#710):
  // eran dos avisos iguales, y «ese capitán» no decía cuál
  const automaticos = ['A', 'B'].filter((equipo) => vista?.[`team${equipo}Automatic`]);
  let avisoAutomatico = null;
  if (automaticos.length === 2) {
    avisoAutomatico = t('envelope.filledByTheAppBoth');
  } else if (automaticos.length === 1) {
    // Solo los de ESTA competición: la página no se desmonta al cambiar de una
    // a otra, y los de la anterior nombrarían a otro equipo (CodeRabbit)
    const equipo =
      nombresDeLosEquipos?.id === id ? nombresDeLosEquipos[automaticos[0]] : undefined;
    avisoAutomatico = equipo
      ? t('envelope.filledByTheAppTeam', { equipo })
      : t('envelope.filledByTheApp');
  }

  // Con el huso DEL CAMPO: `toLocaleString` la habría movido al del teléfono, y
  // el plazo cae de madrugada, así que un dispositivo en otro huso enseñaba
  // incluso otro día. Es el mismo caso que ya resolvió la anotación
  const plazo = fechaYHoraDelCampo(vista?.revealScheduledAt, i18n.language);

  if (cargando) return <FullScreenLoader />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Al calendario, que es de donde se entra al sobre: devolver a la
          ficha obliga a volver a entrar para la sesión siguiente */}
      <HeaderAuth user={user} title={t('envelope.title')} backTo={`/competitions/${id}/schedule`} />
      <div className="mx-auto max-w-2xl px-4 py-6">
        <button
          type="button"
          data-testid="volver-al-calendario"
          onClick={() => navigate(`/competitions/${id}/schedule`)}
          className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('envelope.back')}
        </button>

        {/* `hidden md:block`: en móvil el título lo pinta la cabecera contextual */}
        <h1 className="hidden md:block mb-4 text-2xl font-bold text-gray-900">
          {t('envelope.title')}
        </h1>

        {vista?.revealed && (
          <div className="mb-4 space-y-2">
            <h2 className="text-sm font-bold text-gray-900">{t('envelope.matchups')}</h2>
            {avisoAutomatico && (
              <p
                data-testid="automatico"
                className="flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800"
              >
                <Bot className="h-4 w-4 shrink-0" />
                {avisoAutomatico}
              </p>
            )}
            <ul className="space-y-2">
              {vista.matchups.map((enfrentamiento, i) => (
                <li
                  key={`${enfrentamiento[0].join('-')}`}
                  data-testid={`enfrentamiento-${i}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-3 text-sm"
                >
                  {/* Una pareja, un nombre por línea: cortados no se sabía
                      contra quién se jugaba (#710) */}
                  <span className="min-w-0 flex-1 break-words">
                    {enfrentamiento[0].map((jugador) => (
                      <span key={jugador} className="block">{nombreDe(jugador)}</span>
                    ))}
                  </span>
                  <span className="shrink-0 text-xs font-bold text-gray-500">
                    {t('envelope.versus')}
                  </span>
                  <span className="min-w-0 flex-1 break-words text-right">
                    {enfrentamiento[1].map((jugador) => (
                      <span key={jugador} className="block">{nombreDe(jugador)}</span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
            {/* Los enfrentamientos a la vista y ningún partido que jugar:
                se dice a quién le falta qué (BE #361) */}
            <BloqueoDePartidos bloqueo={vista.matchGenerationBlock} />
          </div>
        )}

        {!fallo && equipoImpar && (
          <p
            data-testid="equipo-impar"
            className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800"
          >
            {t('envelope.oddTeam')}
          </p>
        )}

        {fallo && (
          <p
            data-testid="sobre-no-disponible"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {fallo}
          </p>
        )}

        {!fallo && !capitanea && !vista?.revealed && (
          <p
            data-testid="solo-mirando"
            className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600"
          >
            {t('envelope.onlyCaptains')}
          </p>
        )}

        {!fallo && capitanea && !vista?.revealed && entregado && (
          <div className="space-y-3">
            <div
              data-testid="sobre-entregado"
              className="flex items-center gap-2 rounded-xl border border-green-600 bg-green-50 p-3 text-green-800"
            >
              <Check className="h-5 w-5 shrink-0" />
              <span className="font-semibold">{t('envelope.yours')}</span>
            </div>
            <ol data-testid="orden-guardado" className="space-y-1 rounded-xl border border-gray-200 bg-white p-3">
              {vista.mine.entries.map((fila, i) => (
                <li key={fila.join('-')} className="flex items-center gap-2 text-sm">
                  <span className="w-5 shrink-0 text-xs font-bold text-gray-500">{i + 1}</span>
                  <span className="min-w-0 break-words">
                    {fila.map((jugador) => (
                      <span key={jugador} className="block">{nombreDe(jugador)}</span>
                    ))}
                  </span>
                </li>
              ))}
            </ol>
            {/* Del rival solo si entregó, nunca lo que puso: verlo antes de
                tiempo es el juego entero */}
            {vista.mine.revealWhenBothReady && !vista.rivalWantsEarly && (
              <p
                data-testid="falta-que-lo-marque-el-rival"
                className="rounded-lg bg-blue-50 p-2 text-sm text-blue-800"
              >
                {t('envelope.waitingForRivalToAgree')}
              </p>
            )}
            <p
              data-testid={vista.rivalSubmitted ? 'rival-entregado' : 'rival-pendiente'}
              className="flex items-center gap-2 rounded-lg bg-gray-100 p-2 text-sm text-gray-700"
            >
              <Lock className="h-4 w-4 shrink-0" />
              {t(vista.rivalSubmitted ? 'envelope.rivalIn' : 'envelope.rivalPending')}
            </p>
            {!vista.mine.revealWhenBothReady && vista.rivalWantsEarly && (
              <p
                data-testid="el-rival-ya-dio-permiso"
                className="rounded-lg bg-blue-50 p-2 text-sm text-blue-800"
              >
                {t('envelope.rivalConsented')}
              </p>
            )}
            {/* Con el equipo impar no se abre nada: el permiso no lleva a ningún
                sitio (revisión local, FE #741) */}
            {equipoImpar ? null : vista.mine.revealWhenBothReady ? (
              <button
                type="button"
                data-testid="retirar-permiso"
                onClick={() => cambiarPermiso(false)}
                disabled={cambiandoPermiso}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"
              >
                {t('envelope.withdrawConsent')}
              </button>
            ) : (
              <button
                type="button"
                data-testid="dar-permiso"
                onClick={() => cambiarPermiso(true)}
                disabled={cambiandoPermiso}
                className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {t('envelope.giveConsent')}
              </button>
            )}
            {/* Sin plazo —campo sin zona— no hay hora que prometer; con el
                equipo impar tampoco: la sesión está bloqueada (FE #741) */}
            {plazo && !equipoImpar && (
              <p data-testid="se-abren-solos" className="text-xs text-gray-500">
                {t('envelope.opensOnItsOwn', { when: plazo })}
              </p>
            )}
            {/* Con el equipo impar no se puede volver a entregar: cambiar
                llevaría a un formulario sin salida (FE #741) */}
            {!equipoImpar && (
              <button
                type="button"
                data-testid="cambiar-sobre"
                // Con el permiso viajando, el formulario arrancaría con el de
                // ANTES y al entregar lo retiraría sin avisar
                disabled={cambiandoPermiso}
                onClick={() => {
                  setCambiando(true);
                  setOrden([]);
                  // Lo que ya pidió: si no, corregir la lista retiraría su
                  // petición de abrir sin esperar sin que nadie se lo diga
                  setSinEsperar(Boolean(vista?.mine?.revealWhenBothReady));
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"
              >
                {t('envelope.change')}
              </button>
            )}
          </div>
        )}

        {/* Con el equipo impar la sesión está bloqueada: no se entrega, no se
            abre ni se rellena nada a su hora. Solo queda el aviso de arriba;
            una lista tocable debajo invitaba a ordenarla para nada (FE #726,
            FE #741) */}
        {!fallo && capitanea && !vista?.revealed && !entregado && !equipoImpar && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">{t('envelope.tapInOrder')}</p>
            {plazo && (
              <p data-testid="plazo" className="text-xs text-gray-500">
                {t('envelope.deadline', { when: plazo })}
              </p>
            )}
            {parejaAMedias && (
              <p
                data-testid="pareja-a-medias"
                className="rounded-lg bg-blue-50 p-2 text-xs text-blue-800"
              >
                {t('envelope.pairHalfDone')}
              </p>
            )}
            <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
              {jugadoresEnOrden.map((jugador) => {
                const puesto = puestoDe(jugador.userId);
                return (
                  <li key={jugador.userId}>
                    <button
                      type="button"
                      data-testid={`jugador-${jugador.userId}`}
                      onClick={() => tocar(jugador.userId)}
                      disabled={puesto >= 0}
                      className={`flex w-full items-center justify-between gap-2 p-3 text-left ${
                        puesto >= 0 ? 'bg-green-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {puesto >= 0 && (
                          <span
                            data-testid={`puesto-${jugador.userId}`}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white"
                          >
                            {filaDe(jugador.userId)}
                          </span>
                        )}
                        <span className="min-w-0 truncate text-sm text-gray-900">
                          {jugador.name}
                        </span>
                      </span>
                      <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                        {jugador.handicap}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {/* La casilla, junto al botón de entregar: es parte de la entrega,
                no un ajuste aparte */}
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                data-testid="sin-esperar"
                checked={sinEsperar}
                onChange={(e) => setSinEsperar(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-green-600"
              />
              <span>{t('envelope.revealWhenBothReady')}</span>
            </label>

            <div className="flex gap-2">
              {vista?.mine?.submitted && (
                <button
                  type="button"
                  data-testid="cancelar-cambio"
                  onClick={() => {
                    // Un toque sin querer no puede dejarle sin su sobre
                    // entregado hasta que recargue
                    setCambiando(false);
                    setOrden([]);
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
                >
                  {t('envelope.cancel')}
                </button>
              )}
              <button
                type="button"
                data-testid="deshacer"
                onClick={deshacer}
                disabled={orden.length === 0}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"
              >
                <Undo2 className="h-4 w-4" />
                {t('envelope.undo')}
              </button>
              <button
                type="button"
                data-testid="entregar-sobre"
                onClick={entregar}
                disabled={orden.length !== jugadores.length || enviando}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {t('envelope.submit')}
              </button>
            </div>
          </div>
        )}

        {/* Abrir a mano solo lo puede el organizador en una sesión sin plazo
            (RyderCupAM#374), y eso ya lo dice `canReveal`: antes de hora, el
            resto se abre con el permiso de los dos capitanes. El que no
            aparece no atasca nada: al vencer el plazo se abren solos.

            Mientras reordena no se ofrece aunque el servidor lo permita: el
            sobre que hay guardado es el ANTERIOR, y un toque ahí lo abriría
            tirando por la borda lo que venía a cambiar */}
        {!fallo && !reordenando && !equipoImpar && puedeAbrir && faltaAlgunSobre && !vista?.revealScheduledAt && (
          // Esta sesión no tiene hora a la que abrirse sola —su campo no tiene
          // zona horaria—, así que quien la abra decide también el sobre que
          // falta. Sin decirlo, el botón parece el de siempre
          <p data-testid="sin-plazo" className="mb-2 text-xs text-amber-700">
            {t('envelope.noDeadline')}
          </p>
        )}
        {/* Con el equipo impar la sesión está bloqueada: abrirlos a mano tampoco
            lleva a nada, aunque el servidor diga que se puede (CodeRabbit, #747) */}
        {!fallo && !reordenando && !equipoImpar && puedeAbrir && (
          <button
            type="button"
            data-testid="abrir-sobres"
            onClick={abrir}
            disabled={abriendo}
            className="mb-3 w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {t('envelope.reveal')}
          </button>
        )}

      </div>
    </div>
  );
};

export default EnvelopePage;
