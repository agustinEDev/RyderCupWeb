import { useState, useEffect, useEffectEvent, useMemo, useRef } from 'react';
import {
  useLoaderData,
  useLocation,
  useNavigate,
  useRevalidator,
} from 'react-router';
import { motion } from 'framer-motion';
import {
  Users,
  Calendar,
  Clock,
  MapPin,
  Plus,
  Filter,
  Search,
  AlertCircle,
  WifiOff,
  RotateCw,
} from 'lucide-react';
import customToast from '../utils/toast';
import { useSinConexion } from '../hooks/useSinConexion';
import {
  olvidaQueSeVuelveAPedir,
  pideOtraVez,
} from '../services/cargaDeLaPantalla';
import {
  guardaLosFiltros,
  losFiltrosGuardados,
} from '../services/memoriaDeLasListas';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../components/layout/HeaderAuth';
import { getStatusColor, formatDateRange } from '../services/competitions';
import { etiquetaDeInscripcion } from '../utils/etiquetaDeInscripcion';
import { useAuth } from '../hooks/useAuth';
import { CountryFlag } from '../components/ui/CountryFlag';
import { formatCountryName } from '../services/countries';
import { ubicacionDe } from '../services/ubicacionDeCompeticion';
import { diaCorto } from '../utils/diaDeLaSesion';
import EtiquetaDelTipo from '../components/competition/EtiquetaDelTipo';
import { PANTALLA_MENOS_BARRA_INFERIOR } from '../utils/barraInferior';
import BlockLoader from '../components/ui/BlockLoader';

// Helper function to get enrollment status classes
const getEnrollmentStatusClasses = (status) => {
  switch (status) {
    case 'APPROVED':
      return 'bg-green-100 text-green-800 border border-green-200';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    case 'REJECTED':
      return 'bg-red-100 text-red-800 border border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200';
  }
};

// La de `Competitions.datos`, en su memoria y en la de sus filtros
const LISTA = 'competitions';

const Competitions = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('competitions');
  const { t: tComun } = useTranslation('common');
  const { t: tSchedule } = useTranslation('schedule');
  const { user } = useAuth();

  // «Organizas» o «Juegas» (FE #846); pendiente o rechazada, ninguno
  const papelEn = (competition) => {
    if (competition.creatorId === user?.id) return 'myCompetitions.youOrganise';
    return competition.enrollment_status === 'APPROVED'
      ? 'myCompetitions.youPlay'
      : null;
  };
  // «Lun 12 oct · 08:10», o con la sesión si aún no hay hora
  const proximaSalida = ({ date, sessionType, teeTime }) =>
    [
      diaCorto(date, i18n.language),
      teeTime ?? tSchedule(`sessions.${sessionType}`),
    ]
      .filter(Boolean)
      .join(' · ');
  const nombreDelPais = (competition, code) =>
    formatCountryName(
      (competition.countries ?? []).find((c) => c.code === code),
      i18n.language,
    ) || code;
  // Los trae el `loader` de la ruta (`Competitions.datos`) antes de pintar: es
  // lo que deja a «atrás» devolverte a donde estabas (FE #647, fase 3). Sin red
  // o con error, `datos` es lo último que se cargó en esta visita, o `null`
  const resultado = useLoaderData();
  // La lista que llegó después del tope de 4 s: se pinta sin volver a pedirla
  // (Agustín, 2 nov 2026). Vale solo para la carga de la que vino
  const [llegoTarde, setLlegoTarde] = useState(null);
  useEffect(() => {
    if (!resultado.tardia) return undefined;
    let vigente = true;
    resultado.tardia.then((lista) => {
      if (vigente) setLlegoTarde({ de: resultado, datos: lista });
    });
    return () => {
      vigente = false;
    };
  }, [resultado]);
  // Los datos de otra cuenta no se enseñan: si entra otra persona sin salir de
  // aquí, espera como en la primera carga hasta tener los suyos (CodeRabbit;
  // antes del `loader`, cambiar de cuenta también tapaba la lista con la espera)
  // (`pendiente` y `sinSesion` no traen cuenta, y se esperan igual)
  const deOtraCuenta = resultado.usuarioId !== user?.id;
  const { estado, datos } = (() => {
    if (deOtraCuenta) return { estado: 'pendiente', datos: null };
    return llegoTarde?.de === resultado
      ? { estado: 'ok', datos: llegoTarde.datos }
      : resultado;
  })();
  // Memorizada: un `[]` nuevo en cada pintada rehacía los filtros sin parar
  const competitions = useMemo(() => datos ?? [], [datos]);
  const revalidador = useRevalidator();
  const reintentando = revalidador.state !== 'idle';
  // Sin red, el aviso ya lo da la barra de toda la aplicación; el de aquí es
  // para cuando el móvil cree tener red y el servidor no contesta (dos barras)
  const elMovilSabeQueNoHayRed = useSinConexion();
  // Los filtros, por entrada del historial: al volver atrás se repone el
  // scroll, y sin ellos se caía a esa altura en otra lista, la de sin filtrar
  // (Agustín, 2 nov 2026). Entrar de nuevo es otra entrada y empieza sin
  // filtros; recargar, también, porque viven en memoria (`memoriaDeLasListas`)
  const { key: entrada } = useLocation();
  const usuarioId = user?.id;
  const [filtrosAlVolver] = useState(() =>
    usuarioId ? losFiltrosGuardados(LISTA, usuarioId, entrada) : null,
  );
  const [searchQuery, setSearchQuery] = useState(
    filtrosAlVolver?.busqueda ?? '',
  );
  const [statusFilter, setStatusFilter] = useState(
    filtrosAlVolver?.estado ?? 'ALL',
  );
  // También al cambiar de entrada sin salir: pulsar Torneos en Torneos crea
  // otra, y la pantalla sigue filtrada
  useEffect(() => {
    if (!usuarioId) return;
    const conFiltros = searchQuery || statusFilter !== 'ALL';
    guardaLosFiltros(
      LISTA,
      usuarioId,
      entrada,
      conFiltros ? { busqueda: searchQuery, estado: statusFilter } : null,
    );
  }, [searchQuery, statusFilter, entrada, usuarioId]);

  // La marca de volver a pedir se gasta al llegar una carga: hasta entonces,
  // si otra navegación corta la recarga, esa sigue pidiendo (tercer revisor).
  // Y al salir se olvida, si no se llegó a usar
  useEffect(() => olvidaQueSeVuelveAPedir(), [resultado]);
  useEffect(() => olvidaQueSeVuelveAPedir, []);

  // El aviso de siempre, uno por carga fallida: cada carga trae un resultado
  // nuevo, también al reintentar (Agustín, 2 nov 2026: como hasta ahora)
  // (de su cuenta: la de otra que entra sin salir de aquí no es suya). Los
  // textos se leen al avisar: cambiar de idioma no repite el aviso
  const avisaDelFallo = useEffectEvent((deLaCarga) => {
    if (deOtraCuenta) return;
    if (deLaCarga.estado === 'sinRed')
      customToast.error(tComun('sinConexion.mensaje'));
    if (deLaCarga.estado === 'error')
      customToast.error(t('detail.failedToLoadCompetitions'));
  });
  useEffect(() => {
    avisaDelFallo(resultado);
  }, [resultado]);

  // Sin datos todavía: la primera carga de la aplicación (`pendiente`) o una
  // sesión que aún no se sabía (`sinSesion`; si no la hay, el guardia ya lleva
  // a entrar). Esperar aquí, con la carcasa puesta, es como cargaba siempre
  const faltanLosDatos = estado === 'pendiente' || estado === 'sinSesion';
  // Se pide en cuanto se sabe quién es, y otra vez cada vez que la sesión se
  // confirma o cambia (otro `user`), como antes del `loader`, que dependía de
  // él (`/code-review`). También con una carga en camino: gana la última
  // (tercer revisor). Si los datos vuelven a faltar más tarde (la sesión
  // superó el tope), una vez más, pero no en cada carga que siga sin ellos
  const pedidaCon = useRef(faltanLosDatos ? null : user);
  const faltabanYa = useRef(faltanLosDatos);
  useEffect(() => {
    const vuelvenAFaltar = faltanLosDatos && !faltabanYa.current;
    faltabanYa.current = faltanLosDatos;
    if (!user?.id || (pedidaCon.current === user && !vuelvenAFaltar)) return;
    pedidaCon.current = user;
    pideOtraVez(revalidador);
  }, [user, faltanLosDatos, revalidador]);

  // Al volver la señal, se vuelve a pedir sola (decidido el 2 nov 2026)
  useEffect(() => {
    if (estado !== 'sinRed') return undefined;
    const alVolver = () => pideOtraVez(revalidador);
    globalThis.addEventListener('online', alVolver);
    return () => globalThis.removeEventListener('online', alVolver);
  }, [estado, revalidador]);

  // En el mismo pintado que la lista, y no en un efecto: un efecto la dejaba un
  // pintado vacía, justo cuando el router restaura el scroll al volver atrás,
  // y el navegador recortaba la posición sobre una página corta (revisor)
  const filteredCompetitions = useMemo(() => {
    let filtered = competitions;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (comp) =>
          comp.name?.toLowerCase().includes(query) ||
          // Se busca sobre lo que se ve: la tarjeta enseña los países en el
          // idioma de la aplicación, así que buscar «España» tenía que
          // encontrar una competición cuya `location` del backend dice «Spain»
          ubicacionDe(comp, i18n.language).toLowerCase().includes(query) ||
          // Y por sus campos, todos: la tarjeta enseña el nombre de uno, y
          // con varios, su conjunto (revisión de la FE-B)
          (comp.golfCourses ?? []).some((campo) =>
            campo.name?.toLowerCase().includes(query),
          ),
      );
    }

    // Apply status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((comp) => comp.status === statusFilter);
    }

    return filtered;
  }, [competitions, searchQuery, statusFilter, i18n.language]);

  const handleCreateCompetition = () => {
    navigate('/competitions/create');
  };

  const handleViewCompetition = (competitionId) => {
    navigate(`/competitions/${competitionId}`, {
      state: { from: 'my-competitions' },
    });
  };

  // Renderiza el contenido de la lista de competiciones
  const renderCompetitionsList = () => {
    const reintentar = (
      <button
        type="button"
        onClick={() => pideOtraVez(revalidador)}
        disabled={reintentando}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
      >
        <RotateCw className="w-4 h-4" aria-hidden="true" />
        {t('myCompetitions.reintentar')}
      </button>
    );
    if (faltanLosDatos) {
      return <BlockLoader texto={t('myCompetitions.loadingCompetitions')} />;
    }
    // Un error del servidor —429, 5xx— tampoco es «no tienes ninguna»: no se
    // ha podido preguntar. Antes se vaciaba la lista y lo decía (FE #647, T6)
    if (estado === 'error' && datos === null) {
      return (
        <div
          data-testid="competiciones-sin-cargar"
          className="flex flex-col items-center justify-center py-12 bg-gray-50 border border-gray-200 rounded-xl"
        >
          <AlertCircle
            className="w-16 h-16 text-gray-400 mb-4"
            aria-hidden="true"
          />
          <p className="text-gray-900 font-semibold text-lg mb-2">
            {t('myCompetitions.noSePudoCargar')}
          </p>
          <p className="text-gray-500 text-sm mb-6 max-w-md text-center">
            {t('myCompetitions.noSePudoCargarDetalle')}
          </p>
          {reintentar}
        </div>
      );
    }
    // Vacio porque no se ha podido preguntar NO es vacio: decir «no tienes
    // ninguna» —y ofrecer crear la primera— es afirmar algo que nadie ha
    // comprobado, y quien tenga las suyas las ve desaparecer
    // Por la lista entera, no por lo filtrado: sin cobertura la lista se
    // conserva, así que un filtro que no casa con nada no es falta de red —se
    // consultó, y no había coincidencias— y merece su propio mensaje
    if (estado === 'sinRed' && datos === null) {
      return (
        <div
          data-testid="competiciones-sin-cobertura"
          className="flex flex-col items-center justify-center py-12 bg-gray-50 border border-gray-200 rounded-xl"
        >
          <WifiOff
            className="w-16 h-16 text-gray-400 mb-4"
            aria-hidden="true"
          />
          <p className="text-gray-900 font-semibold text-lg mb-2">
            {tComun('sinConexion.aviso')}
          </p>
          <p className="text-gray-500 text-sm max-w-md text-center">
            {t('myCompetitions.sinCoberturaDetalle')}
          </p>
        </div>
      );
    }
    if (filteredCompetitions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 bg-gray-50 border border-gray-200 rounded-xl">
          <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
          <p className="text-gray-900 font-semibold text-lg mb-2">
            {searchQuery || statusFilter !== 'ALL'
              ? t('myCompetitions.noCompetitionsFound')
              : t('myCompetitions.noCompetitionsYet')}
          </p>
          <p className="text-gray-500 text-sm mb-6 max-w-md text-center">
            {searchQuery || statusFilter !== 'ALL'
              ? t('myCompetitions.tryAdjustingFilters')
              : t('myCompetitions.createFirstCompetition')}
          </p>
          {!searchQuery && statusFilter === 'ALL' && (
            <motion.button
              onClick={handleCreateCompetition}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-md"
            >
              <Plus className="w-5 h-5" />
              <span>{t('myCompetitions.createYourFirstCompetition')}</span>
            </motion.button>
          )}
        </div>
      );
    }
    // Renderizado normal de la lista de competiciones: con lo último que se
    // cargó, si ahora no se ha podido, y diciéndolo
    return (
      <>
        {estado === 'error' && (
          <div
            data-testid="aviso-lista-sin-actualizar"
            className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900"
          >
            <span>{t('myCompetitions.noSePudoActualizar')}</span>
            {reintentar}
          </div>
        )}
        {estado === 'sinRed' && !elMovilSabeQueNoHayRed && (
          <div
            data-testid="aviso-lista-sin-respuesta"
            className="flex items-center gap-2 mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700"
          >
            <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{tComun('sinConexion.aviso')}</span>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCompetitions.map((competition) => {
            // Una vez por tarjeta (`/code-review`)
            const papel = papelEn(competition);
            return (
              <div
                key={competition.id}
                onClick={() => handleViewCompetition(competition.id)}
                data-testid="tarjeta-competicion"
                className="min-w-0 bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer group"
              >
                {/* Header. El título se guarda 10rem: si no cabe con el estado, el
                estado baja de línea, que a 800 px la tarjeta mide ~215 px y lo
                partía a mitad de palabra (QA, 26 oct) */}
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-[1_1_10rem]">
                    <h3 className="text-gray-900 font-bold text-lg mb-1 group-hover:text-primary transition-colors break-words">
                      {competition.name}
                    </h3>
                    {/* Qué torneo es y qué hago en él, en vez de la corona (FE #846).
                    Quien organiza y juega, «Organizas»: es lo que le distingue */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <EtiquetaDelTipo tipo={competition.tournamentType} />
                      {papel && (
                        <span
                          data-testid="mi-papel"
                          className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700"
                        >
                          {t(papel)}
                        </span>
                      )}
                    </div>
                    {/* Show pending enrollment requests if user is creator */}
                    {competition.creatorId === user?.id &&
                      competition.pending_enrollments_count > 0 && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
                            <span className="w-2 h-2 bg-orange-500 rounded-full mr-1.5 animate-pulse"></span>
                            {competition.pending_enrollments_count}{' '}
                            {competition.pending_enrollments_count === 1
                              ? t('myCompetitions.pendingRequest')
                              : t('myCompetitions.pendingRequests')}
                          </span>
                        </div>
                      )}
                    {/* La inscripción que aún no es «Juegas»: pendiente o rechazada */}
                    {competition.creatorId !== user?.id &&
                      competition.enrollment_status &&
                      competition.enrollment_status !== 'APPROVED' && (
                        <div className="mt-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getEnrollmentStatusClasses(competition.enrollment_status)}`}
                          >
                            {competition.enrollment_status === 'PENDING' &&
                              '⏳ '}
                            {competition.enrollment_status === 'REJECTED' &&
                              '✗ '}
                            {t('myCompetitions.enrollmentStatus', {
                              status: etiquetaDeInscripcion(
                                t,
                                competition.enrollment_status,
                                user?.gender,
                              ),
                            })}
                          </span>
                        </div>
                      )}
                  </div>
                  <span
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                      competition.status,
                    )}`}
                  >
                    {competition.status && t(`status.${competition.status}`)}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2">
                  {/* Dates, y mi próxima salida si juego (FE #846) */}
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>
                      {formatDateRange(
                        competition.startDate,
                        competition.endDate,
                        i18n.language,
                      )}
                    </span>
                  </div>
                  {competition.myNextSession && (
                    <div
                      data-testid="proxima-salida"
                      className="flex items-center gap-2 text-sm font-medium text-gray-800"
                    >
                      <Clock className="w-4 h-4 shrink-0 text-primary" />
                      <span>
                        {t('myCompetitions.nextSession', {
                          cuando: proximaSalida(competition.myNextSession),
                        })}
                      </span>
                    </div>
                  )}

                  {/* Dónde: el campo con su bandera, o «Varios campos»; sin campos
                  todavía, el país como antes. El país no se repite (FE #846).
                  La ubicación se rehace aquí y no se usa la del backend: allí
                  se arma uniendo `name_en` (FE #513) */}
                  <div
                    data-testid="donde"
                    className="flex min-w-0 items-center gap-2 text-gray-600 text-sm"
                  >
                    <MapPin className="w-4 h-4 shrink-0" />
                    {competition.golfCourses?.length > 0 ? (
                      <>
                        <span className="flex shrink-0 items-center gap-1">
                          {[
                            ...new Set(
                              competition.golfCourses.map((c) => c.countryCode),
                            ),
                          ].map((code) => (
                            <span key={code} data-testid="bandera">
                              <CountryFlag
                                countryCode={code}
                                style={{ width: '20px', height: 'auto' }}
                                title={nombreDelPais(competition, code)}
                              />
                            </span>
                          ))}
                        </span>
                        <span className="min-w-0 truncate">
                          {competition.golfCourses.length === 1
                            ? competition.golfCourses[0].name
                            : t('myCompetitions.severalCourses')}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="flex shrink-0 items-center gap-1">
                          {(competition.countries ?? [])
                            .slice(0, 3)
                            .map((country, index) => (
                              <span
                                key={country.code || index}
                                data-testid="bandera"
                              >
                                <CountryFlag
                                  countryCode={country.code}
                                  style={{ width: '20px', height: 'auto' }}
                                  title={
                                    formatCountryName(country, i18n.language) ||
                                    country.code
                                  }
                                />
                              </span>
                            ))}
                        </span>
                        <span className="min-w-0 truncate">
                          {ubicacionDe(competition, i18n.language)}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Jugadores y, en stroke play, cuántas jornadas: en una Ryder llega null (FE #846) */}
                  <div
                    data-testid="jugadores"
                    className="flex items-center gap-2 text-gray-600 text-sm"
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    <span>
                      {t('myCompetitions.players', {
                        count: competition.enrolledCount || 0,
                        max: competition.maxPlayers,
                      })}
                      {/* Sin jornadas todavía no se dice «0 jornadas» (Agustín, 13 oct) */}
                      {competition.playingDays > 0 && (
                        <>
                          {' '}
                          ·{' '}
                          {t('myCompetitions.playingDays', {
                            count: competition.playingDays,
                          })}
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  if (!user) {
    return null;
  }

  return (
    <div
      className={`relative flex h-auto ${PANTALLA_MENOS_BARRA_INFERIOR} w-full flex-col bg-white`}
    >
      <div className="layout-container flex h-full grow flex-col">
        <HeaderAuth user={user} />
        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-3 p-4">
              <div>
                <p className="text-gray-900 tracking-tight text-3xl md:text-[32px] font-bold leading-tight">
                  {t('myCompetitions.title')}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  {t('myCompetitions.subtitle')}
                </p>
              </div>
              <motion.button
                onClick={handleCreateCompetition}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>{t('myCompetitions.createCompetition')}</span>
              </motion.button>
            </div>
            {/* Filters */}
            <div className="p-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Search */}
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder={t('myCompetitions.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      />
                    </div>
                  </div>
                  {/* Status Filter */}
                  <div className="md:w-48">
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none bg-white cursor-pointer"
                      >
                        <option value="ALL">
                          {t('myCompetitions.allStatuses')}
                        </option>
                        <option value="DRAFT">
                          {t('myCompetitions.draft')}
                        </option>
                        <option value="ACTIVE">
                          {t('myCompetitions.active')}
                        </option>
                        <option value="CLOSED">
                          {t('myCompetitions.closed')}
                        </option>
                        <option value="IN_PROGRESS">
                          {t('myCompetitions.inProgress')}
                        </option>
                        <option value="COMPLETED">
                          {t('myCompetitions.completed')}
                        </option>
                        <option value="CANCELLED">
                          {t('myCompetitions.cancelled')}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>
                {/* Results Count */}
                {/* Sin lista que enseñar no hay «0 de 0»: no se ha podido preguntar */}
                {datos !== null && (
                  <div className="mt-3 text-sm text-gray-500">
                    {t('myCompetitions.showing', {
                      filtered: filteredCompetitions.length,
                      total: competitions.length,
                    })}
                  </div>
                )}
              </div>
            </div>
            {/* Competitions List */}
            <div className="p-4">{renderCompetitionsList()}</div>
            {/* Footer */}
            <footer className="flex flex-col gap-6 px-5 py-10 text-center">
              <p className="text-gray-500 text-base font-normal leading-normal">
                {t('footer', { year: new Date().getFullYear() })}
              </p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};

// Una por cuenta: si entra otra sin salir de aquí, la pantalla empieza de cero,
// sin lo que buscó la anterior ni su estado (revisor, 3 nov 2026)
const CompetitionsDeLaCuenta = () => {
  const { user } = useAuth();
  return <Competitions key={user?.id ?? ''} />;
};

export default CompetitionsDeLaCuenta;
