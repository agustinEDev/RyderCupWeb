import { useState, useEffect, useCallback } from 'react';
import { Flag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import {
  getScoringViewUseCase,
  getTeeGroupScoringViewUseCase,
  getUpcomingMatchesUseCase,
  getUpcomingTeeGroupsUseCase,
  listUserCompetitionsUseCase,
} from '../../composition';
import {
  laProximaApertura,
  leeLasProximasPartidas,
  leeLosProximosPartidos,
  sePuedeAnotar,
} from '../../services/partidosSinCobertura';
import { porCuandoSeJuega } from '../../utils/elMasCercano';
import BlockLoader from '../../components/ui/BlockLoader';
import TarjetaDeLoProximo from '../../components/schedule/TarjetaDeLoProximo';
import { PANTALLA_MENOS_BARRA_INFERIOR } from '../../utils/barraInferior';

// `setTimeout` no aguanta más de 2^31-1 ms: por encima dispara INMEDIATAMENTE y
// en bucle. Una ronda a más de 24 días vista no necesita despertar a nadie
const MAXIMO_TEMPORIZADOR_MS = 2 ** 31 - 1;

const UpcomingMatchesPage = () => {
  const { t } = useTranslation('dashboard');
  const { user, loading: isLoadingUser } = useAuth();

  // Los partidos de la Ryder y las partidas de stroke play, juntos (FE #845)
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // Lo que se enseña puede venir de lo guardado, o no venir de ningún sitio
  // (FE #615). Vacío porque no se pudo preguntar no es «no tienes partidos».
  // De memoria se dice por lista: anotar sin red depende de de dónde vino
  const [desdeMemoria, setDesdeMemoria] = useState({ partidos: false, partidas: false });
  const [sinRespuesta, setSinRespuesta] = useState(false);
  // Una de las dos listas no contestó y la otra sí: se enseña lo que llegó,
  // diciendo que puede faltar alguno (revisión de la FE-B, Agustín, 13 oct)
  const [incompleta, setIncompleta] = useState(false);

  const loadMatches = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    // Mismo cálculo que usa el panel para su banner de próximo partido: si
    // cada pantalla lo hiciera por su cuenta, acabarían discrepando sobre
    // qué cuenta como "próximo". Y la misma lectura sin cobertura, por lo mismo
    // Las competiciones, una vez para las dos listas: cada petición sale del
    // mismo cubo de límites que comparte todo el campo (ADR-038)
    const competiciones = listUserCompetitionsUseCase.execute(user.id);
    const [leido, partidas] = await Promise.all([
      leeLosProximosPartidos({
        lee: async () => getUpcomingMatchesUseCase.executeWithCompleteness(user.id, await competiciones),
        userId: user.id,
        pideLaVista: (id) => getScoringViewUseCase.execute(id),
      }),
      leeLasProximasPartidas({
        lee: async () => getUpcomingTeeGroupsUseCase.executeWithCompleteness(user.id, await competiciones),
        userId: user.id,
        pideLaVista: (id) => getTeeGroupScoringViewUseCase.execute(id),
      }),
    ]);
    const juntos = [...leido.partidos, ...partidas.partidas].sort(porCuandoSeJuega);
    setMatches(juntos);
    setDesdeMemoria({ partidos: leido.desdeMemoria, partidas: partidas.desdeMemoria });
    // Sin nada que enseñar y alguna sin contestar: no se sabe si no hay nada
    const algunaSinRespuesta = leido.sinRespuesta || partidas.sinRespuesta;
    setSinRespuesta(juntos.length === 0 && algunaSinRespuesta);
    // Y si alguna llegó a medias, también puede faltar alguno (`/code-review`)
    setIncompleta(juntos.length > 0 && (algunaSinRespuesta || leido.incompleta || partidas.incompleta));
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
      loadMatches();
    }
  }, [user, loadMatches]);

  // Y un despertador para la hora en que abre el primero que esté por abrir: la
  // lista se pinta UNA vez, así que quien la abre a las 05:50 esperando las
  // 06:00 no vería aparecer el botón hasta recargar —en el tee y con mala
  // cobertura, que es el peor momento para pedirle eso a nadie—
  const [, marcaLaHora] = useState(0);
  const proximaApertura = laProximaApertura(matches);
  useEffect(() => {
    if (proximaApertura === null) return undefined;
    const falta = proximaApertura - Date.now();
    if (falta <= 0 || falta > MAXIMO_TEMPORIZADOR_MS) return undefined;
    const aviso = setTimeout(() => marcaLaHora((n) => n + 1), falta + 1000);
    return () => clearTimeout(aviso);
  }, [proximaApertura]);

  const isPageLoading = isLoadingUser || isLoading;

  if (isPageLoading) {
    // La cabecera se queda puesta durante la espera: aparecer de golpe al
    // terminar es un salto, y de eso va justamente FE #495
    return (
      <div className={`${PANTALLA_MENOS_BARRA_INFERIOR} bg-gray-50`}>
        <HeaderAuth user={user} />
        <BlockLoader texto={t('upcomingMatches.loading')} />
      </div>
    );
  }

  return (
    <div className={`${PANTALLA_MENOS_BARRA_INFERIOR} bg-gray-50`}>
      <HeaderAuth user={user} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="hidden md:block text-2xl font-bold text-gray-900">{t('upcomingMatches.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('upcomingMatches.subtitle')}</p>
        </div>

        {(desdeMemoria.partidos || desdeMemoria.partidas) && (
          <p className="text-sm text-amber-800 mb-4" data-testid="upcoming-matches-desde-memoria">
            {/* Solo una de las dos de memoria: «algunos de» los que se vieron */}
            {t(desdeMemoria.partidos && desdeMemoria.partidas ? 'upcomingMatches.desdeMemoria' : 'upcomingMatches.desdeMemoriaParcial')}
          </p>
        )}

        {incompleta && (
          <p className="text-sm text-amber-800 mb-4" data-testid="upcoming-matches-incompleta">
            {t('upcomingMatches.incompleta')}
          </p>
        )}

        {sinRespuesta ? (
          <div className="text-center py-12">
            <Flag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">{t('upcomingMatches.sinRespuesta')}</p>
            <p className="text-sm text-gray-400 mt-1">{t('upcomingMatches.sinRespuestaDesc')}</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-12">
            <Flag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">{t('upcomingMatches.noMatches')}</p>
            <p className="text-sm text-gray-400 mt-1">{t('upcomingMatches.noMatchesDesc')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {matches.map((partido) => (
              <TarjetaDeLoProximo
                key={`${partido.esPartidaDeFranja ? 'partida' : 'partido'}-${partido.id}`}
                partido={partido}
                puedeAnotar={sePuedeAnotar(partido, {
                  desdeMemoria: partido.esPartidaDeFranja ? desdeMemoria.partidas : desdeMemoria.partidos,
                })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingMatchesPage;
