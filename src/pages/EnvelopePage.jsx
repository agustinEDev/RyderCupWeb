import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useCargaCancelableEffect } from '../hooks/useCargaCancelableEffect';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Bot, Check, Lock, Undo2 } from 'lucide-react';
import HeaderAuth from '../components/layout/HeaderAuth';
import { useAuth } from '../hooks/useAuth';
import FullScreenLoader from '../components/ui/FullScreenLoader';
import BlockLoader from '../components/ui/BlockLoader';
import customToast from '../utils/toast';
import { fechaYHoraDelCampo } from '../services/partidosSinCobertura';
import {
  getCompetitionDetailUseCase,
  getEnvelopesUseCase,
  submitEnvelopeUseCase,
  revealEnvelopesUseCase,
} from '../composition';
import BloqueoDePartidos from '../components/schedule/BloqueoDePartidos';
import { formatoDeIndice } from '../utils/formatoDeHandicap';
import { PANTALLA_MENOS_BARRA_INFERIOR } from '../utils/barraInferior';

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

/**
 * Lo que el capitán toca en el sobre de UNA ronda: el orden, el permiso, si
 * está cambiando el entregado y los botones en curso. Va con `key` de la
 * ronda: al pasar a otra sin salir de la pantalla, la nueva empieza limpia.
 * La carga, la vista y el refresco son de la página (más abajo), para que el
 * cambio de ronda no saque la espera de pantalla completa. Hasta que llega
 * la vista de SU ronda (`cargada`), solo la espera del bloque.
 */
const SobreDeLaRonda = ({
  id,
  roundId,
  cargada,
  vista,
  fallo,
  cargar,
  refrescar,
  nombresDeLosEquipos,
}) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('competitions');
  const { user } = useAuth();
  const [orden, setOrden] = useState([]);
  const [cambiando, setCambiando] = useState(false);
  // Pedir que se abran en cuanto estén los dos, sin esperar a la hora. Hacen
  // falta los DOS capitanes: con uno solo se espera (decidido el 23 sep)
  const [sinEsperar, setSinEsperar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [abriendo, setAbriendo] = useState(false);
  const [cambiandoPermiso, setCambiandoPermiso] = useState(false);
  // Si esta ronda sigue en pantalla: una acción que vuelve cuando ya se pasó a
  // otra no recarga, porque la carga de la página ya es la de la otra ronda.
  // La dejaba vieja y, si fallaba, le ponía un error que no era suyo
  const sigueEnPantallaRef = useRef(true);
  useEffect(() => {
    sigueEnPantallaRef.current = true;
    return () => {
      sigueEnPantallaRef.current = false;
    };
  }, []);
  const recargarSiSigue = () =>
    sigueEnPantallaRef.current ? cargar() : undefined;

  const jugadores = useMemo(() => vista?.myPlayers || [], [vista]);

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
  // «Tu sobre» solo para quien capitanea: el organizador o un jugador que solo
  // mira no tienen sobre. Mientras carga se deja el de siempre, para que el
  // título del capitán no cambie al llegar la vista
  const titulo = t(
    vista && !capitanea ? 'envelope.titleOthers' : 'envelope.title',
  );
  const entregado = Boolean(vista?.mine?.submitted) && !reordenando;

  // Con el sobre entregado y aún cerrados, se pregunta sola (#710): con los dos
  // permisos, el capitán que da el suyo primero espera justo ese momento y no
  // lo veía. Solo mientras espera algo: una página abierta toda la tarde no
  // puede gastar el cupo de peticiones que comparten todos. Y en silencio: un
  // fallo del refresco no es algo que el capitán haya hecho
  const esperandoAlRival = !vista?.revealed && entregado;
  // El temporizador vive aquí porque depende de si está reordenando, que es
  // de esta ronda; la petición (una a la vez, en silencio) la hace la página
  useEffect(() => {
    if (!esperandoAlRival) return undefined;
    const id = setInterval(refrescar, REFRESCO_MS);
    return () => clearInterval(id);
  }, [esperandoAlRival, refrescar]);
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
      await recargarSiSigue();
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
      await submitEnvelopeUseCase.execute(
        roundId,
        vista.mine.entries,
        conPermiso,
      );
      await recargarSiSigue();
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
      await recargarSiSigue();
    } catch (error) {
      customToast.error(error.message);
    } finally {
      setAbriendo(false);
    }
  };

  const nombreDe = (userId) => vista?.playerNames?.[userId] || userId;

  // Qué sobres rellenó la aplicación, en UN aviso que dice de quién (#710):
  // eran dos avisos iguales, y «ese capitán» no decía cuál
  const automaticos = ['A', 'B'].filter(
    (equipo) => vista?.[`team${equipo}Automatic`],
  );
  let avisoAutomatico = null;
  if (automaticos.length === 2) {
    avisoAutomatico = t('envelope.filledByTheAppBoth');
  } else if (automaticos.length === 1) {
    // Solo los de ESTA competición: la página no se desmonta al cambiar de una
    // a otra, y los de la anterior nombrarían a otro equipo (CodeRabbit)
    const equipo =
      nombresDeLosEquipos?.id === id
        ? nombresDeLosEquipos[automaticos[0]]
        : undefined;
    avisoAutomatico = equipo
      ? t('envelope.filledByTheAppTeam', { equipo })
      : t('envelope.filledByTheApp');
  }

  // Con el huso DEL CAMPO: `toLocaleString` la habría movido al del teléfono, y
  // el plazo cae de madrugada, así que un dispositivo en otro huso enseñaba
  // incluso otro día. Es el mismo caso que ya resolvió la anotación
  const plazo = fechaYHoraDelCampo(vista?.revealScheduledAt, i18n.language);

  // Recién cambiada la ronda sin salir, mientras llega la suya: nada del sobre
  // de la anterior. Con su vista, «dar permiso» reenviaba el orden de la otra
  // ronda como si fuera el de esta, y el servidor lo aceptaba
  if (!cargada) {
    return (
      <div className={`${PANTALLA_MENOS_BARRA_INFERIOR} bg-gray-50`}>
        <HeaderAuth
          user={user}
          title={titulo}
          backTo={`/competitions/${id}/schedule`}
        />
        <div className="mx-auto max-w-2xl px-4 py-6">
          <BlockLoader />
        </div>
      </div>
    );
  }

  return (
    <div className={`${PANTALLA_MENOS_BARRA_INFERIOR} bg-gray-50`}>
      {/* Al calendario, que es de donde se entra al sobre: devolver a la
          ficha obliga a volver a entrar para la sesión siguiente */}
      <HeaderAuth
        user={user}
        title={titulo}
        backTo={`/competitions/${id}/schedule`}
      />
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
          {titulo}
        </h1>

        {vista?.revealed && (
          <div className="mb-4 space-y-2">
            <h2 className="text-sm font-bold text-gray-900">
              {t('envelope.matchups')}
            </h2>
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
                      <span key={jugador} className="block">
                        {nombreDe(jugador)}
                      </span>
                    ))}
                  </span>
                  <span className="shrink-0 text-xs font-bold text-gray-500">
                    {t('envelope.versus')}
                  </span>
                  <span className="min-w-0 flex-1 break-words text-right">
                    {enfrentamiento[1].map((jugador) => (
                      <span key={jugador} className="block">
                        {nombreDe(jugador)}
                      </span>
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

        {/* Con el equipo impar no se va a abrir nada: no se promete verlo */}
        {!fallo && !capitanea && !vista?.revealed && !equipoImpar && (
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
            <ol
              data-testid="orden-guardado"
              className="space-y-1 rounded-xl border border-gray-200 bg-white p-3"
            >
              {vista.mine.entries.map((fila, i) => (
                <li
                  key={fila.join('-')}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="w-5 shrink-0 text-xs font-bold text-gray-500">
                    {i + 1}
                  </span>
                  <span className="min-w-0 break-words">
                    {fila.map((jugador) => (
                      <span key={jugador} className="block">
                        {nombreDe(jugador)}
                      </span>
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
              data-testid={
                vista.rivalSubmitted ? 'rival-entregado' : 'rival-pendiente'
              }
              className="flex items-center gap-2 rounded-lg bg-gray-100 p-2 text-sm text-gray-700"
            >
              <Lock className="h-4 w-4 shrink-0" />
              {t(
                vista.rivalSubmitted
                  ? 'envelope.rivalIn'
                  : 'envelope.rivalPending',
              )}
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
        {!fallo &&
          capitanea &&
          !vista?.revealed &&
          !entregado &&
          !equipoImpar && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                {t('envelope.tapInOrder')}
              </p>
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
                          {formatoDeIndice(jugador.handicap)}
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
        {!fallo &&
          !reordenando &&
          !equipoImpar &&
          puedeAbrir &&
          faltaAlgunSobre &&
          !vista?.revealScheduledAt && (
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

const EnvelopePage = () => {
  const { id, roundId } = useParams();
  // La vista y el fallo, con la ronda de la que son: al pasar a otra sin
  // salir, lo de la anterior ya no vale para esta mientras llega lo suyo
  const [lectura, setLectura] = useState({
    roundId: null,
    vista: null,
    fallo: null,
  });
  const cargada = lectura.roundId === roundId;
  const vista = cargada ? lectura.vista : null;
  const fallo = cargada ? lectura.fallo : null;
  // La espera de pantalla completa solo hasta la PRIMERA carga, como siempre:
  // al pasar de una ronda a otra sin salir no vuelve
  const [primeraTerminada, setPrimeraTerminada] = useState(false);

  // Cuántas recargas (tras una acción o del refresco) hay en vuelo: el
  // refresco no sale mientras haya alguna. Uno a la vez con una red lenta
  // (CodeRabbit en la #720), y sin sustituir a la recarga de una acción: si
  // la sustituía y fallaba, lo que dejó la acción no llegaba a la pantalla
  const enVueloRef = useRef(0);
  // Si la última recarga pedida es la del refresco: su fallo va en silencio,
  // que no es algo que el capitán haya hecho
  const esElRefrescoRef = useRef(false);

  // La carga de la pantalla, la de después de cada acción y la del refresco.
  // Al cambiar de ronda o al salir, la que llega tarde ya no pinta ni avisa: un
  // fallo avisaba en la pantalla a la que se había ido. Y una más nueva deja
  // vieja a la anterior: un refresco que salió antes de dar el permiso no lo
  // pisa al volver
  const { recargar } = useCargaCancelableEffect(
    () => getEnvelopesUseCase.execute(roundId),
    [roundId],
    {
      alCargar: (datos) => {
        setPrimeraTerminada(true);
        setLectura({ roundId, vista: datos, fallo: null });
      },
      alFallar: (error, { silenciosa }) => {
        setPrimeraTerminada(true);
        // El del refresco: lo que ya había sigue valiendo, y se vuelve a
        // preguntar en el siguiente
        if (silenciosa && esElRefrescoRef.current) return;
        // Y se guarda: sin esto la pantalla caía en «aquí verás los
        // enfrentamientos en cuanto se abran», que es tranquilizador y falso.
        // La vista de antes de esta misma ronda se queda, como siempre
        setLectura((antes) => ({
          roundId,
          vista: antes.roundId === roundId ? antes.vista : null,
          fallo: error.message,
        }));
        customToast.error(error.message);
      },
    },
  );
  const recargarSinEspera = useCallback(
    (esElRefresco) => {
      esElRefrescoRef.current = esElRefresco;
      enVueloRef.current += 1;
      return recargar({ silenciosa: true }).finally(() => {
        enVueloRef.current -= 1;
      });
    },
    [recargar],
  );
  // Tras una acción, sin la espera de toda la pantalla, y se espera a que
  // llegue antes de soltar el botón. Nunca se rechaza: el fallo ya lo avisa
  // `alFallar`, una sola vez
  const cargar = useCallback(
    () => recargarSinEspera(false),
    [recargarSinEspera],
  );
  // El refresco mientras se espera al rival: si hay otra recarga en vuelo, este
  // tic no sale
  const refrescar = useCallback(() => {
    if (enVueloRef.current > 0) return;
    recargarSinEspera(true);
  }, [recargarSinEspera]);

  // Los nombres de los equipos, solo para decir de quién es el sobre que
  // rellenó la aplicación: la vista del sobre no los trae. Sin ellos el aviso
  // sale igual, sin nombre: su fallo no se nota
  const hayAutomatico = Boolean(vista?.teamAAutomatic || vista?.teamBAutomatic);
  const [nombresDeLosEquipos, setNombresDeLosEquipos] = useState(null);
  useCargaCancelableEffect(
    () => getCompetitionDetailUseCase.execute(id),
    [id],
    {
      activa: hayAutomatico,
      alCargar: (competicion) =>
        setNombresDeLosEquipos({
          id,
          A: competicion.team1Name,
          B: competicion.team2Name,
        }),
    },
  );

  if (!primeraTerminada) return <FullScreenLoader />;

  return (
    <SobreDeLaRonda
      key={roundId}
      id={id}
      roundId={roundId}
      cargada={cargada}
      vista={vista}
      fallo={fallo}
      cargar={cargar}
      refrescar={refrescar}
      nombresDeLosEquipos={nombresDeLosEquipos}
    />
  );
};

export default EnvelopePage;
