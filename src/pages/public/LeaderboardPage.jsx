import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import Header from '../../components/layout/Header';
import HeaderAuth from '../../components/layout/HeaderAuth';
import Footer from '../../components/layout/Footer';
import LeaderboardView from '../../components/scoring/LeaderboardView';
import ClasificacionesDeLaCompeticion from '../../components/scoring/ClasificacionesDeLaCompeticion';
import { useAuth } from '../../hooks/useAuth';
import { getCompetitionDetailUseCase, getLeaderboardUseCase } from '../../composition';
import BlockLoader from '../../components/ui/BlockLoader';
import { esFalloDeRed } from '../../utils/sinCobertura';

const POLL_INTERVAL = 30000; // 30 seconds

const LeaderboardPage = () => {
  const { id: competitionId } = useParams();
  const { t } = useTranslation('scoring');
  const { user } = useAuth();
  const location = useLocation();

  const [leaderboard, setLeaderboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // Un Stableford o un Medal tiene aquí su general (14 oct 2026: en la ficha,
  // con 200 participantes, no cabe). La de la Ryder contesta 400 y la ficha
  // dice cuál es. Con el id de la ruta para el que se leyó: si la página pasa
  // a otra competición sin desmontarse, no pinta la de la anterior
  const [strokePlay, setStrokePlay] = useState(null);
  const laDeStrokePlay = strokePlay?.para === competitionId ? strokePlay.competicion : null;

  // Dynamic back link based on where the user came from. La general de un
  // stroke play vuelve siempre a su ficha: su agenda es la de la Ryder
  const from = location.state?.from;
  const aLaFicha = from === 'detail' || laDeStrokePlay !== null;
  const backTo = aLaFicha ? `/competitions/${competitionId}` : `/competitions/${competitionId}/schedule`;
  const backText = aLaFicha ? t('summary.backToCompetition') : t('summary.backToSchedule');
  // Se pregunta una vez por competición, no en cada refresco: el cubo de
  // límites es el mismo para todo el campo (ADR-038)
  const fichaMirada = useRef(null);
  // Si hay sesión, no el objeto: uno nuevo en cada render relanzaría la carga
  const conSesion = Boolean(user);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!competitionId) return;
    let vigente = true;

    // Sin sesión no se puede leer la ficha (ni entrar en ella): ni se pregunta
    const esDeStrokePlay = async () => {
      if (!conSesion || fichaMirada.current === competitionId) return null;
      fichaMirada.current = competitionId;
      const competicion = await getCompetitionDetailUseCase.execute(competitionId).catch((err) => {
        // Sin respuesta (sin red) no se sabe nada: el siguiente refresco vuelve
        // a preguntar. Con respuesta, aunque sea un error, no (CodeRabbit, #863).
        // Y solo si la marca sigue siendo de esta: una consulta vieja no borra la
        // de la competición que se mira ahora (revisor)
        if (esFalloDeRed(err) && fichaMirada.current === competitionId) fichaMirada.current = null;
        return null;
      });
      return competicion?.hasTeams === false ? competicion : null;
    };

    const fetchLeaderboard = async () => {
      try {
        const data = await getLeaderboardUseCase.execute(competitionId);
        if (!vigente) return;
        setLeaderboard(data);
        setError(null);
      } catch (err) {
        const competicion = err?.status === 400 ? await esDeStrokePlay() : null;
        if (competicion) {
          if (!vigente) return;
          setStrokePlay({ para: competitionId, competicion });
          setError(null);
          // La de la Ryder no va a cambiar de opinión: se deja de pedir
          clearInterval(pollRef.current);
          return;
        }
        if (vigente) setError(err);
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
  }, [competitionId, conSesion]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {user ? <HeaderAuth user={user} /> : <Header />}

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <Link
          to={backTo}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-3"
        >
          &larr; {backText}
        </Link>
        <h1 className={`text-2xl font-bold text-gray-900 ${laDeStrokePlay ? 'mb-1' : 'mb-6'}`}>{t('leaderboard.title')}</h1>

        {isLoading && (
          <BlockLoader texto={t('loading')} />
        )}

        {error && !isLoading && (
          <div className="text-center py-8">
            <p className="text-red-600">{error.message || t('errors.generic')}</p>
          </div>
        )}

        {laDeStrokePlay ? (
          <>
            <p className="mb-5 text-sm text-gray-500">{laDeStrokePlay.name}</p>
            <ClasificacionesDeLaCompeticion
              // Otra competición, de cero: la pestaña y la categoría elegidas no pasan
              key={competitionId}
              competitionId={competitionId}
              userId={user?.id}
              enJuego={laDeStrokePlay.status === 'IN_PROGRESS'}
            />
          </>
        ) : (
          !isLoading && !error && <LeaderboardView leaderboard={leaderboard} />
        )}
      </main>

      {!user && <Footer />}
    </div>
  );
};

export default LeaderboardPage;
