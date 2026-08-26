import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router';
import { motion } from 'framer-motion';
import { Trophy, Zap, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../components/layout/HeaderAuth';
import Avatar from '../components/ui/Avatar';
import HandicapRequestModal from '../components/profile/HandicapRequestModal';
import EmailVerificationBanner from '../components/EmailVerificationBanner';
import PendingActionsCard from '../components/dashboard/PendingActionsCard';
import PlayerStatsCards from '../components/dashboard/PlayerStatsCards';
import NextMatchBanner from '../components/dashboard/NextMatchBanner';
import RecentMatches from '../components/dashboard/RecentMatches';
import CreateQuickMatchModal from '../components/quick_match/CreateQuickMatchModal';
import { useAuth } from '../hooks/useAuth';
import { useEntryMotion } from '../hooks/useEntryMotion';
import { slideUp, staggerContainer, getEntryProps } from '../utils/animations';
import FullScreenLoader from '../components/ui/FullScreenLoader';
import { laPantallaEstaLista } from '../utils/cortinaDeArranque';
import {
  elPanelYaSePinto,
  anotaQueElPanelSePinto,
  ESPERA_MAXIMA_MS,
} from '../utils/primeraCargaDelPanel';
import {
  listUserCompetitionsUseCase,
  getPlayerStatsUseCase,
  getRecentMatchesUseCase,
  getUpcomingMatchesUseCase,
} from '../composition';

// El panel enseña un resumen, no el historial entero
const RECENT_MATCHES_SHOWN = 3;

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, ready: textosListos } = useTranslation('dashboard');
  const { t: tQuickMatch, ready: textosDeRapidaListos } = useTranslation('quickMatch');
  const { user, loading: isLoadingUser, refetch: refetchUser } = useAuth();
  const { animateEntry } = useEntryMotion();
  const [competitions, setCompetitions] = useState([]);
  const [isLoadingCompetitions, setIsLoadingCompetitions] = useState(true);
  const [playerStats, setPlayerStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [recentMatches, setRecentMatches] = useState([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(true);
  const [showHandicapModal, setShowHandicapModal] = useState(false);
  const [showQuickMatchModal, setShowQuickMatchModal] = useState(false);
  const [handicapPending, setHandicapPending] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem('handicap_pending') === 'true'
  );

  useEffect(() => {
    if (user && localStorage.getItem('needs_handicap') === 'true') {
      localStorage.removeItem('needs_handicap');
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
      setShowHandicapModal(true);
    }
  }, [user]);

  const handleHandicapSaved = useCallback(async () => {
    setShowHandicapModal(false);
    setHandicapPending(false);
    localStorage.removeItem('handicap_pending');
    await refetchUser();
  }, [refetchUser]);

  const handleHandicapDismiss = useCallback(() => {
    setShowHandicapModal(false);
    setHandicapPending(true);
    localStorage.setItem('handicap_pending', 'true');
  }, []);

  const handleQuickMatchStarted = useCallback((quickMatchId) => {
    setShowQuickMatchModal(false);
    navigate(`/quick-matches/${quickMatchId}/scoring`);
  }, [navigate]);

  useEffect(() => {
    // El mismo guardia que sus tres hermanos, que era el unico que no lo tenia:
    // dos peticiones solapadas —guardar el handicap con una en vuelo— podian
    // resolverse al reves, escribir competiciones rancias Y bajar la bandera
    // con la actual todavia abierta. Desde FE #485 esa bandera decide ademas
    // cuando se levanta la cortina.
    let cancelled = false;

    const loadDashboardData = async () => {
      // Mientras la sesion se resuelve no se pide nada NI se declara nada
      // terminado. `useAuth` no es un contexto: arranca siempre sin usuario y
      // con `loading` en alto, y bajar la bandera en esa primera pasada dejaba
      // las cinco a false justo en el render en que llega el usuario —antes de
      // que hubiera salido una sola peticion—. La cortina del arranque se
      // levantaba ahi, que es el defecto entero de vuelta (FE #485).
      //
      // Y salir aqui evita ademas pedirlo todo por duplicado: `refetchUser`
      // —al guardar el handicap— sube `loading` con el usuario VIEJO todavia
      // puesto, y sin este corte esa pasada lanzaba las cuatro peticiones una
      // vez, y el usuario nuevo otra.
      if (isLoadingUser) {
        return;
      }

      if (!user) {
        setIsLoadingCompetitions(false);
        return;
      }

      setIsLoadingCompetitions(true);
      try {

        // Fetch competitions using the same use case as My Competitions page
        // This ensures the count matches (user's competitions: created OR enrolled)
        const competitionsData = await listUserCompetitionsUseCase.execute(user.id);
        if (!cancelled) {
          setCompetitions(Array.isArray(competitionsData) ? competitionsData : []);
        }

      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        if (!cancelled) {
          setCompetitions([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCompetitions(false);
        }
      }
    };

    loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, [user, isLoadingUser]);

  useEffect(() => {
    // Las estadísticas ya no llegan tarde a proposito: desde FE #485 la primera
    // carga espera a las cuatro peticiones, porque encenderlas una a una era el
    // parpadeo que se veia. Un fallo deja las cifras en "--", que es lo mismo
    // que enseña una cuenta sin vueltas, y no detiene al resto.
    // Son datos personales: si el usuario cambia mientras una petición está en
    // vuelo, la respuesta vieja no debe escribir nada. Sin este guardia podría
    // llegar después de la nueva y dejar en pantalla las cifras de otra cuenta
    let cancelled = false;

    const loadPlayerStats = async () => {
      // Mientras la sesion se resuelve no se pide nada NI se declara nada
      // terminado. `useAuth` no es un contexto: arranca siempre sin usuario y
      // con `loading` en alto, y bajar la bandera en esa primera pasada dejaba
      // las cinco a false justo en el render en que llega el usuario —antes de
      // que hubiera salido una sola peticion—. La cortina del arranque se
      // levantaba ahi, que es el defecto entero de vuelta (FE #485).
      //
      // Y salir aqui evita ademas pedirlo todo por duplicado: `refetchUser`
      // —al guardar el handicap— sube `loading` con el usuario VIEJO todavia
      // puesto, y sin este corte esa pasada lanzaba las cuatro peticiones una
      // vez, y el usuario nuevo otra.
      if (isLoadingUser) {
        return;
      }

      if (!user) {
        setIsLoadingStats(false);
        return;
      }

      setIsLoadingStats(true);
      try {
        const stats = await getPlayerStatsUseCase.execute();
        if (!cancelled) {
          setPlayerStats(stats);
        }
      } catch (error) {
        console.error('Failed to load player stats:', error);
        if (!cancelled) {
          setPlayerStats(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStats(false);
        }
      }
    };

    loadPlayerStats();

    return () => {
      cancelled = true;
    };
  }, [user, isLoadingUser]);

  useEffect(() => {
    // Mismo guardia de cuenta que las estadísticas: una respuesta en vuelo no
    // debe escribir sobre la de otra cuenta
    let cancelled = false;

    const loadRecentMatches = async () => {
      // Mientras la sesion se resuelve no se pide nada NI se declara nada
      // terminado. `useAuth` no es un contexto: arranca siempre sin usuario y
      // con `loading` en alto, y bajar la bandera en esa primera pasada dejaba
      // las cinco a false justo en el render en que llega el usuario —antes de
      // que hubiera salido una sola peticion—. La cortina del arranque se
      // levantaba ahi, que es el defecto entero de vuelta (FE #485).
      //
      // Y salir aqui evita ademas pedirlo todo por duplicado: `refetchUser`
      // —al guardar el handicap— sube `loading` con el usuario VIEJO todavia
      // puesto, y sin este corte esa pasada lanzaba las cuatro peticiones una
      // vez, y el usuario nuevo otra.
      if (isLoadingUser) {
        return;
      }

      if (!user) {
        setIsLoadingRecent(false);
        return;
      }

      setIsLoadingRecent(true);
      try {
        const matches = await getRecentMatchesUseCase.execute(RECENT_MATCHES_SHOWN);
        if (!cancelled) {
          setRecentMatches(matches);
        }
      } catch (error) {
        console.error('Failed to load recent matches:', error);
        if (!cancelled) {
          setRecentMatches([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRecent(false);
        }
      }
    };

    loadRecentMatches();

    return () => {
      cancelled = true;
    };
  }, [user, isLoadingUser]);

  useEffect(() => {
    // Se cargan aquí, y no dentro de cada componente, porque el banner de
    // próximo partido y el contador de acciones pendientes miran exactamente
    // los mismos partidos: pedirlos dos veces serían el doble de llamadas al
    // calendario de cada competición
    let cancelled = false;

    const loadUpcomingMatches = async () => {
      // Mientras la sesion se resuelve no se pide nada NI se declara nada
      // terminado. `useAuth` no es un contexto: arranca siempre sin usuario y
      // con `loading` en alto, y bajar la bandera en esa primera pasada dejaba
      // las cinco a false justo en el render en que llega el usuario —antes de
      // que hubiera salido una sola peticion—. La cortina del arranque se
      // levantaba ahi, que es el defecto entero de vuelta (FE #485).
      //
      // Y salir aqui evita ademas pedirlo todo por duplicado: `refetchUser`
      // —al guardar el handicap— sube `loading` con el usuario VIEJO todavia
      // puesto, y sin este corte esa pasada lanzaba las cuatro peticiones una
      // vez, y el usuario nuevo otra.
      if (isLoadingUser) {
        return;
      }

      if (!user) {
        setIsLoadingUpcoming(false);
        return;
      }

      if (isLoadingCompetitions) {
        // Se sale, pero esta peticion NO esta terminada: llega en cuanto las
        // competiciones aterricen. Dejar la bandera abajo abria un render con
        // las cinco a false y la peticion sin salir —el mismo «depende del
        // orden» que ya volvio cuatro veces—
        setIsLoadingUpcoming(true);
        return;
      }

      setIsLoadingUpcoming(true);
      try {
        const matches = await getUpcomingMatchesUseCase.execute(user.id, competitions);
        if (!cancelled) {
          setUpcomingMatches(matches);
        }
      } catch (error) {
        console.error('Failed to load upcoming matches:', error);
        if (!cancelled) {
          setUpcomingMatches([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingUpcoming(false);
        }
      }
    };

    loadUpcomingMatches();

    return () => {
      cancelled = true;
    };
  }, [user, isLoadingUser, competitions, isLoadingCompetitions]);


  // El aviso a la cortina del arranque (FE #485): esta pantalla pide CUATRO
  // cosas y hasta ahora se daba por cargada con dos —las de `isLoading`—. Las
  // otras dos aterrizaban despues y encendian su bloque cada una por su lado:
  // esos eran los dos parpadeos del iPhone. Aqui se avisa cuando no queda nada
  // en vuelo, ni siquiera lo que no bloquea la pagina.
  //
  // Las dependencias son los propios estados, no una lista vacia: React no
  // vuelve a ejecutar los efectos pasivos de un subarbol que `Suspense`
  // esconde y reaparece, y con `[]` el aviso se perderia.
  //
  // Los textos cuentan como carga: los trozos de i18n llegan en diferido, y
  // levantar la cortina sin ellos enseña las claves en crudo y un cambio de
  // texto a continuacion, que es el mismo parpadeo con otra cara.
  const noQuedaNadaCargando =
    textosListos &&
    textosDeRapidaListos &&
    !isLoadingUser &&
    !isLoadingCompetitions &&
    !isLoadingStats &&
    !isLoadingRecent &&
    !isLoadingUpcoming;

  // La espera de pantalla completa dura hasta que la PRIMERA carga esta entera.
  // Antes bastaban dos de las cuatro peticiones, asi que el panel aparecia a
  // medias y sus bloques se encendian uno detras de otro: tapado por la cortina
  // en el arranque, pero a la vista al entrar desde el formulario o al navegar
  // aqui dentro de la aplicacion.
  //
  // Con techo, por lo mismo que la cortina: una peticion que no vuelve no puede
  // dejar el panel en una espera eterna. Al agotarse se pinta con lo que haya,
  // que es como se comportaba siempre.
  const [seAgotoLaEspera, setSeAgotoLaEspera] = useState(false);

  // Con `[]`: el techo cuenta desde que esta pantalla se monta. Si `Suspense`
  // llegara a esconderla y devolverla, la cuenta empezaria de cero —lo dice la
  // nota de arriba: React no reejecuta los efectos pasivos de un subarbol que
  // reaparece, pero si vuelve a montarlo—. No importa: la cortina del arranque
  // lleva su propio techo, independiente de este.
  useEffect(() => {
    const plazo = setTimeout(() => setSeAgotoLaEspera(true), ESPERA_MAXIMA_MS);

    return () => clearTimeout(plazo);
  }, []);

  const puedePintar = noQuedaNadaCargando || seAgotoLaEspera;

  // Solo la PRIMERA vez manda: ni una recarga posterior —al guardar el
  // handicap— debe desmontar lo que ya hay en pantalla, ni volver aqui desde la
  // barra inferior debe repetir la espera entera. Se ajusta durante el render,
  // no en un efecto: React descarta este render y rehace el componente antes de
  // pintar nada, sin pasar por el DOM.
  const [yaSePinto, setYaSePinto] = useState(elPanelYaSePinto);

  if (puedePintar && !yaSePinto) {
    setYaSePinto(true);
  }

  // La marca de modulo se anota en un efecto: reasignarla durante el render es
  // un efecto secundario, y React puede descartar un render y rehacerlo
  useEffect(() => {
    if (yaSePinto) {
      anotaQueElPanelSePinto();
    }
  }, [yaSePinto]);

  // El segundo termino es el gate de siempre y no se puede perder: al agotarse
  // el techo con la sesion todavia sin resolver, `isLoading` bajaba y tres
  // lineas mas abajo `if (!user) return null` dejaba la pagina EN BLANCO. Una
  // instancia fria de Render tardando mas de tres segundos bastaba.
  const isLoading = (!yaSePinto && !puedePintar) || (isLoadingUser && !user);

  // El aviso a la cortina del arranque: en cuanto esta pantalla deja de
  // esperar —porque ya lo tiene todo, o porque se agoto el techo y va a
  // pintarse con lo que haya— no queda nada que tapar.
  //
  // Con usuario, ademas de sin esperas: sin esa condicion, un `/current-user`
  // que falle aqui —el token rotado entre la comprobacion de `ProtectedRoute` y
  // esta, o quedarse sin red— baja las cuatro banderas por la rama sin usuario,
  // y el aviso destapaba el `return null` de mas abajo: una pagina EN BLANCO a
  // pantalla completa. Si el usuario no llega, la cortina se va por su plazo,
  // que es justo para lo que esta.
  const noQuedaNadaQueTapar = !isLoading && Boolean(user);

  useEffect(() => {
    if (noQuedaNadaQueTapar) {
      laPantallaEstaLista();
    }
  }, [noQuedaNadaQueTapar]);

  if (isLoading) {
    // La MISMA espera que el resto de la aplicacion, no un circulo propio. Al
    // abrir la aplicacion instalada se encadenan tres esperas antes de llegar
    // aqui —el paquete de la pantalla de arranque, la consulta de sesion y el
    // paquete del panel— y todas pintan esta. Cambiar de dibujo justo en la
    // ultima es lo que se percibia como parpadeo: no son los cortes, es que la
    // imagen cambiaba.
    return <FullScreenLoader />;
  }

  if (!user) {
    // Al formulario, no un `null` que deja la pagina EN BLANCO. `ProtectedRoute`
    // dejo pasar porque SU consulta de sesion dijo que si, pero cada uno tiene
    // la suya —`useAuth` no es un contexto, FE #489— y la de aqui puede resolver
    // sin usuario: el token rotado entre las dos, o quedarse sin red. Como el
    // guardia sigue viendo su usuario, nadie redirigia y la pantalla se quedaba
    // vacia. La misma salida que usa el guardia, con el mismo `from`.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const firstName = user.first_name || 'User';

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white">
      <HandicapRequestModal
        isOpen={showHandicapModal}
        user={user}
        onClose={handleHandicapDismiss}
        onSaved={handleHandicapSaved}
      />
      {showQuickMatchModal && (
        <CreateQuickMatchModal
          onClose={() => setShowQuickMatchModal(false)}
          onStarted={handleQuickMatchStarted}
          currentUser={user}
        />
      )}
      <div className="layout-container flex h-full grow flex-col">
        <HeaderAuth user={user} />

        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <motion.div
            {...getEntryProps(animateEntry)}
            variants={staggerContainer}
            className="layout-content-container flex flex-col max-w-[960px] flex-1"
          >
            {/* Bienvenida y perfil en una sola pieza: la tarjeta que había
                debajo repetía el nombre y el hándicap, y de nuevo solo aportaba
                el correo y el acceso a cambiar la foto */}
            <motion.div variants={slideUp} className="flex items-center gap-3 p-4">
              <button
                type="button"
                onClick={() => navigate('/profile/edit')}
                aria-label={t('changePhoto')}
                className="group relative flex-shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Avatar userId={user.id} size="lg" version={user.updated_at} />
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-black/40">
                  <Pencil className="h-5 w-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                </span>
              </button>
              <div className="min-w-0">
                {/* whitespace-pre-line y no truncate: el saludo lleva un salto de
                    línea tras la coma porque en móvil el nombre se cortaba
                    siempre ("Bienvenido, Agus…"), justo la parte que importa.
                    El recorte es a TRES líneas, no a dos: el salto se lleva la
                    primera, así que con line-clamp-2 al nombre le quedaba una
                    sola y volvía a recortarse. Con tres, un nombre compuesto
                    largo cabe entero y el bloque sigue sin crecer sin límite */}
                <p className="whitespace-pre-line break-words line-clamp-3 text-2xl md:text-3xl font-bold leading-tight tracking-tight text-gray-900">
                  {t('welcome', { name: firstName })}
                </p>
                <p className="truncate text-sm text-gray-500">{user.email}</p>
              </div>
            </motion.div>

            {/* Email Verification Banner */}
            {user && !user.email_verified && (
              <div className="px-4">
                <EmailVerificationBanner userEmail={user.email} />
              </div>
            )}

            {/* Pending Actions */}
            <PendingActionsCard
              user={user}
              competitions={competitions}
              handicapPending={handicapPending}
              onHandicapAction={() => setShowHandicapModal(true)}
              upcomingMatches={upcomingMatches.length}
            />

            {/* Statistics Cards */}
            <motion.div variants={slideUp} className="p-4">
              <PlayerStatsCards
                stats={playerStats}
                isLoading={isLoadingStats}
                fallbackHandicap={user.handicap ?? null}
                fallbackTournaments={Array.isArray(competitions) ? competitions.length : 0}
              />
            </motion.div>

            {/* Next match: the centrepiece. Falls back to the quick match CTA
                that used to live above, so the band is never empty */}
            <motion.div variants={slideUp} className="px-4 pb-2">
              {/* El anuncio para lectores de pantalla lo da el panel, una sola
                  vez, y no las tarjetas: cada una va `silenciosa` porque montan
                  a la vez y se oiria «Cargando...» tres veces. Y ponerlo en una
                  de ellas tampoco vale: acciones pendientes no enseña espera
                  cuando recuerda lo de antes, asi que en una vuelta al panel
                  podia no quedar ninguna que anunciara nada */}
              {(isLoadingStats || isLoadingRecent || isLoadingUpcoming) && (
                <span role="status" aria-live="polite" className="sr-only">
                  {t('common:loading', { defaultValue: 'Cargando...' })}
                </span>
              )}
              <NextMatchBanner
                match={upcomingMatches[0] ?? null}
                isLoading={isLoadingUpcoming}
                onCreateQuickMatch={() => setShowQuickMatchModal(true)}
              />
            </motion.div>

            {/* Recent matches */}
            <motion.div variants={slideUp} className="px-4 pt-2">
              <RecentMatches
                matches={recentMatches}
                isLoading={isLoadingRecent}
                esperaSilenciosa
                onCreateQuickMatch={() => setShowQuickMatchModal(true)}
              />
              <button
                type="button"
                onClick={() => navigate('/quick-matches')}
                data-testid="quick-match-history-link"
                className="mt-2 text-xs text-primary-700 hover:text-primary-900 hover:underline"
              >
                {tQuickMatch('dashboard.viewHistory')}
              </button>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              variants={slideUp}
              className="p-4 mt-4"
            >
              <h2 className="text-gray-900 text-xl font-bold mb-4">{t('quickActions.title')}</h2>
              {/* Dos, no seis: Mis Torneos, Explorar, Amigos y Perfil ya viven
                  en la navegacion, y repetirlos aqui convertia el panel en un
                  menu con otro aspecto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Quick Match Card - primary action */}
                <motion.button
                  onClick={() => setShowQuickMatchModal(true)}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  data-testid="quick-match-card"
                  className="flex items-center gap-4 p-6 bg-primary-50 border-2 border-primary-500 rounded-xl hover:shadow-lg transition-all text-left group"
                >
                  <div className="p-3 bg-primary-500 rounded-lg">
                    <Zap className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-gray-900 font-bold text-lg group-hover:text-primary-600 transition-colors">
                      {t('quickActions.quickMatch')}
                    </h3>
                    <p className="text-gray-500 text-sm">{t('quickActions.quickMatchDesc')}</p>
                  </div>
                </motion.button>

                {/* Create Competition Card */}
                <motion.button
                  onClick={() => navigate('/competitions/create')}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-4 p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:shadow-lg transition-all text-left group"
                >
                  <div className="p-3 bg-primary-100 rounded-lg group-hover:bg-primary-500 transition-colors">
                    <Trophy className="w-7 h-7 text-primary-600 group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-gray-900 font-bold text-lg group-hover:text-primary-600 transition-colors">
                      {t('quickActions.createTournament')}
                    </h3>
                    <p className="text-gray-500 text-sm">{t('quickActions.createTournamentDesc')}</p>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
