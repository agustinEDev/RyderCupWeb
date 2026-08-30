import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, AlertCircle, Navigation } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { esFalloDeRed, mensajeDeError } from '../../utils/sinCobertura';
import { listGolfCoursesUseCase } from '../../composition';
import { roundCoordinate } from '../../utils/geo';
import { getCountryFlag } from '../../utils/countryUtils';
import BlockLoader from '../ui/BlockLoader';

/**
 * GolfCourseSearchBox Component
 *
 * Autocomplete search box for selecting golf courses filtered by country.
 * Shows only APPROVED golf courses.
 *
 * Props:
 * - countryCode: string - Country code to filter courses (required)
 * - selectedCourse: object | null - Currently selected golf course
 * - onCourseSelect: function - Callback when a course is selected
 * - onRequestNewCourse: function - Callback when "Request new course" is clicked
 * - allowNearby: boolean - Offer the "courses near me" button. Off by default
 * - allowOtherCountries: boolean - Widen the search beyond `countryCode` when it
 *   yields nothing. Off by default: for the competition builders `countryCode` is
 *   not "the user's country" but a constraint of the form, and a course from
 *   elsewhere gets filed under the wrong country and silently dropped
 */
// Cuántos campos se piden por vuelta. Es una lista para elegir en el móvil, no
// un catálogo: más de esto no cabe en pantalla y solo alarga la respuesta.
const PAGE_SIZE = 20;

// Lo que se espera desde la última tecla antes de preguntar al servidor.
// Escribir "Real Club" son nueve pulsaciones; sin esto, nueve peticiones.
const SEARCH_DEBOUNCE_MS = 300;

// Una posición de hace cinco minutos sirve igual para elegir campo, y evita
// encender el GPS otra vez. No se pide precisión alta: separar dos campos no
// necesita metros, y el modo preciso tarda más y gasta batería.
const GEOLOCATION_OPTIONS = { timeout: 10000, maximumAge: 5 * 60 * 1000 };

// Los tres fallos de `GeolocationPositionError` piden remedios distintos: el
// permiso se concede en los ajustes, la falta de posición no tiene arreglo
// desde aquí y el tiempo agotado se reintenta. Un solo mensaje para los tres
// deja al usuario sin saber cuál de las tres cosas le ha pasado (FE #387).
const GEOLOCATION_ERROR_STATUS = {
  1: 'denied', // PERMISSION_DENIED
  2: 'unavailable', // POSITION_UNAVAILABLE
  3: 'timeout', // TIMEOUT
};

// Ante un error sin código reconocible, "no hay posición" es lo único que se
// puede afirmar: mandar a los ajustes a quien no ha denegado nada es peor.
const geoStatusFromError = (error) => GEOLOCATION_ERROR_STATUS[error?.code] ?? 'unavailable';

// El permiso denegado es el único de los tres con arreglo, y hay que decir
// dónde: en iOS la ubicación de Safari se concede en los ajustes del sistema,
// no en la página, así que sin mencionarlos no hay forma de que nadie lo
// encuentre. Buscar por nombre sigue disponible en los tres casos.
const GEO_ERROR_MESSAGES = {
  denied: {
    key: 'searchBox.locationDenied',
    fallback:
      'Location permission is off. Turn it on in your browser settings - on iPhone, also in the system settings - or search by name.',
  },
  // No dice "este dispositivo no tiene ubicación" porque no consta: iOS
  // devuelve este mismo código 2 cuando la ubicación está apagada a nivel de
  // sistema, que es el caso del iPhone del 14 de agosto. Apunta a los ajustes
  // del dispositivo, que cubre ambas cosas sin afirmar ninguna.
  unavailable: {
    key: 'searchBox.locationUnavailable',
    fallback:
      'Could not get your location. Check that it is on in your device settings, or search by name.',
  },
  timeout: {
    key: 'searchBox.locationTimeout',
    fallback: 'Locating you took too long. Try again or search by name.',
  },
};

const GolfCourseSearchBox = ({
  countryCode,
  selectedCourse,
  onCourseSelect,
  onRequestNewCourse,
  allowNearby = false,
  allowOtherCountries = false
}) => {
  const { t, i18n } = useTranslation('golfCourses');
  const { t: tComun } = useTranslation('common');
  const [searchQuery, setSearchQuery] = useState('');
  // null mientras no se haya concedido el permiso. Se pide solo al pulsar el
  // botón: hacerlo al abrir dispara el diálogo del navegador a quien únicamente
  // quería teclear un nombre.
  const [position, setPosition] = useState(null);
  // 'idle' | 'requesting' | 'denied' | 'unavailable' | 'timeout'
  const [geoStatus, setGeoStatus] = useState('idle');
  // Los resultados guardan de qué país son. Así, al cambiar de país, no se
  // pintan un instante los del anterior mientras llega la respuesta nueva, y
  // no hace falta vaciarlos desde el cuerpo del efecto.
  const [result, setResult] = useState({ countryCode: null, courses: [], total: 0, widened: false });
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);

  // Escribir manda sobre la cercanía: en cuanto hay texto se busca por nombre.
  // Tiene que ser así porque 11 de los 802 campos importados no tienen
  // coordenadas y son invisibles a una búsqueda por cercanía; el nombre es el
  // único camino que los alcanza, y no puede quedar de segunda clase.
  const isNearbyActive = position !== null && searchQuery.trim() === '';
  // Se derivan primitivos en vez de pasar el objeto al efecto: `position` cambia
  // de identidad en cada lectura del GPS y dispararía búsquedas de más.
  const nearbyLat = isNearbyActive ? position.lat : null;
  const nearbyLon = isNearbyActive ? position.lon : null;
  // Se busca por cercanía cuando hay posición y no se ha escrito nada
  const searchingNearby = nearbyLat !== null && nearbyLon !== null;

  // Ask the backend on every change of country or search term.
  //
  // Antes se descargaban todos los campos aprobados del país y se filtraba en
  // el navegador. Con los 802 campos federados eso son ~1,6 MB en cada visita,
  // y el filtrado ocurre en el móvil del usuario en vez de en la base de datos.
  useEffect(() => {
    if (!countryCode) return;

    // La petición en vuelo se descarta si llega otra: escribiendo deprisa, las
    // respuestas pueden volver desordenadas y pintar los resultados de una
    // búsqueda anterior sobre los de la actual
    let cancelled = false;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      const buscar = (pais) =>
        listGolfCoursesUseCase.execute({
          countryCode: pais,
          approvalStatus: 'APPROVED',
          name: searchQuery.trim() || undefined,
          limit: PAGE_SIZE,
          // Sin radio a propósito: el backend ordena en vez de cortar porque un
          // radio fijo es inservible en media España. Medido sobre los campos
          // importados, a 50 km hay 69 en Madrid pero 3 en Soria; más vale ver
          // "a 78 km" que una lista vacía.
          lat: nearbyLat ?? undefined,
          lon: nearbyLon ?? undefined,
        });

      try {
        // Estando sobre el campo, la nacionalidad del jugador no dice nada del
        // campo que pisa: Ponte de Lima está a 30 km de la frontera, y filtrar
        // por país dejaba "el más cercano" buscando solo en el país de uno
        const page = await buscar(searchingNearby ? undefined : countryCode);
        if (cancelled) return;

        // Un campo de fuera existía y la búsqueda por nombre lo escondía, así
        // que "no hay campos" era mentira. Se reintenta sin país antes de
        // decirlo, y se avisa de que lo que se ve ya no es del país propio
        let { courses, total } = page;
        let widened = false;
        // No se amplía tras elegir un campo: la casilla pasa a mostrar su
        // nombre, y el de uno extranjero no casa en tu país, así que elegirlo
        // costaba dos peticiones más sin que nadie estuviera buscando
        const puedeAmpliar =
          allowOtherCountries && countryCode && !searchingNearby && !selectedCourse;
        if (courses.length === 0 && puedeAmpliar && searchQuery.trim()) {
          const worldwide = await buscar(undefined);
          if (cancelled) return;
          if (worldwide.courses.length > 0) {
            ({ courses, total } = worldwide);
            widened = true;
          }
        }

        setResult({ countryCode, courses, total, widened });
      } catch (err) {
        if (cancelled) return;
        console.error('Error loading golf courses:', err);
        // El `message` va a la consola y NO a la pantalla: sin cobertura, en la
        // aplicación instalada, ahí venía el aviso crudo del service worker
        // —«FetchEvent.respondWith received an error»— con la URL de la API
        // dentro, en rojo y en inglés, dentro del formulario
        setError(
          mensajeDeError(err, {
            sinConexion: tComun('sinConexion.mensaje'),
            generico: t('searchBox.errorLoading', 'Error loading golf courses'),
          })
        );
        // Sin red NO se vacían los resultados: hacerlo pintaba «no se han
        // encontrado campos» y ofrecía dar de alta uno nuevo —que también
        // necesita red— sobre una pregunta que nunca tuvo respuesta. Y se
        // llevaba por delante lo que ya estaba en pantalla
        if (!esFalloDeRed(err)) setResult({ countryCode, courses: [], total: 0, widened: false });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [countryCode, searchQuery, t, tComun, nearbyLat, nearbyLon, searchingNearby, allowOtherCountries, selectedCourse]);

  // Solo valen los resultados del país que se está mirando ahora
  const courses = result.countryCode === countryCode ? result.courses : [];
  const total = result.countryCode === countryCode ? result.total : 0;
  const widened = result.countryCode === countryCode && result.widened;
  // El código del usuario llega tal cual lo guardó el backend y hay cuentas con
  // 'es' en minúsculas (`countryUtils.test.js`). Sin normalizar, los 802 campos
  // españoles saldrían marcados como extranjeros
  const normalizeCountry = (code) => (code || '').trim().toUpperCase();
  const ownCountry = normalizeCountry(countryCode);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    // Con un campo ya elegido, la casilla muestra su nombre y no lo que se
    // teclea, así que parecía congelada: se podía borrar y el texto seguía
    // entero, sin forma de cambiar de campo. Teclear sobre una selección es
    // querer buscar otro, de modo que se suelta antes de nada.
    //
    // Solo se avisa al padre si de verdad había selección: quien usa el
    // buscador como "añadir" pasa siempre `selectedCourse={null}` y su callback
    // no espera recibir un null.
    if (selectedCourse) onCourseSelect(null);
    setSearchQuery(e.target.value);
    setShowDropdown(true);
  };

  const handleCourseSelect = (course) => {
    onCourseSelect(course);
    setSearchQuery(course.name);
    setShowDropdown(false);
  };

  const handleInputFocus = () => {
    setShowDropdown(true);
  };

  const handleRequestNewCourse = () => {
    setShowDropdown(false);
    onRequestNewCourse();
  };

  const handleNearbyClick = () => {
    // Un navegador sin geolocalización, o una página servida sin HTTPS, no
    // expone el objeto. No es un error del usuario: se dice y se sigue por
    // nombre, que funciona igual.
    if (!navigator.geolocation) {
      setGeoStatus('unavailable');
      return;
    }

    // Buscar por cercanía teniendo texto escrito no querría decir nada: se
    // limpia para que mande la posición. Y si había un campo elegido se suelta,
    // porque pulsar aquí es querer cambiarlo.
    setSearchQuery('');
    if (selectedCourse) onCourseSelect(null);
    // La posicion anterior se suelta ANTES de pedir la nueva. Si se conserva,
    // la peticion sale con las coordenadas viejas mientras llega la lectura, y
    // si esa lectura falla `isNearbyActive` sigue siendo cierto: se verian
    // distancias de donde el usuario ya no esta, sin mensaje ni reintento.
    setPosition(null);
    setGeoStatus('requesting');
    setShowDropdown(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Se redondea antes de tocar el estado, no al construir la petición:
        // así la precisión de la casa no llega a existir dentro de la app.
        const lat = roundCoordinate(pos.coords.latitude);
        const lon = roundCoordinate(pos.coords.longitude);

        // Una lectura que no es un número (extensiones que falsean la posición,
        // WebViews con errores) daría un `position` no nulo con las coordenadas
        // a null: la interfaz anunciaría orden por distancia y el repositorio
        // se dejaría los parámetros fuera, sin distancias y sin botón para
        // reintentar. Es un fallo de posición como cualquier otro.
        if (lat === null || lon === null) {
          setGeoStatus('unavailable');
          return;
        }

        setPosition({ lat, lon });
        setGeoStatus('idle');
      },
      // Denegado, sin posición o agotado el tiempo piden cosas distintas a
      // quien busca, así que no pueden acabar los tres en el mismo mensaje.
      (error) => setGeoStatus(geoStatusFromError(error)),
      GEOLOCATION_OPTIONS
    );
  };

  // Un campo a 800 m y otro a 78 km no se leen igual con el mismo formato: por
  // debajo de 10 km el decimal informa, por encima solo estorba.
  const formatDistance = (distanceKm) =>
    new Intl.NumberFormat(i18n.language, {
      maximumFractionDigits: distanceKm < 10 ? 1 : 0,
    }).format(distanceKm);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={selectedCourse ? selectedCourse.name : searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={
            !countryCode
              ? t('searchBox.selectCountryFirst', 'Select a country first...')
              : t('searchBox.searchPlaceholder', 'Search golf course...')
          }
          disabled={!countryCode}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
        />
        {/* Se aparta solo cuando el desplegable esta contando YA que busca: con
            los dos a la vez se veian dos dibujos de espera distintos, que es el
            sintoma que FE #495 vino a quitar. Mirar solo si el desplegable esta
            abierto no vale: al afinar una busqueda con resultados en pantalla,
            el desplegable enseña la lista vieja —no la espera— y entonces este
            es el unico aviso de que algo esta pasando. */}
        {isLoading && !(showDropdown && countryCode && courses.length === 0) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Dropdown */}
      {showDropdown && countryCode && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {/* Vive dentro del desplegable, no en el formulario: así no ocupa
              sitio en un paso que ya es largo, y el permiso solo se pide a quien
              ha abierto la lista para elegir campo */}
          {allowNearby && (
            <div className="border-b border-gray-200 p-2">
              {isNearbyActive ? (
                <p className="px-2 py-1 text-xs text-gray-500">
                  {t('searchBox.sortedByDistance', {
                    defaultValue:
                      'Nearest first. Courses without a location only show up by name.',
                  })}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleNearbyClick}
                  disabled={geoStatus === 'requesting'}
                  data-testid="golf-course-nearby-button"
                  className="w-full flex items-center gap-2 px-2 py-2 text-left text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  <Navigation className="w-4 h-4 flex-shrink-0" />
                  {geoStatus === 'requesting'
                    ? t('searchBox.locating', { defaultValue: 'Getting your location...' })
                    : t('searchBox.nearbyCourses', { defaultValue: 'Courses near me' })}
                </button>
              )}

              {/* Denegar el permiso no rompe nada: se dice y el buscador por
                  nombre sigue exactamente igual de disponible */}
              {/* Aparece como respuesta a pulsar el botón, así que hay que
                  anunciarlo: quien usa lector de pantalla no ve que el texto
                  ha cambiado bajo el botón que acaba de activar */}
              {GEO_ERROR_MESSAGES[geoStatus] && (
                <p role="status" className="px-2 pt-1 text-xs text-gray-500">
                  {t(GEO_ERROR_MESSAGES[geoStatus].key, {
                    defaultValue: GEO_ERROR_MESSAGES[geoStatus].fallback,
                  })}
                </p>
              )}
            </div>
          )}

          {/* Sin este aviso, ver campos de otro país en un buscador que
              siempre ha enseñado los tuyos parece un fallo. Se anuncia porque
              aparece solo, sin que nadie haya pulsado nada */}
          {/* La región vive siempre y solo cambia su texto: montada ya con el
              contenido dentro, un lector de pantalla no la anuncia, y este aviso
              aparece sin que nadie haya pulsado nada */}
          <p
            role="status"
            data-testid="golf-course-widened-notice"
            className={
              widened && courses.length > 0
                ? 'border-b border-gray-200 px-4 py-2 text-xs text-gray-500'
                : 'sr-only'
            }
          >
            {widened && courses.length > 0
              ? t('searchBox.widenedToOtherCountries', {
                  defaultValue: 'No courses in your country match. Showing courses abroad.',
                })
              : ''}
          </p>

          {courses.length > 0 ? (
            <ul className="py-1">
              {courses.map((course) => (
                <li key={course.id}>
                  <button
                    type="button"
                    onClick={() => handleCourseSelect(course)}
                    className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-start gap-3"
                  >
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {course.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {/* Solo en los de fuera: repetir "ES" en los 802 campos
                            españoles es ruido, y aquí el país es justo lo que
                            distingue dos campos que se llaman igual a un lado y
                            otro de la frontera */}
                        {normalizeCountry(course.countryCode) &&
                          normalizeCountry(course.countryCode) !== ownCountry && (
                            <span data-testid={`golf-course-country-${course.id}`}>
                              <span aria-hidden="true">
                                {getCountryFlag(normalizeCountry(course.countryCode))}{' '}
                              </span>
                              {normalizeCountry(course.countryCode)} •{' '}
                            </span>
                          )}
                        {t(`courseTypes.${course.courseType}`, course.courseType)} • {course.tees.length} {t('searchBox.tees', 'tees')}
                        {/* Comparado con null y no por verdadero: un campo a
                            menos de 50 m devuelve 0, que es una distancia real */}
                        {course.distanceKm != null && (
                          <> • {t('searchBox.distanceAway', {
                            defaultValue: '{{distance}} km away',
                            distance: formatDistance(course.distanceKm),
                          })}</>
                        )}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : isLoading ? (
            // Mientras la primera búsqueda está en vuelo no se puede decir que
            // no hay campos: aún no se sabe
            <div className="py-8 px-4 text-center">
              <BlockLoader sinRelleno texto={t('searchBox.searching', 'Searching...')} />
            </div>
          ) : (
            <div className="py-8 px-4 text-center">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-2">
                {t('searchBox.noCoursesFound', 'No golf courses found')}
              </p>
              <p className="text-xs text-gray-500 mb-4">
                {searchQuery
                  ? t('searchBox.tryDifferentSearch', 'Try a different search term or request a new course')
                  : t('searchBox.noCoursesInCountry', 'No approved courses in this country yet')}
              </p>
              <button
                type="button"
                onClick={handleRequestNewCourse}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                <MapPin className="w-4 h-4" />
                {t('searchBox.requestNewCourse', 'Request new golf course')}
              </button>
            </div>
          )}

          {/* Request new course button (always visible when there are results) */}
          {courses.length > 0 && (
            <div className="border-t border-gray-200 p-2">
              {/* Solo llegan los primeros PAGE_SIZE. Sin decirlo, un campo que
                  existe pero se ha quedado fuera parece que no existe */}
              {total > courses.length && (
                <p className="px-4 py-1.5 text-xs text-gray-500">
                  {t('searchBox.showingSome', {
                    defaultValue: 'Showing {{shown}} of {{total}}. Keep typing to narrow it down.',
                    shown: courses.length,
                    total,
                  })}
                </p>
              )}
              <button
                type="button"
                onClick={handleRequestNewCourse}
                className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors font-medium"
              >
                + {t('searchBox.requestNewCourse', 'Request new golf course')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GolfCourseSearchBox;
