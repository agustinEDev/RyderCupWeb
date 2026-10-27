import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Eye, Lock, RefreshCw, SearchX, Trophy } from 'lucide-react';
import HeaderAuth from '../../components/layout/HeaderAuth';
import BlockLoader from '../../components/ui/BlockLoader';
import TarjetasDeLaPartida from '../../components/scoring/TarjetasDeLaPartida';
import ScorecardTable from '../../components/scoring/ScorecardTable';
import { useAuth } from '../../hooks/useAuth';
import { useGoBack } from '../../hooks/useGoBack';
import { rutaDeAnotacion } from '../../utils/rutaDeAnotacion';
import { esDeUnaPrivada } from '../../utils/competicionPrivada';
import { PANTALLA_MENOS_BARRA_INFERIOR } from '../../utils/barraInferior';
import { getScoringViewUseCase, getTeeGroupScoringViewUseCase } from '../../composition';

const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;

/**
 * Qué se le dice: solo el 403 de una privada es «solo la ven quienes
 * participan»; otro 403 (Términos…) es un fallo más, con reintento (revisor).
 */
const motivoDelFallo = (error) => {
  if (esDeUnaPrivada(error)) return HTTP_FORBIDDEN;
  if (error?.status === HTTP_NOT_FOUND) return HTTP_NOT_FOUND;
  return 'otro';
};

/**
 * TarjetaDeUnAmigoPage - La partida (stroke play) o el partido (Ryder) de un
 * amigo, en solo lectura (release social 2, tabla del 27 oct 2026, F4/F6/F10).
 *
 * Se llega tocando su logro en Actividad. Como la vista compartida de una
 * partida rápida, NO usa el hook de anotación: no se anota, no se sondea, no
 * hay cola sin conexión. Se pide una vez la vista y se pinta.
 *
 * - Quien juega en ella va a su anotación de siempre.
 * - `?jugador=` marca la tarjeta de su amigo y lleva a su fila en la
 *   clasificación.
 * - Un 403 (privada sin la llave de un amigo que juegue en ella) dice que solo
 *   la ven quienes participan.
 *
 * @param {'partida'|'partido'} props.tipo - Partida de stroke play o partido de Ryder
 */
const TarjetaDeUnAmigoPage = ({ tipo }) => {
  const { id: competitionId, groupId, matchId } = useParams();
  const [params] = useSearchParams();
  const jugador = params.get('jugador');
  const { user } = useAuth();
  const { t } = useTranslation(['scoring', 'common']);
  const volver = useGoBack('/feed');
  const esPartida = tipo === 'partida';
  const idDeLaVista = esPartida ? groupId : matchId;

  const [vista, setVista] = useState(null);
  const [fallo, setFallo] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Otra partida sin desmontarse: de cero, sin enseñar la anterior (revisor)
  const [deLaVista, setDeLaVista] = useState(idDeLaVista);
  if (deLaVista !== idDeLaVista) {
    setDeLaVista(idDeLaVista);
    setVista(null);
    setFallo(null);
    setCargando(true);
  }
  // La carga vigente: una respuesta de otra partida ya no pinta nada
  const vigenteRef = useRef(idDeLaVista);

  const carga = useCallback(async () => {
    vigenteRef.current = idDeLaVista;
    setCargando(true);
    setFallo(null);
    const vigente = () => vigenteRef.current === idDeLaVista;
    try {
      const casoDeUso = esPartida ? getTeeGroupScoringViewUseCase : getScoringViewUseCase;
      const leida = await casoDeUso.execute(idDeLaVista);
      if (vigente()) setVista(leida);
    } catch (error) {
      if (!vigente()) return;
      setFallo(motivoDelFallo(error));
    } finally {
      if (vigente()) setCargando(false);
    }
  }, [esPartida, idDeLaVista]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the load sets state only after awaiting the API
    carga();
  }, [carga]);

  const juego = !!user?.id && (vista?.players ?? []).some((p) => p.userId === user.id);
  if (juego) {
    return (
      <Navigate
        to={rutaDeAnotacion({ id: idDeLaVista, competitionId, esPartidaDeFranja: esPartida })}
        replace
      />
    );
  }

  if (cargando && !vista) {
    return (
      <div className={`${PANTALLA_MENOS_BARRA_INFERIOR} bg-gray-50`}>
        <HeaderAuth />
        <BlockLoader texto={t(esPartida ? 'common:screens.friendGroup' : 'common:screens.friendMatch')} />
      </div>
    );
  }

  if (fallo !== null || !vista) {
    return (
      <div className={`${PANTALLA_MENOS_BARRA_INFERIOR} bg-gray-50`}>
        <HeaderAuth />
        <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
          <SinTarjeta fallo={fallo} onReintentar={carga} onVolver={volver} t={t} />
        </main>
      </div>
    );
  }

  const enSuFila = `/competitions/${competitionId}/leaderboard${
    jugador ? `?jugador=${encodeURIComponent(jugador)}` : ''
  }`;

  return (
    <div className={`${PANTALLA_MENOS_BARRA_INFERIOR} bg-gray-50`}>
      <HeaderAuth />
      <main className="max-w-4xl mx-auto px-4 py-4 pb-24">
        <BotonVolver onVolver={volver} t={t} className="hidden md:inline-flex mb-3" />
        {/* En móvil el título lo pinta la cabecera contextual: un segundo
            encabezado de nivel 1 rompería la jerarquía */}
        <h1 className="hidden md:block text-sm font-medium text-gray-500 mb-1">
          {t(esPartida ? 'common:screens.friendGroup' : 'common:screens.friendMatch')}
        </h1>
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-gray-900 break-words">
            {vista.matchNumber != null
              ? t(esPartida ? 'friendCard.groupTitle' : 'friendCard.matchTitle', {
                  number: vista.matchNumber,
                })
              : t(esPartida ? 'common:screens.friendGroup' : 'common:screens.friendMatch')}
          </h2>
          <span
            data-testid="tarjeta-solo-lectura"
            className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full"
          >
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            {t('friendCard.readOnly')}
          </span>
        </div>

        {esPartida ? (
          <TarjetasDeLaPartida
            scoringView={vista}
            userId={jugador ?? undefined}
            organiza={false}
            onCambio={carga}
          />
        ) : (
          <ScorecardTable
            holes={vista.holes}
            scores={vista.scores ?? []}
            players={vista.players}
            currentUserId={jugador ?? undefined}
            teamAName={vista.teamAName}
            teamBName={vista.teamBName}
            matchFormat={vista.matchFormat}
            retirados={vista.withdrawnPlayerIds ?? []}
          />
        )}

        <Link
          to={enSuFila}
          data-testid="tarjeta-ver-clasificacion"
          className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
        >
          <Trophy className="w-4 h-4" aria-hidden="true" />
          {t('friendCard.standings')}
        </Link>
      </main>
    </div>
  );
};

/** «Volver»: a la pantalla anterior, o a Actividad si no la hay. */
const BotonVolver = ({ onVolver, t, className = '' }) => (
  <button
    type="button"
    onClick={onVolver}
    data-testid="tarjeta-volver"
    className={`items-center gap-1 text-sm text-gray-500 hover:text-primary ${className}`}
  >
    <ArrowLeft className="w-4 h-4" aria-hidden="true" />
    {t('friendCard.back')}
  </button>
);

/** No hay tarjeta que enseñar: no se puede ver, no existe, o falló la carga. */
const SinTarjeta = ({ fallo, onReintentar, onVolver, t }) => {
  if (fallo === HTTP_FORBIDDEN) {
    return <Aviso testId="tarjeta-prohibida" Icono={Lock} texto={t('friendCard.forbidden')} onVolver={onVolver} t={t} />;
  }
  if (fallo === HTTP_NOT_FOUND) {
    return <Aviso testId="tarjeta-no-existe" Icono={SearchX} texto={t('friendCard.notFound')} onVolver={onVolver} t={t} />;
  }
  return (
    <Aviso testId="tarjeta-error" Icono={RefreshCw} texto={t('friendCard.error')} onVolver={onVolver} t={t}>
      <button
        type="button"
        onClick={onReintentar}
        data-testid="tarjeta-reintentar"
        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
      >
        <RefreshCw className="w-4 h-4" aria-hidden="true" />
        {t('friendCard.retry')}
      </button>
    </Aviso>
  );
};

// Siempre con una salida: en escritorio no hay flecha en la cabecera
const Aviso = ({ testId, Icono, texto, onVolver, t, children }) => (
  <div data-testid={testId} className="text-center py-16 px-6 bg-white border border-gray-200 rounded-lg">
    <Icono className="w-10 h-10 mx-auto text-gray-300" aria-hidden="true" />
    <p className="mt-3 text-base font-semibold text-gray-900">{texto}</p>
    {children}
    <div className="mt-4">
      <BotonVolver onVolver={onVolver} t={t} className="inline-flex" />
    </div>
  </div>
);

export default TarjetaDeUnAmigoPage;
