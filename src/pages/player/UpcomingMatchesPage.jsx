import { useState, useEffect } from 'react';
import { Flag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import { useCargaCancelableEffect } from '../../hooks/useCargaCancelableEffect';
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

// Mismo cálculo que usa el panel para su banner de próximo partido: si cada
// pantalla lo hiciera por su cuenta, acabarían discrepando sobre qué cuenta
// como "próximo". Y la misma lectura sin cobertura, por lo mismo
const leeLoProximo = async (userId) => {
  // Las competiciones, una vez para las dos listas: cada petición sale del
  // mismo cubo de límites que comparte todo el campo (ADR-038)
  const competiciones = listUserCompetitionsUseCase.execute(userId);
  const [leido, partidas] = await Promise.all([
    leeLosProximosPartidos({
      lee: async () =>
        getUpcomingMatchesUseCase.executeWithCompleteness(
          userId,
          await competiciones,
        ),
      userId,
      pideLaVista: (id) => getScoringViewUseCase.execute(id),
    }),
    leeLasProximasPartidas({
      lee: async () =>
        getUpcomingTeeGroupsUseCase.executeWithCompleteness(
          userId,
          await competiciones,
        ),
      userId,
      pideLaVista: (id) => getTeeGroupScoringViewUseCase.execute(id),
    }),
  ]);
  return { leido, partidas };
};

const UpcomingMatchesPage = () => {
  const { t } = useTranslation('dashboard');
  const { user, loading: isLoadingUser } = useAuth();

  // Los partidos de la Ryder y las partidas de stroke play, juntos (FE #845)
  const [matches, setMatches] = useState([]);
  // Lo que se enseña puede venir de lo guardado, o no venir de ningún sitio
  // (FE #615). Vacío porque no se pudo preguntar no es «no tienes partidos».
  // De memoria se dice por lista: anotar sin red depende de de dónde vino
  const [desdeMemoria, setDesdeMemoria] = useState({
    partidos: false,
    partidas: false,
  });
  const [sinRespuesta, setSinRespuesta] = useState(false);
  // Una de las dos listas no contestó y la otra sí: se enseña lo que llegó,
  // diciendo que puede faltar alguno (revisión de la FE-B, Agustín, 13 oct)
  const [incompleta, setIncompleta] = useState(false);

  // Si cambia el usuario con una en vuelo, la vieja no se pinta. Sin usuario
  // no se pide nada ni se espera
  // Del id y no del objeto: la misma persona con un `user` nuevo no relee
  const userId = user?.id;
  const { cargando: isLoading } = useCargaCancelableEffect(
    () => leeLoProximo(userId),
    [userId],
    {
      activa: Boolean(userId),
      alCargar: ({ leido, partidas }) => {
        const juntos = [...leido.partidos, ...partidas.partidas].sort(
          porCuandoSeJuega,
        );
        setMatches(juntos);
        setDesdeMemoria({
          partidos: leido.desdeMemoria,
          partidas: partidas.desdeMemoria,
        });
        // Sin nada que enseñar y alguna sin contestar: no se sabe si no hay nada
        const algunaSinRespuesta = leido.sinRespuesta || partidas.sinRespuesta;
        setSinRespuesta(juntos.length === 0 && algunaSinRespuesta);
        // Y si alguna llegó a medias, también puede faltar alguno (`/code-review`)
        setIncompleta(
          juntos.length > 0 &&
            (algunaSinRespuesta || leido.incompleta || partidas.incompleta),
        );
      },
      // Si la lectura entera falla, tampoco se pudo preguntar: lo mismo que sin
      // cobertura y sin nada guardado, en vez de esperar para siempre
      alFallar: (error) => {
        // Que quede rastro: antes era un rechazo sin capturar, que Sentry recogía
        console.error('Error loading upcoming matches:', error);
        setMatches([]);
        setDesdeMemoria({ partidos: false, partidas: false });
        setSinRespuesta(true);
        setIncompleta(false);
      },
    },
  );

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
  // Sin usuario no se ha preguntado nada: no se puede decir que no tenga
  // partidos, ni enseñar lo de otra cuenta
  const sinPoderPreguntar = sinRespuesta || !userId;

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
          <h1 className="hidden md:block text-2xl font-bold text-gray-900">
            {t('upcomingMatches.title')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('upcomingMatches.subtitle')}
          </p>
        </div>

        {userId && (desdeMemoria.partidos || desdeMemoria.partidas) && (
          <p
            className="text-sm text-amber-800 mb-4"
            data-testid="upcoming-matches-desde-memoria"
          >
            {/* Solo una de las dos de memoria: «algunos de» los que se vieron */}
            {t(
              desdeMemoria.partidos && desdeMemoria.partidas
                ? 'upcomingMatches.desdeMemoria'
                : 'upcomingMatches.desdeMemoriaParcial',
            )}
          </p>
        )}

        {userId && incompleta && (
          <p
            className="text-sm text-amber-800 mb-4"
            data-testid="upcoming-matches-incompleta"
          >
            {t('upcomingMatches.incompleta')}
          </p>
        )}

        {sinPoderPreguntar ? (
          <div className="text-center py-12">
            <Flag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {t('upcomingMatches.sinRespuesta')}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {t('upcomingMatches.sinRespuestaDesc')}
            </p>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-12">
            <Flag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {t('upcomingMatches.noMatches')}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {t('upcomingMatches.noMatchesDesc')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {matches.map((partido) => (
              <TarjetaDeLoProximo
                key={`${partido.esPartidaDeFranja ? 'partida' : 'partido'}-${partido.id}`}
                partido={partido}
                puedeAnotar={sePuedeAnotar(partido, {
                  desdeMemoria: partido.esPartidaDeFranja
                    ? desdeMemoria.partidas
                    : desdeMemoria.partidos,
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
