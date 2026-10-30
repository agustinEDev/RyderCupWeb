import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useLocation, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import Header from '../../components/layout/Header';
import HeaderAuth from '../../components/layout/HeaderAuth';
import Footer from '../../components/layout/Footer';
import LeaderboardView from '../../components/scoring/LeaderboardView';
import ClasificacionesDeLaCompeticion from '../../components/scoring/ClasificacionesDeLaCompeticion';
import { esDeUnaPrivada } from '../../utils/competicionPrivada';
import { useAuth } from '../../hooks/useAuth';
import {
  getCompetitionDetailUseCase,
  getCompetitionSummaryUseCase,
  getLeaderboardUseCase,
} from '../../composition';
import BlockLoader from '../../components/ui/BlockLoader';
import { esFalloDeRed } from '../../utils/sinCobertura';
import { useSondeoMientras } from '../../hooks/useSondeoMientras';
import { PANTALLA_MENOS_BARRA_INFERIOR } from '../../utils/barraInferior';

const POLL_INTERVAL = 30000; // 30 seconds
// La ficha de un stroke play en juego, para enterarse de que empieza o acaba
const CADA_FICHA = 5 * 60000;
// La ficha se pregunta antes que la clasificación: si no contesta, no puede
// dejar la página cargando para siempre (CodeRabbit)
export const TOPE_DE_LA_FICHA_MS = 8000;
// Sin sesión, una privada se dice sin preguntar por su clasificación: como el
// 403 que daría (release social 3)
const privada = () => Object.assign(new Error('PRIVATE_COMPETITION'), { status: 403, errorCode: 'PRIVATE_COMPETITION' });

const LeaderboardPage = () => {
  const { id: competitionId } = useParams();
  const { t } = useTranslation('scoring');
  const { user, loading: sesionCargando } = useAuth();
  const location = useLocation();
  // La fila de un amigo, desde su posición o su logro en Actividad (release social 2)
  const [parametros] = useSearchParams();
  const jugador = parametros.get('jugador');
  // Desde la ficha llega lo que ya se sabe de la competición: de esta, y de
  // un stroke play, no hace falta preguntar nada para pintar su general
  // (/code-review)
  const traida = location.state?.competicion;
  const desdeLaFicha = traida?.id === competitionId && traida?.hasTeams === false ? traida : null;

  const [leaderboard, setLeaderboard] = useState(null);
  const [isLoading, setIsLoading] = useState(!desdeLaFicha);
  const [error, setError] = useState(null);
  // Un Stableford o un Medal tiene aquí su general (14 oct 2026: en la ficha,
  // con 200 participantes, no cabe). Lo dice la ficha, que con sesión se mira
  // antes de pedir la de la Ryder
  const [laDeStrokePlay, setLaDeStrokePlay] = useState(desdeLaFicha);
  // Otra competición sin desmontarse: de cero, sin enseñar nada de la anterior
  // mientras llega lo suyo (revisor)
  const [delId, setDelId] = useState(competitionId);
  if (delId !== competitionId) {
    setDelId(competitionId);
    setLeaderboard(null);
    setError(null);
    setIsLoading(!desdeLaFicha);
    setLaDeStrokePlay(desdeLaFicha);
  }
  // Si hay sesión, no el objeto: uno nuevo en cada render relanzaría la carga
  const conSesion = Boolean(user);
  // Quién mira, para la marca de privada (no relanza la carga)
  const quienMira = useRef(null);
  const idDeQuienMira = user?.id ?? null;
  useEffect(() => {
    quienMira.current = idDeQuienMira;
  }, [idDeQuienMira]);
  // La ve cualquiera, también sin sesión (release social 3): sin ella se relee
  // con el resumen público
  // Salvo una privada que ya no se puede ver (se perdió la sesión): su aviso, sin
  // la general de antes debajo (revisor)
  const general = esDeUnaPrivada(error) ? null : laDeStrokePlay;
  // Se relee mientras se juega o está a punto de jugarse (/code-review)
  const enJuego = ['CLOSED', 'IN_PROGRESS'].includes(general?.status);
  // De qué torneo es, bajo el título: la de una Ryder lo trae ella (pasada del
  // Kind, 30 oct 2026: sin sesión, el enlace no decía de cuál era)
  const nombre = general ? general.name : !error && leaderboard?.competitionName;

  // Dynamic back link based on where the user came from. La general de un
  // stroke play vuelve siempre a su ficha: su agenda es la de la Ryder
  const from = location.state?.from;
  const aLaFicha = from === 'detail' || general !== null;
  // La ficha y la agenda piden sesión: el visitante vuelve a la portada (29 oct 2026)
  let volver;
  if (!user) volver = { to: '/', texto: t('leaderboard.backToHome') };
  else if (aLaFicha) volver = { to: `/competitions/${competitionId}`, texto: t('summary.backToCompetition') };
  else volver = { to: `/competitions/${competitionId}/schedule`, texto: t('summary.backToSchedule') };
  // Se pregunta una vez por competición, no en cada refresco: el cubo de
  // límites es el mismo para todo el campo (ADR-038). Con la consulta en
  // curso: quien llega mientras tanto (el doble arranque de React en
  // desarrollo, un refresco) espera a esa misma (revisor)
  const fichaMirada = useRef(null);
  const pollRef = useRef(null);
  // La competición privada que ya dijo 403: relanzar el efecto (cambia la
  // sesión) no vuelve a preguntarla (/code-review)
  const privadaRef = useRef(null);
  // El resumen público, una vez por competición: sin sesión, cada refresco de
  // una Ryder no lo vuelve a pedir (release social 3)
  const resumenLeido = useRef(null);

  // Su estado, cada 5 min: que empiece o acabe se sabe sin recargar, y acabada
  // deja de releerse (/code-review). Lo que llegue para otra, no vale
  const idActual = useRef(competitionId);
  useEffect(() => {
    idActual.current = competitionId;
  }, [competitionId]);
  const releerLaFicha = useCallback(() => {
    const para = competitionId;
    // La ficha pide sesión; sin ella, el resumen público (release social 3)
    (conSesion ? getCompetitionDetailUseCase : getCompetitionSummaryUseCase)
      .execute(para)
      .then((competicion) => {
        if (idActual.current === para && competicion?.hasTeams === false) setLaDeStrokePlay(competicion);
      })
      .catch(() => {});
  }, [competitionId, conSesion]);
  useSondeoMientras(enJuego, releerLaFicha, CADA_FICHA);

  const yaSabida = desdeLaFicha !== null;
  useEffect(() => {
    // Hasta saber si hay sesión no se pide nada: si no, el 400 de un stroke
    // play salía un instante como error (/code-review). Y si la ficha ya dijo
    // que es un stroke play, la de la Ryder no hace falta
    // Sin sesión ya no vale lo que trajo la ficha: se mira el resumen (code-review)
    if (!competitionId || sesionCargando || (yaSabida && conSesion)) return undefined;
    // La marca es de esa competición: al pasar a otra se olvida, o al volver a
    // la privada la página se quedaba cargando para siempre (CodeRabbit)
    // Privada con sesión lo es también sin ella; pero quien entra (otra pestaña)
    // la mira con la suya (revisor)
    // Y si entra otro, también (code-review)
    const marca = { id: competitionId, quien: quienMira.current };
    const vista = privadaRef.current;
    const entraOtro = conSesion && vista?.quien !== quienMira.current;
    if (vista !== null && (vista.id !== competitionId || entraOtro)) privadaRef.current = null;
    if (privadaRef.current !== null) return undefined;
    let vigente = true;

    // Sin sesión no se puede leer la ficha (ni entrar en ella): quien llama ni
    // pregunta (`fetchLeaderboard`)
    const esDeStrokePlay = () => {
      if (fichaMirada.current?.id === competitionId) return fichaMirada.current.promesa;
      const marca = { id: competitionId, promesa: null };
      const ficha = getCompetitionDetailUseCase
        .execute(competitionId)
        .then((competicion) => (competicion?.hasTeams === false ? competicion : null))
        .catch((err) => {
          // Sin respuesta (sin red) no se sabe nada: el siguiente refresco vuelve
          // a preguntar. Con respuesta, aunque sea un error, no (CodeRabbit, #863).
          // Y solo si la marca sigue siendo esta: una consulta vieja no borra la
          // de la competición que se mira ahora (revisor)
          if (esFalloDeRed(err) && fichaMirada.current === marca) fichaMirada.current = null;
          return null;
        });
      // Con un plazo: vencido, se sigue sin ella (la de la Ryder) y, como sin
      // red, el siguiente refresco vuelve a preguntar (CodeRabbit)
      let temporizador;
      const plazo = new Promise((resolver) => {
        temporizador = setTimeout(() => {
          if (fichaMirada.current === marca) fichaMirada.current = null;
          resolver(null);
        }, TOPE_DE_LA_FICHA_MS);
      });
      marca.promesa = Promise.race([ficha, plazo]).finally(() => clearTimeout(temporizador));
      fichaMirada.current = marca;
      return marca.promesa;
    };

    // Sin sesión, el resumen público dice qué es: una privada, un stroke play o
    // una Ryder. Si no contesta, se sigue como antes (la de la Ryder dirá)
    const delResumen = async () => {
      if (resumenLeido.current?.id === competitionId) return resumenLeido.current.resumen;
      try {
        const resumen = await getCompetitionSummaryUseCase.execute(competitionId);
        resumenLeido.current = { id: competitionId, resumen };
        return resumen;
      } catch (err) {
        // Un no definitivo (un 4xx) no se repite en cada refresco (el cupo es de
        // todos, ADR-038); sin red, un 429 o un 5xx, sí (revisor, code-review)
        const definitivo = err?.status >= 400 && err?.status < 500 && err?.status !== 429;
        if (definitivo) resumenLeido.current = { id: competitionId, resumen: null };
        return null;
      }
    };

    const fetchLeaderboard = async () => {
      try {
        // Con sesión, la ficha primero: la de la Ryder contesta 400 a un stroke
        // play, y ese 400 acababa en la consola (QA, FE #865-6)
        // Sin sesión, la ficha no (`esDeStrokePlay`): el resumen público
        let competicion;
        if (conSesion) {
          competicion = await esDeStrokePlay();
        } else {
          const resumen = await delResumen();
          if (!vigente) return;
          if (resumen?.visibility === 'PRIVATE') throw privada();
          competicion = resumen?.hasTeams === false ? resumen : null;
        }
        if (!vigente) return;
        if (competicion) {
          setLaDeStrokePlay(competicion);
          setError(null);
          // Ya se sabe qué es: la de la Ryder ni se pide
          clearInterval(pollRef.current);
          return;
        }
        const data = await getLeaderboardUseCase.execute(competitionId);
        if (!vigente) return;
        setLeaderboard(data);
        setError(null);
      } catch (err) {
        if (!vigente) return;
        setError(err);
        // De una privada sin llave, ni se repite: otro 403 cada 30 s no
        // arregla nada y gasta el cupo compartido (revisor)
        if (esDeUnaPrivada(err)) {
          privadaRef.current = marca;
          clearInterval(pollRef.current);
        }
      } finally {
        if (vigente) setIsLoading(false);
      }
    };

    fetchLeaderboard();

    // Poll for updates if there are active matches
    pollRef.current = setInterval(fetchLeaderboard, POLL_INTERVAL);

    return () => {
      vigente = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [competitionId, conSesion, sesionCargando, yaSabida]);

  return (
    // La pantalla menos la barra inferior y el aviso de instalar, que App suma
    // al final: con `min-h-screen` hacía scroll casi vacía (pasada del Kind)
    <div className={`${PANTALLA_MENOS_BARRA_INFERIOR} bg-gray-50 flex flex-col`}>
      {/* La flecha, adonde va el volver de la página (la agenda de una Ryder a
          la que se llegó desde ella); mientras carga no se sabe: sin flecha */}
      {user ? <HeaderAuth user={user} backTo={isLoading ? null : volver.to} /> : <Header />}

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {/* Mientras carga no se sabe adónde: con un enlace compartido cambiaba
            de texto y de destino al detectar un stroke play (revisor). Ni sin
            saber si hay sesión: el visitante va al inicio y quien la tiene, a
            la ficha (revisor, 29 oct 2026) */}
        {!isLoading && !sesionCargando && (
          // Con sesión, en el móvil la flecha va en la cabecera (QA, FE #865-4)
          <Link
            to={volver.to}
            data-testid="volver"
            className={`${user ? 'hidden md:inline-flex' : 'inline-flex'} items-center gap-1 text-sm text-gray-500 hover:text-primary mb-3`}
          >
            &larr; {volver.texto}
          </Link>
        )}
        {/* Con sesión, en el móvil lo dice la cabecera: dos <h1> no */}
        <h1 className={`${user ? 'hidden md:block' : ''} text-2xl font-bold text-gray-900 ${nombre ? 'mb-1' : 'mb-6'}`}>
          {t('leaderboard.title')}
        </h1>
        {nombre && (
          <p data-testid="nombre-de-la-competicion" className="mb-5 text-sm text-gray-500">
            {nombre}
          </p>
        )}

        {isLoading && (
          <BlockLoader texto={t('loading')} />
        )}

        {error && !isLoading && (
          <div className="text-center py-8">
            {esDeUnaPrivada(error) ? (
              <>
                <p data-testid="clasificacion-privada" className="text-gray-600">
                  {t('leaderboard.private')}
                </p>
                {/* Sin sesión, quien participa entra y la ve (release social 3) */}
                {!user && (
                  <Link
                    to="/login"
                    // Tras entrar, de vuelta aquí (revisor)
                    state={{ from: location }}
                    data-testid="iniciar-sesion"
                    className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                  >
                    {t('leaderboard.signIn')}
                  </Link>
                )}
              </>
            ) : (
              <p className="text-red-600">{error.message || t('errors.generic')}</p>
            )}
          </div>
        )}

        {general ? (
          <ClasificacionesDeLaCompeticion
            // Otra competición, de cero: la pestaña y la categoría elegidas no pasan
            // Y al entrar o salir: con sesión llega mi fila (revisor)
            key={`${competitionId}:${conSesion}`}
            competitionId={competitionId}
            userId={jugador || user?.id}
            enJuego={enJuego}
          />
        ) : (
          !isLoading && !error && <LeaderboardView leaderboard={leaderboard} jugador={jugador} />
        )}
      </main>

      {!user && <Footer />}
    </div>
  );
};

export default LeaderboardPage;
