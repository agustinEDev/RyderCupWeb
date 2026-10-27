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
import { getCompetitionDetailUseCase, getLeaderboardUseCase } from '../../composition';
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
  // Sin sesión no se ve (ni se podría releer): si se pierde, se quita (/code-review)
  const general = conSesion ? laDeStrokePlay : null;
  // Se relee mientras se juega o está a punto de jugarse (/code-review)
  const enJuego = ['CLOSED', 'IN_PROGRESS'].includes(general?.status);

  // Dynamic back link based on where the user came from. La general de un
  // stroke play vuelve siempre a su ficha: su agenda es la de la Ryder
  const from = location.state?.from;
  const aLaFicha = from === 'detail' || general !== null;
  const backTo = aLaFicha ? `/competitions/${competitionId}` : `/competitions/${competitionId}/schedule`;
  const backText = aLaFicha ? t('summary.backToCompetition') : t('summary.backToSchedule');
  // Se pregunta una vez por competición, no en cada refresco: el cubo de
  // límites es el mismo para todo el campo (ADR-038). Con la consulta en
  // curso: quien llega mientras tanto (el doble arranque de React en
  // desarrollo, un refresco) espera a esa misma (revisor)
  const fichaMirada = useRef(null);
  const pollRef = useRef(null);
  // La competición privada que ya dijo 403: relanzar el efecto (cambia la
  // sesión) no vuelve a preguntarla (/code-review)
  const privadaRef = useRef(null);

  // Su estado, cada 5 min: que empiece o acabe se sabe sin recargar, y acabada
  // deja de releerse (/code-review). Lo que llegue para otra, no vale
  const idActual = useRef(competitionId);
  useEffect(() => {
    idActual.current = competitionId;
  }, [competitionId]);
  const releerLaFicha = useCallback(() => {
    const para = competitionId;
    getCompetitionDetailUseCase
      .execute(para)
      .then((competicion) => {
        if (idActual.current === para && competicion?.hasTeams === false) setLaDeStrokePlay(competicion);
      })
      .catch(() => {});
  }, [competitionId]);
  useSondeoMientras(enJuego, releerLaFicha, CADA_FICHA);

  const yaSabida = desdeLaFicha !== null;
  useEffect(() => {
    // Hasta saber si hay sesión no se pide nada: si no, el 400 de un stroke
    // play salía un instante como error (/code-review). Y si la ficha ya dijo
    // que es un stroke play, la de la Ryder no hace falta
    if (!competitionId || sesionCargando || yaSabida) return undefined;
    if (privadaRef.current === competitionId) return undefined;
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

    const fetchLeaderboard = async () => {
      try {
        // Con sesión, la ficha primero: la de la Ryder contesta 400 a un stroke
        // play, y ese 400 acababa en la consola (QA, FE #865-6)
        // Sin sesión, ni se pregunta (`esDeStrokePlay`), ni se espera
        const competicion = conSesion ? await esDeStrokePlay() : null;
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
          privadaRef.current = competitionId;
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
      {user ? <HeaderAuth user={user} backTo={isLoading ? null : backTo} /> : <Header />}

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {/* Mientras carga no se sabe adónde: con un enlace compartido cambiaba
            de texto y de destino al detectar un stroke play (revisor) */}
        {!isLoading && (
          // Con sesión, en el móvil la flecha va en la cabecera (QA, FE #865-4)
          <Link
            to={backTo}
            className={`${user ? 'hidden md:inline-flex' : 'inline-flex'} items-center gap-1 text-sm text-gray-500 hover:text-primary mb-3`}
          >
            &larr; {backText}
          </Link>
        )}
        {/* Con sesión, en el móvil lo dice la cabecera: dos <h1> no */}
        <h1 className={`${user ? 'hidden md:block' : ''} text-2xl font-bold text-gray-900 ${general ? 'mb-1' : 'mb-6'}`}>
          {t('leaderboard.title')}
        </h1>

        {isLoading && (
          <BlockLoader texto={t('loading')} />
        )}

        {error && !isLoading && (
          <div className="text-center py-8">
            {esDeUnaPrivada(error) ? (
              <p data-testid="clasificacion-privada" className="text-gray-600">
                {t('leaderboard.private')}
              </p>
            ) : (
              <p className="text-red-600">{error.message || t('errors.generic')}</p>
            )}
          </div>
        )}

        {general ? (
          <>
            <p className="mb-5 text-sm text-gray-500">{general.name}</p>
            <ClasificacionesDeLaCompeticion
              // Otra competición, de cero: la pestaña y la categoría elegidas no pasan
              key={competitionId}
              competitionId={competitionId}
              userId={jugador || user?.id}
              enJuego={enJuego}
            />
          </>
        ) : (
          !isLoading && !error && <LeaderboardView leaderboard={leaderboard} jugador={jugador} />
        )}
      </main>

      {!user && <Footer />}
    </div>
  );
};

export default LeaderboardPage;
