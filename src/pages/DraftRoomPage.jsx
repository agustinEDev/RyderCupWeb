import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Bot, Timer, Trophy } from 'lucide-react';
import HeaderAuth from '../components/layout/HeaderAuth';
import FullScreenLoader from '../components/ui/FullScreenLoader';
import { useAuth } from '../hooks/useAuth';
import useDraftRoom from '../hooks/useDraftRoom';
import { getCompetitionDetailUseCase } from '../composition';

/**
 * La sala de draft en directo (FE #653).
 *
 * La ve el grupo entero, no solo los dos capitanes: esa es la gracia. La
 * pantalla dice tres cosas distintas según quién mire —al de turno, «te toca»
 * con su minuto; al otro capitán y a los espectadores, de quién es el turno—
 * y solo ofrece elegir a quien de verdad puede, que un botón que el servidor
 * va a rechazar con un 409 es peor que no tenerlo.
 *
 * Lo que eligió la aplicación al agotarse un minuto se marca: al capitán que
 * vuelve de quedarse sin cobertura le tiene que quedar claro por qué tiene a
 * ese jugador y no a otro.
 */
const mmss = (segundos) => `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;

// El turno perdido lo cuenta el hook, que sabe cómo quedó la sala al perderlo
const TURNO_PERDIDO = {
  turnoPerdido: 'draft.turnLost',
  turnoPerdidoYTerminado: 'draft.turnLostDraftOver',
};

const DraftRoomPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useTranslation('competitions');
  const { user } = useAuth();
  const [competition, setCompetition] = useState(null);
  const [eligiendo, setEligiendo] = useState(null);

  const { sala, cargando, error, segundosRestantes, esMiTurno, abrirSala, elegir } = useDraftRoom(
    id,
    user?.id
  );
  // Propias y no heredadas: un mensaje de error como «toString» no es un aviso
  const avisoDeTurno = Object.hasOwn(TURNO_PERDIDO, error ?? '') ? TURNO_PERDIDO[error] : null;

  const cargarCompeticion = useCallback(async () => {
    try {
      const ficha = await getCompetitionDetailUseCase.execute(id);
      setCompetition(ficha);
    } catch {
      // La sala se pinta igual sin la ficha: solo se pierden los nombres de
      // los equipos, que caen a «Equipo A» y «Equipo B»
      setCompetition(null);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la carga inicial de una pantalla, el mismo patrón que el resto del repo tras el bump del plugin (ver SchedulePage)
    cargarCompeticion();
  }, [cargarCompeticion]);

  // Lo que enseñe la ficha, que es lo que la gente ve en el resto de la app.
  // La letra solo cuando NO hay ficha: si la hay, sus nombres nunca faltan
  // —el mapper de competiciones ya rellena los que vengan vacíos—
  const nombreDe = (equipo) =>
    competition ? (equipo === 'A' ? competition.team1Name : competition.team2Name) : t(`draft.team${equipo}`);

  const capitanDe = (equipo) =>
    equipo === 'A' ? sala?.teamACaptainName : sala?.teamBCaptainName;

  const elegidosDe = (equipo) => (sala?.picks || []).filter((pick) => pick.team === equipo);

  // Por hándicap, de menor a mayor, que es como se elige; sin él, al final
  // (#710). El mapper ya lo deja en número o null
  const hcp = (jugador) => jugador.handicap ?? Infinity;
  const porElegir = [...(sala?.availablePlayers || [])].sort((a, b) => hcp(a) - hcp(b));

  const organiza = Boolean(user?.id) && competition?.creatorId === user.id;

  // El equipo que capitanea quien mira, y el último que entró solo en él (#723)
  const capitaneo =
    user?.id && sala?.teamACaptainId === user.id
      ? 'A'
      : user?.id && sala?.teamBCaptainId === user.id
        ? 'B'
        : null;
  const ultimoParaMi = (sala?.picks || []).find(
    (pick) => pick.lastRemaining && pick.team === capitaneo
  );

  const alElegir = async (playerId) => {
    setEligiendo(playerId);
    try {
      await elegir(playerId);
    } finally {
      setEligiendo(null);
    }
  };

  if (cargando) return <FullScreenLoader />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Con la sesión: sin ella la cabecera pintaba «?» y sin la insignia
          de administrador (#710) */}
      <HeaderAuth user={user} title={t('draft.title')} backTo={`/competitions/${id}`} />
      <div className="mx-auto max-w-3xl px-4 py-6">
        <button
          type="button"
          onClick={() => navigate(`/competitions/${id}`)}
          className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('draft.back')}
        </button>

        {/* `hidden md:block`: en móvil el título lo pinta la cabecera
            contextual, y un segundo encabezado de nivel 1 rompe la jerarquía
            para un lector de pantalla. `hidden` sí lo saca del árbol de
            accesibilidad, al contrario que una clase de solo-lectores */}
        <h1 className="hidden md:block mb-1 text-2xl font-bold text-gray-900">{t('draft.title')}</h1>
        <p className="mb-6 text-sm text-gray-600">{competition?.name}</p>

        {error && !avisoDeTurno && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}
        {avisoDeTurno && (
          <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            {t(avisoDeTurno)}
          </p>
        )}

        {!sala && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 text-center">
            <p className="mb-4 text-sm text-gray-600" data-testid="sin-sorteo">
              {/* Quien lo lanza no lee «el organizador todavía no…» al lado
                  de su propio botón (#710) */}
              {t(organiza ? 'draft.notStartedYouLaunch' : 'draft.notStarted')}
            </p>
            {/* `user?.id &&` por delante: sin sesión hidratada y sin ficha,
                los dos lados valían `undefined` y el botón salía para
                cualquiera, para que el servidor lo rechazara con un 403 */}
            {organiza && (
              <button
                type="button"
                data-testid="lanzar-sorteo"
                // El error ya se pinta desde el estado del hook; sin capturar
                // aquí, además subía a Sentry como promesa rechazada
                onClick={() => { abrirSala().catch(() => {}); }}
                className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700"
              >
                {t('draft.start')}
              </button>
            )}
          </div>
        )}

        {sala && (
          <div data-testid="sala-de-draft" className="space-y-4">
            {sala.status === 'IN_PROGRESS' && (
              <div
                className={`rounded-xl border p-4 ${
                  esMiTurno ? 'border-green-600 bg-green-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  {esMiTurno ? (
                    <span data-testid="mi-turno" className="font-semibold text-green-800">
                      {t('draft.yourTurn')}
                    </span>
                  ) : (
                    <span data-testid="turno-de" className="text-sm text-gray-700">
                      {t('draft.turnOf', { name: capitanDe(sala.currentTeam) })}
                    </span>
                  )}
                  <span
                    data-testid="contador"
                    className={`flex items-center gap-1 font-mono text-lg font-bold ${
                      // `null <= 10` es cierto: sin reloj no se pinta la
                      // alarma, que daría por vencido un turno del que no se
                      // sabe nada
                      segundosRestantes !== null && segundosRestantes <= 10
                        ? 'text-red-600'
                        : 'text-gray-900'
                    }`}
                  >
                    <Timer className="h-4 w-4" />
                    {mmss(segundosRestantes ?? 0)}
                  </span>
                </div>
              </div>
            )}

            {sala.status === 'COMPLETED' && (
              <div
                data-testid="draft-terminado"
                className="flex items-center gap-2 rounded-xl border border-green-600 bg-green-50 p-4 text-green-800"
              >
                <Trophy className="h-5 w-5 shrink-0" />
                <span className="font-semibold">{t('draft.finished')}</span>
              </div>
            )}

            {/* Los dos equipos, uno al lado del otro también en el móvil: es lo
                que la gente mira, y apilados obligaría a bajar para comparar */}
            <div className="grid grid-cols-2 gap-3">
              {['A', 'B'].map((equipo) => (
                <div
                  key={equipo}
                  data-testid={`equipo-${equipo}`}
                  className={`rounded-xl border bg-white p-3 ${
                    sala.currentTeam === equipo ? 'border-green-600' : 'border-gray-200'
                  }`}
                >
                  {/* `min-w-0` para que el nombre largo pueda cortarse en vez de
                      ensanchar la columna y sacar la fila de la pantalla */}
                  <h2 className="mb-2 truncate text-sm font-bold text-gray-900">
                    {nombreDe(equipo)}
                  </h2>
                  <ul className="space-y-1 text-sm">
                    {/* Los nombres se parten en líneas: a 360 px la insignia
                        les comía el sitio y se cortaban (#710) */}
                    <li className="flex min-w-0 items-start gap-1">
                      <span className="min-w-0 break-words font-semibold text-gray-900">
                        {capitanDe(equipo)}
                      </span>
                      <span className="shrink-0 rounded bg-gray-100 px-1 text-xs text-gray-600">
                        {t('draft.captain')}
                      </span>
                    </li>
                    {elegidosDe(equipo).map((pick) => (
                      <li key={pick.userId} className="flex min-w-0 items-start gap-1">
                        <span className="min-w-0 break-words text-gray-800">{pick.name}</span>
                        {pick.automatic && (
                          <Bot
                            data-testid={`automatica-${pick.userId}`}
                            className="h-3.5 w-3.5 shrink-0 text-gray-500"
                            aria-label={t('draft.pickedByTheApp')}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* El último entra solo, y solo lo lee el capitán que lo recibe: al
                resto no le cuenta nada y la etiqueta cortaba el nombre (#723) */}
            {ultimoParaMi && (
              <p data-testid="ultimo-incluido" className="text-sm text-gray-600">
                {t('draft.lastIncluded', { name: ultimoParaMi.name })}
              </p>
            )}

            {sala.availablePlayers.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <h2 className="mb-2 text-sm font-bold text-gray-900">{t('draft.available')}</h2>
                <ul className="divide-y divide-gray-100">
                  {porElegir.map((jugador) => (
                    <li
                      key={jugador.userId}
                      data-testid={`disponible-${jugador.userId}`}
                      className="flex items-center justify-between gap-2 py-2"
                    >
                      <span className="min-w-0 truncate text-sm text-gray-900">{jugador.name}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        {/* Nombre y hándicap, y nada más: es con lo que se
                            elige, y cualquier otro dato convertiría la
                            elección en un informe */}
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                          {jugador.handicap}
                        </span>
                        {esMiTurno && (
                          <button
                            type="button"
                            data-testid={`elegir-${jugador.userId}`}
                            disabled={eligiendo !== null}
                            onClick={() => alElegir(jugador.userId)}
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            {t('draft.pick')}
                          </button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DraftRoomPage;
