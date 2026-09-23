import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Trophy, Settings, Plus, X, ChevronDown, Flag, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { nombresPorDefectoDeLosEquipos } from './nombresPorDefectoDeLosEquipos';
import HeaderAuth from '../components/layout/HeaderAuth';
import { useAuth } from '../hooks/useAuth';
import {
  createCompetitionWithGolfCoursesUseCase,
  updateCompetitionUseCase,
  getCompetitionDetailUseCase,
  getCompetitionGolfCoursesUseCase,
  fetchCountriesUseCase,
  getAdjacentCountriesUseCase,
  createGolfCourseRequestUseCase
} from '../composition';
import { CountryFlag } from '../utils/countryUtils';
import { formatCountryName, sortCountriesByName } from '../services/countries';
import { validateCompetitionForm } from '../utils/competitionFormValidation';
import CountryAutocomplete from '../components/ui/CountryAutocomplete';
import GolfCourseSearchBox from '../components/golf_course/GolfCourseSearchBox';
import GolfCourseRequestModal from '../components/golf_course/GolfCourseRequestModal';
import EnrollmentOpeningModal from '../components/competition/EnrollmentOpeningModal';
import customToast from '../utils/toast';
import FullScreenLoader from '../components/ui/FullScreenLoader';
import CompetitionTypeChooser from '../components/competition/CompetitionTypeChooser';
import SetupModeChooser from '../components/competition/SetupModeChooser';
import { cupoDeJugadores, CUPO_POR_DEFECTO } from '../utils/cupoDeJugadores';


// Helper function to get message className
const getMessageClassName = (type) => {
  if (type === 'success') return 'bg-green-50 text-green-800 border border-green-200';
  if (type === 'error') return 'bg-red-50 text-red-800 border border-red-200';
  return 'bg-yellow-50 text-yellow-800 border border-yellow-200';
};

// Los avisos que apuntan a un campo de «Más opciones»: si salta uno de estos,
// el plegable tiene que abrirse o el organizador no ve lo que le piden. El cupo
// y el modo de juego ya no están aquí dentro: subieron al formulario
// Para preguntar «¿vale lo que está plegado?» hay que dar por buenos los campos
// de fuera: si no, el primer error de ellos taparía siempre al del plegable
const FORMULARIO_MINIMO = {
  competitionName: 'x',
  startDate: '2026-01-01',
  endDate: '2026-01-02',
  country: { code: 'ES' },
  adjacentCountry1: '',
  adjacentCountry2: '',
  golfCourses: [{ countryCode: 'ES' }],
  numberOfPlayers: null,
};

const ERRORES_DE_LAS_OPCIONES = new Set([
  'teamNamesRequired',
  'teamNamesTooShort',
  'teamNamesTooLong',
  'handicapLimitRange',
]);

const CreateCompetition = () => {
  const navigate = useNavigate();
  const { id: competitionId } = useParams();
  const { t, i18n } = useTranslation('competitions');
  const { user, loading: isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preguntandoApertura, setPreguntandoApertura] = useState(false);
  const [loadingCompetition, setLoadingCompetition] = useState(false);
  // Editar o crear lo dice la URL, y se sabe desde el primer render. Vivía en un
  // estado que se encendía DENTRO del efecto que carga la competición, y ese
  // efecto sale antes si los países aún no han llegado: sin cobertura la
  // pantalla de edición se quedaba con el modo de crear —enseñando el selector
  // de tipo— y al enviar creaba una competición nueva en vez de editar la que
  // se había abierto (`/code-review`)
  const isEditMode = Boolean(competitionId);
  // El tipo se elige ANTES de rellenar nada (FE #639). Editando no se pregunta:
  // esa competición ya existe y su tipo no se cambia aquí
  const [tipoElegido, setTipoElegido] = useState(null);

  // Lo que la API rellena sola no es una decisión que haya que tomar para poder
  // crear nada: equipos, cupo, asignación y límite viven plegados, con lo que se
  // acepta escrito debajo del botón (FE #637)
  const [masOpciones, setMasOpciones] = useState(false);

  // Y al elegir, el formulario empieza por arriba. En el móvil los tres tipos
  // ocupan la pantalla y al tercero se llega con scroll: sin esto, el formulario
  // aparecía por donde se hubiera quedado y lo primero que se veía era el último
  // campo de todos
  const eligeElTipo = (tipo) => {
    setTipoElegido(tipo);
    globalThis.scrollTo?.(0, 0);
  };

  // Igual que el tipo: al elegir, el formulario empieza por arriba
  const eligeElModo = (modo) => {
    setFormData(prev => ({ ...prev, setupMode: modo }));
    globalThis.scrollTo?.(0, 0);
  };
  const [message, setMessage] = useState({ type: '', text: '' });

  // Ref para cleanup del timer de navegación (prevenir memory leak)
  const navigationTimerRef = useRef(null);

  // Countries data
  const [allCountries, setAllCountries] = useState([]);
  const [adjacentCountries1, setAdjacentCountries1] = useState([]);
  const [adjacentCountries2, setAdjacentCountries2] = useState([]);

  // Los dos desplegables se pintan en el idioma activo, así que se ordenan por
  // él. La segunda lista además se construye concatenando dos, de modo que sin
  // esto no sale ordenada en ningún idioma.
  const sortedAdjacentCountries1 = useMemo(
    () => sortCountriesByName(adjacentCountries1, i18n.language),
    [adjacentCountries1, i18n.language]
  );
  const sortedAdjacentCountries2 = useMemo(
    () => sortCountriesByName(adjacentCountries2, i18n.language),
    [adjacentCountries2, i18n.language]
  );

  // Form data
  const [formData, setFormData] = useState({
    // Competition Details
    competitionName: '',
    // Nacen en el idioma de la app: son texto libre del organizador, así que
    // traducirlos al pintar le cambiaría el nombre a quien llame a su equipo
    // «USA» a propósito
    teamOneName: nombresPorDefectoDeLosEquipos(t).uno,
    teamTwoName: nombresPorDefectoDeLosEquipos(t).dos,

    // Schedule
    startDate: '',
    endDate: '',

    // Location
    country: null,
    adjacentCountry1: '',
    adjacentCountry2: '',
    showAdjacentCountry1: false,
    showAdjacentCountry2: false,

    // Golf Courses (array of { countryCode, course })
    golfCourses: [],

    // RyderCup Settings
    playMode: 'HANDICAP',
    visibility: 'PRIVATE',
    numberOfPlayers: CUPO_POR_DEFECTO,
    // Cuánto monta la app por su cuenta (FE #695). Al crear se elige en su paso;
    // el reparto de equipos sale de él, así que ya no se pregunta aparte
    setupMode: null,
    maxPlayingHandicap: undefined
  });

  // El resumen del plegable no puede prometer un equipo que ya no está escrito
  // Vaciar el campo en edición no puede recortar el cupo de una competición con
  // gente ya aprobada: se conserva el que se cargó (`/code-review`)
  const cupoCargado = useRef(CUPO_POR_DEFECTO);

  // El aviso se pinta arriba del todo y el botón vive abajo: en un teléfono se
  // pulsa «Crear» y no pasa nada visible. Hay que llevarlo a los ojos
  // (`/code-review`)
  const avisoRef = useRef(null);
  // El resumen no puede prometer lo que el envío va a rechazar, y quien sabe si
  // vale es la validación: aquí se le pregunta a ella, no a una copia de sus
  // reglas que se quedaría vieja al añadir la siguiente (`/code-review`)
  const faltaAlgoPlegado = ERRORES_DE_LAS_OPCIONES.has(
    validateCompetitionForm({ ...formData, ...FORMULARIO_MINIMO })?.key
  );

  // Golf Course Request Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestModalCountry, setRequestModalCountry] = useState(null);

  /**
   * Cleanup: limpiar timer de navegación al desmontar
   * Previene memory leak si el componente se desmonta antes de que se ejecute setTimeout
   */
  useEffect(() => {
    return () => {
      if (navigationTimerRef.current) {
        clearTimeout(navigationTimerRef.current);
      }
    };
  }, []);

  // Los namespaces se cargan con `import()` y sin suspense, así que la primera
  // renderización puede llegar con `t` sin resolver: los equipos nacerían con
  // su respaldo en inglés y, por ser el valor inicial de `useState`, se
  // quedarían congelados en una app en español. Aquí se corrigen en cuanto el
  // idioma esté, y solo mientras el organizador no haya escrito el suyo.
  //
  // Si lo ha escrito se sabe por el campo, no por el texto: comparar con los
  // nombres de la app tomaba por no tocado un «USA» escrito a propósito, y lo
  // cambiaba al pasar de idioma (revisión de la FE #707)
  //
  // NUNCA al editar: ahí los nombres vienen del servidor, y cambiar de idioma
  // le renombraría los equipos ya guardados a una competición en marcha
  const nombresEditados = useRef({ teamOneName: false, teamTwoName: false });
  useEffect(() => {
    if (isEditMode) return;
    const porDefecto = nombresPorDefectoDeLosEquipos(t);
    setFormData((antes) => {
      const uno = nombresEditados.current.teamOneName ? antes.teamOneName : porDefecto.uno;
      const dos = nombresEditados.current.teamTwoName ? antes.teamTwoName : porDefecto.dos;
      // Sin cambios, el MISMO objeto: uno nuevo vuelve a pintar, y si `t`
      // cambia en cada pintada el efecto no acaba nunca
      if (uno === antes.teamOneName && dos === antes.teamTwoName) return antes;
      return { ...antes, teamOneName: uno, teamTwoName: dos };
    });
  }, [t, i18n.language, isEditMode]);

  useEffect(() => {
    // Fetch all countries
    // eslint-disable-next-line react-hooks/immutability -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
    fetchCountries();
  }, []);

  /**
   * Load competition data when in edit mode
   */
  useEffect(() => {
    const loadCompetitionData = async () => {
      if (!competitionId || !allCountries.length) return;

      setLoadingCompetition(true);

      try {
        // Fetch competition details
        const competition = await getCompetitionDetailUseCase.execute(competitionId);

        // Extract main country code from location
        // The mapper returns location as a string or we need to extract from countries array
        let mainCountryCode = null;
        if (competition.countries && competition.countries.length > 0) {
          // First country in array is the main country
          mainCountryCode = competition.countries[0].code;
        }

        // Find main country object from allCountries
        const mainCountry = allCountries.find(c => c.code === mainCountryCode);

        // Prepare adjacent countries (all countries except the first one)
        const adjacentCountriesArray = competition.countries?.slice(1) || [];
        const adjacentCountry1 = adjacentCountriesArray[0]?.code || '';
        const adjacentCountry2 = adjacentCountriesArray[1]?.code || '';

        // Fetch adjacent countries lists if needed
        let level1Countries = [];
        if (mainCountryCode) {
          // eslint-disable-next-line react-hooks/immutability -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
          level1Countries = await fetchAdjacentCountries(mainCountryCode, 1);
        }
        if (adjacentCountry1) {
          await fetchAdjacentCountries(adjacentCountry1, 2, {
            currentAdjacentCountries1: level1Countries,
            mainCountryCode,
            adjacentCountry1Code: adjacentCountry1
          });
        }

        // Fetch golf courses for this competition
        let golfCoursesData = [];
        try {
          const coursesResult = await getCompetitionGolfCoursesUseCase.execute(competitionId);

          // Map the result to the format expected by formData
          if (Array.isArray(coursesResult)) {
            golfCoursesData = coursesResult.map(item => ({
              countryCode: item.golf_course?.country_code || competition.main_country,
              course: {
                id: item.golf_course?.id || item.golf_course_id,
                name: item.golf_course?.name || 'Unknown',
                approvalStatus: item.golf_course?.approval_status || 'APPROVED'
              }
            }));
          }
        } catch (error) {
          console.error('Error loading golf courses:', error);
        }

        // Populate form with competition data
        // NOTE: The mapper returns camelCase, not snake_case
        const formDataToSet = {
          competitionName: competition.name || '',
          teamOneName: competition.team1Name || nombresPorDefectoDeLosEquipos(t).uno,
          teamTwoName: competition.team2Name || nombresPorDefectoDeLosEquipos(t).dos,
          startDate: competition.startDate || '',
          endDate: competition.endDate || '',
          country: mainCountry || null,
          adjacentCountry1: adjacentCountry1,
          adjacentCountry2: adjacentCountry2,
          showAdjacentCountry1: !!adjacentCountry1,
          showAdjacentCountry2: !!adjacentCountry2,
          golfCourses: golfCoursesData,
          playMode: competition.playMode || 'HANDICAP',
          visibility: competition.visibility || 'PRIVATE',
          numberOfPlayers: competition.maxPlayers || CUPO_POR_DEFECTO,
          setupMode: competition.setupMode || 'RYDER_CUP',
          maxPlayingHandicap: competition.maxPlayingHandicap ?? undefined
        };

        // Lo que había guardado: vaciar el campo no puede recortarlo
        cupoCargado.current = formDataToSet.numberOfPlayers;
        setFormData(formDataToSet);

      } catch (error) {
        console.error('Error loading competition:', error);
        customToast.error(t('edit.errorLoading'));
        navigate('/competitions');
      } finally {
        setLoadingCompetition(false);
      }
    };

    loadCompetitionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionId, allCountries]);

  useEffect(() => {
    if (!message.text) return;
    // Instantáneo, no `smooth`: comprobado en Chrome, el suave no llega a
    // ejecutarse desde aquí y el aviso se quedaba fuera de pantalla
    avisoRef.current?.scrollIntoView({ block: 'center' });
  }, [message.text]);

  const fetchCountries = async () => {
    try {
      const data = await fetchCountriesUseCase.execute();
      const validCountries = Array.isArray(data)
        ? data
            .filter(c => c?.code && (c?.name_en || c?.name_es))
            .map(c => ({
              id: c.code,
              name: c.name_en || c.name_es,
              code: c.code,
              name_en: c.name_en,
              name_es: c.name_es
            }))
        : [];
      setAllCountries(validCountries);
    } catch (error) {
      console.error('Error fetching countries:', error);
      setAllCountries([]);
    }
  };

  const fetchAdjacentCountries = async (countryId, level, context = {}) => {
    try {
      const data = await getAdjacentCountriesUseCase.execute(countryId);
      const mappedData = Array.isArray(data)
        ? data
            .filter(c => c?.code && (c?.name_en || c?.name_es))
            .map(c => ({
              id: c.code,
              name: c.name_en || c.name_es,
              code: c.code,
              name_en: c.name_en,
              name_es: c.name_es
            }))
        : [];

      if (level === 1) {
        setAdjacentCountries1(mappedData);
      } else if (level === 2) {
        const { currentAdjacentCountries1 = [], mainCountryCode = null, adjacentCountry1Code = null } = context;
        const existingIds = new Set(currentAdjacentCountries1.map(c => c.code));
        const combined = [...currentAdjacentCountries1];
        for (const country of mappedData) {
          if (!existingIds.has(country.code) && country.code !== mainCountryCode && country.code !== adjacentCountry1Code) {
            combined.push(country);
          }
        }
        setAdjacentCountries2(combined);
      }

      return mappedData;
    } catch (error) {
      console.error('Error fetching adjacent countries:', error);
      return [];
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name in nombresEditados.current) nombresEditados.current[name] = true;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (message.text) setMessage({ type: '', text: '' });

    if (name === 'playMode') {
      setFormData(prev => ({
        ...prev,
        playMode: value
      }));
    }
  };

  const handleCountrySelect = (country) => {
    setFormData(prev => {
      // Keep only golf courses for the main country
      const newGolfCourses = prev.golfCourses.filter(gc => gc.countryCode === country.code);

      return {
        ...prev,
        country: country,
        adjacentCountry1: '',
        adjacentCountry2: '',
        showAdjacentCountry1: false,
        showAdjacentCountry2: false,
        golfCourses: newGolfCourses
      };
    });
    setAdjacentCountries1([]);
    setAdjacentCountries2([]);
    fetchAdjacentCountries(country.code, 1);
  };

  const handleAddAdjacentCountry1 = () => {
    if (formData.country) {
      setFormData(prev => ({ ...prev, showAdjacentCountry1: true }));
    }
  };

  const handleAdjacentCountry1Change = (e) => {
    const countryId = e.target.value;
    setFormData(prev => ({
      ...prev,
      adjacentCountry1: countryId,
      adjacentCountry2: '',
      showAdjacentCountry2: false
    }));
    if (countryId) {
      fetchAdjacentCountries(countryId, 2, {
        currentAdjacentCountries1: adjacentCountries1,
        mainCountryCode: formData.country?.code,
        adjacentCountry1Code: countryId
      });
    }
  };

  const handleAddAdjacentCountry2 = () => {
    if (formData.adjacentCountry1) {
      setFormData(prev => ({
        ...prev,
        showAdjacentCountry2: true
      }));
    }
  };

  const handleRemoveAdjacentCountry1 = () => {
    setFormData(prev => {
      // Remove golf courses for both adjacent countries
      const newGolfCourses = prev.golfCourses.filter(
        gc => gc.countryCode !== prev.adjacentCountry1 && gc.countryCode !== prev.adjacentCountry2
      );

      return {
        ...prev,
        adjacentCountry1: '',
        adjacentCountry2: '',
        showAdjacentCountry1: false,
        showAdjacentCountry2: false,
        golfCourses: newGolfCourses
      };
    });
    setAdjacentCountries2([]);
  };

  const handleRemoveAdjacentCountry2 = () => {
    setFormData(prev => {
      // Remove golf courses for second adjacent country
      const newGolfCourses = prev.golfCourses.filter(gc => gc.countryCode !== prev.adjacentCountry2);

      return {
        ...prev,
        adjacentCountry2: '',
        showAdjacentCountry2: false,
        golfCourses: newGolfCourses
      };
    });
  };

  // Un campo ya añadido no se añade otra vez (FE #644). El buscador tampoco lo
  // ofrece, pero la guarda se queda: el torneo se crea ANTES de enganchar los
  // campos, así que un duplicado que se colara dejaba el torneo hecho y un error
  // listando el mismo campo varias veces
  const handleGolfCourseSelect = (countryCode, course) => {
    // La comprobación va FUERA del `setFormData`: React ejecuta el actualizador
    // dos veces en desarrollo (StrictMode) y puede repetirlo en un render que
    // descarta, así que un aviso ahí dentro salía por duplicado. Un actualizador
    // tiene que ser puro.
    //
    // Y se exige que el campo traiga `id`: sin eso, dos campos DISTINTOS sin id
    // se tomaban por el mismo y el segundo se descartaba diciendo que ya estaba
    const yaEsta =
      Boolean(course?.id) && formData.golfCourses.some(gc => gc.course?.id === course.id);
    if (yaEsta) {
      customToast.info(t('create.courseAlreadyAdded'));
      return;
    }
    setFormData(prev => ({
      ...prev,
      golfCourses: [...prev.golfCourses, { countryCode, course }],
    }));
  };

  // Los que ya están, para que el buscador no vuelva a ofrecerlos
  const idsDeLosCamposElegidos = formData.golfCourses
    .map(gc => gc.course?.id)
    .filter(Boolean);

  const handleRemoveGolfCourse = (index) => {
    setFormData(prev => ({
      ...prev,
      golfCourses: prev.golfCourses.filter((_, i) => i !== index)
    }));
  };

  const handleRequestNewCourse = (countryCode) => {
    setRequestModalCountry(countryCode);
    setShowRequestModal(true);
  };

  const handleRequestModalClose = () => {
    setShowRequestModal(false);
    setRequestModalCountry(null);
  };

  const handleRequestSuccess = (createdCourse) => {
    // Auto-select the newly requested course for its country
    if (requestModalCountry) {
      handleGolfCourseSelect(requestModalCountry, createdCourse);
    }
  };

  // Get courses for a specific country
  const getCoursesForCountry = (countryCode) => {
    return formData.golfCourses.filter(gc => gc.countryCode === countryCode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // UI Validation
    const validationError = validateCompetitionForm(formData);
    if (validationError) {
      if (validationError.key === 'golfCoursesRequired') {
        const countryNames = validationError.missingCourseCountryCodes.map(code => {
          const country = allCountries.find(c => c.code === code) ||
                          adjacentCountries1.find(c => c.code === code) ||
                          adjacentCountries2.find(c => c.code === code);
          return formatCountryName(country, i18n.language);
        }).join(', ');
        setMessage({
          type: 'error',
          text: t(`create.errors.${validationError.key}`, { countries: countryNames })
        });
      } else {
        setMessage({ type: 'error', text: t(`create.errors.${validationError.key}`) });
      }
      // Si lo que falla vive dentro de «Más opciones», el aviso hablaba de un
      // campo que no estaba en pantalla (`/code-review`)
      if (ERRORES_DE_LAS_OPCIONES.has(validationError.key)) {
        setMasOpciones(true);
      }
      return;
    }

    // Una pública se publica al crearse, y eso es lo que hay que decir antes de
    // hacerlo. En una privada no hay nada que avisar: no la ve nadie y se entra
    // por invitación (FE #666). Al editar tampoco: ya existe
    if (!isEditMode && formData.visibility === 'PUBLIC') {
      setPreguntandoApertura(true);
      return;
    }

    await crear(null);
  };

  /**
   * Crea la competición con los días de apertura elegidos.
   *
   * `diasDeApertura` en `null` significa que no hay apertura programada, que es
   * como el backend entiende «ábrela ya» (RyderCupAM#332).
   */
  const crear = async (diasDeApertura) => {
    // El modal NO se cierra aquí: se queda con su botón deshabilitado mientras
    // la petición está en vuelo. Cerrándolo antes, el `isLoading` que recibe es
    // siempre falso y devuelve el formulario a la mano justo cuando no se puede
    // tocar. Se cierra al terminar, en el `finally`
    setIsSubmitting(true);

    try {
      const numPlayers = cupoDeJugadores(formData.numberOfPlayers, cupoCargado.current);
      const countries = [];
      if (formData.adjacentCountry1) {
        countries.push(formData.adjacentCountry1);
      }
      if (formData.adjacentCountry2) {
        countries.push(formData.adjacentCountry2);
      }

      const payload = {
        name: formData.competitionName.trim(),
        team_1_name: formData.teamOneName.trim(),
        team_2_name: formData.teamTwoName.trim(),
        start_date: formData.startDate,
        end_date: formData.endDate,
        main_country: formData.country?.code,
        countries: countries,
        play_mode: formData.playMode.toUpperCase(),
        visibility: formData.visibility,
        number_of_players: numPlayers,
        // El reparto no se manda: lo deriva el servidor del modo (RyderCupAm#351)
        setup_mode: formData.setupMode,
        max_playing_handicap: formData.maxPlayingHandicap
          ? parseInt(formData.maxPlayingHandicap, 10)
          : null,
        // Solo cuando hay apertura programada: mandarlo en `null` seria decir
        // «quitale la programacion», que es lo mismo aqui pero ensucia el
        // contrato de la creacion
        ...(diasDeApertura != null
          ? { enrollment_opens_days_before: diasDeApertura }
          : {})
      };

      if (isEditMode) {
        // EDIT MODE: Update existing competition
        await updateCompetitionUseCase.execute(competitionId, payload);

        customToast.success(t('edit.success'));

        // Navigate to competition detail
        navigationTimerRef.current = setTimeout(() => {
          navigate(`/competitions/${competitionId}`);
        }, 1000);

      } else {
        // CREATE MODE: Create new competition and attach its golf courses
        const golfCourses = formData.golfCourses.map((gc) => ({
          id: gc.course.id,
          name: gc.course.name
        }));
        const { competition: createdCompetition, successCount, failedCourses } =
          await createCompetitionWithGolfCoursesUseCase.execute(payload, golfCourses);

        // Show appropriate message based on results
        if (failedCourses.length === 0) {
          customToast.success(t('create.success'));
        } else if (successCount > 0) {
          customToast.warning(
            t('create.partialSuccess', {
              success: successCount,
              failed: failedCourses.length,
              courses: failedCourses.join(', ')
            })
          );
        } else {
          customToast.error(t('create.errorAddingCourses'));
        }

        // Navigate to competition detail
        navigationTimerRef.current = setTimeout(() => {
          navigate(`/competitions/${createdCompetition.id}`);
        }, 1500);
      }

    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} competition:`, error);
      customToast.error(error.message || t(isEditMode ? 'edit.error' : 'create.error'));
      setMessage({ type: 'error', text: error.message || t(isEditMode ? 'edit.error' : 'create.error') });
    } finally {
      setIsSubmitting(false);
      // Se cierra tanto si salió bien como si falló: si falló, el aviso está en
      // el formulario, y dejarlo tapado por el modal lo esconde
      setPreguntandoApertura(false);
    }
  };

  if (isLoading || loadingCompetition) {
    return (
      <FullScreenLoader texto={loadingCompetition ? t('edit.loading') : t('common:loading')} />
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white">
      <div className="layout-container flex h-full grow flex-col">
        <HeaderAuth user={user} />

        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            {/* Page Title */}
            <div className="flex flex-wrap justify-between gap-3 p-4">
              <p data-testid="titulo-pantalla" className="hidden md:block text-gray-900 tracking-tight text-3xl md:text-[32px] font-bold leading-tight min-w-72">
                {isEditMode ? (t('edit.title') || 'Edit Competition') : t('create.title')}
              </p>
            </div>

            {/* Message Display */}
            {message.text && (
              <div ref={avisoRef} className={`mx-4 mb-4 p-4 rounded-lg ${getMessageClassName(message.type)}`}>
                {message.text}
              </div>
            )}

            {!isEditMode && !tipoElegido && (
              <div className="px-4">
                <CompetitionTypeChooser onSelect={eligeElTipo} />
              </div>
            )}

            {/* Y detrás del tipo, cuánto hace la app por su cuenta (FE #695).
                Editando no es un paso: la competición ya existe y el modo se
                cambia dentro del formulario, como el resto de su configuración */}
            {!isEditMode && tipoElegido && !formData.setupMode && (
              <div className="px-4">
                <SetupModeChooser onSelect={eligeElModo} />
              </div>
            )}

            {(isEditMode || (tipoElegido && formData.setupMode)) && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-4">
              {/* Volver a elegir el tipo. Lo escrito se queda: `formData` no se
                  toca al cambiar de paso, que perder el formulario por mirar
                  los otros tipos es peor que no dejar mirarlos */}
              {!isEditMode && (
                <button
                  type="button"
                  data-testid="volver-al-tipo"
                  onClick={() => {
                    setTipoElegido(null);
                    setFormData(prev => ({ ...prev, setupMode: null }));
                  }}
                  className="self-start text-sm text-gray-600 hover:text-gray-900"
                >
                  {t('create.type.back')}
                </button>
              )}

              {/* Lo básico de la competición, en UNA tarjeta: nombre, fechas y
                  país eran tres, y cada una pagaba su icono y su marco. Medido a
                  360 px, ese adorno costaba 230 px de scroll (Agustín, 19 sep) */}
              {/* El modo, a la vista y no dentro de «más opciones»: decide qué
                  pasos existen después, así que esconderlo sería esconder el
                  resto del camino (FE #695). Al crear ya viene elegido del paso
                  anterior; aquí se cambia */}
              <div className="border border-gray-200 rounded-xl p-4">
                <SetupModeChooser value={formData.setupMode} onSelect={eligeElModo} />
              </div>

              <div data-testid="bloque-basico" className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-gray-900 font-bold text-base">{t('create.competitionDetails')}</h3>
                </div>

                <div className="space-y-3">
                  {/* Arriba y pequeño: de quién es el torneo se decide al montarlo,
                      no en «Más opciones». Privada por defecto, que es lo que hay
                      hoy y lo que no enseña nada a nadie por error (FE #664) */}
                  <div>
                    <span
                      id="etiqueta-visibilidad"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      {t('create.visibility')}
                    </span>
                    {/* Los dos botones van juntos y con su pregunta: sueltos, un
                        lector de pantalla dice «Solo invitados, pulsado» sin
                        decir a qué pregunta responde */}
                    <div
                      role="group"
                      aria-labelledby="etiqueta-visibilidad"
                      className="flex flex-wrap gap-2"
                    >
                      {['PRIVATE', 'PUBLIC'].map(cual => (
                        <button
                          key={cual}
                          type="button"
                          data-testid={`visibilidad-${cual}`}
                          aria-pressed={formData.visibility === cual}
                          onClick={() => setFormData(prev => ({ ...prev, visibility: cual }))}
                          className={`border-2 rounded-lg text-sm px-3 py-2 transition-colors ${
                            formData.visibility === cual
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
                          }`}
                        >
                          {t(`create.visibility${cual === 'PRIVATE' ? 'Private' : 'Public'}`)}
                        </button>
                      ))}
                    </div>
                    {/* «Privada» a secas no dice si la gente puede apuntarse sola */}
                    <p
                      data-testid="visibilidad-explicacion"
                      className="text-xs text-gray-500 mt-1"
                    >
                      {t(
                        formData.visibility === 'PUBLIC'
                          ? 'create.visibilityPublicHelp'
                          : 'create.visibilityPrivateHelp'
                      )}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="competitionName" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('create.competitionName')}
                    </label>
                    <input
                      id="competitionName"
                      data-testid="campo-nombre"
                      type="text"
                      name="competitionName"
                      value={formData.competitionName}
                      onChange={handleInputChange}
                      placeholder={t('create.competitionNamePlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                {/* Los campos de fecha se salían de la tarjeta en el iPhone (FE #648).
                    Medido en un iPhone 14 real: con el mismo `w-full`, el campo de
                    texto medía 292 px y el de fecha 318. Safari en iOS dibuja
                    `input[type="date"]` como control nativo y ese control IMPONE su
                    ancho: no lo arreglan `w-full`, ni `min-w-0`, ni `max-w-full`.
                    Lo único que lo libera es quitarle la apariencia nativa
                    (`appearance-none`), y entonces mide los mismos 292.

                    No se reproduce en ningún navegador de escritorio, ni siquiera en
                    WebKit, que ahí dibuja otro control. Solo se ve en un teléfono. */}
                <div data-testid="fila-fechas" className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('create.startDate')}
                    </label>
                    <input
                      id="startDate"
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      className="w-full min-w-0 max-w-full appearance-none px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="min-w-0">
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('create.endDate')}
                    </label>
                    <input
                      id="endDate"
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      className="w-full min-w-0 max-w-full appearance-none px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                  {/* El país principal se elige entre los 200: es el único de
                      los tres selectores que necesita búsqueda, porque los
                      adyacentes ya listan solo países fronterizos */}
                  <CountryAutocomplete
                    id="country"
                    countries={allCountries}
                    value={formData.country?.code || ''}
                    label={t('create.country')}
                    placeholder={t('create.selectCountry')}
                    onChange={(code) => {
                      const selectedCountry = allCountries.find(c => c.code === code);
                      if (selectedCountry) {
                        handleCountrySelect(selectedCountry);
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          country: null,
                          adjacentCountry1: '',
                          adjacentCountry2: '',
                          showAdjacentCountry1: false,
                          showAdjacentCountry2: false
                        }));
                      }
                    }}
                  />

                  {/* Adjacent Country 1 */}
                  {formData.country && !formData.showAdjacentCountry1 && adjacentCountries1.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAddAdjacentCountry1}
                      className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      {t('create.addAdjacentCountry')}
                    </button>
                  )}

                  {formData.showAdjacentCountry1 && (
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label htmlFor="adjacentCountry1" className="block text-sm font-medium text-gray-700 mb-1">
                          {t('create.adjacentCountry')}
                        </label>
                        <div className="relative">
                          <select
                            id="adjacentCountry1"
                            name="adjacentCountry1"
                            value={formData.adjacentCountry1}
                            onChange={handleAdjacentCountry1Change}
                            className={`w-full py-2 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary appearance-none pr-10 ${
                              formData.adjacentCountry1 ? 'pl-12' : 'pl-3'
                            }`}
                          >
                            <option value="">{t('create.selectAdjacentCountry')}</option>
                            {sortedAdjacentCountries1.map(country => (
                              <option key={country.id} value={country.id}>
                                {formatCountryName(country, i18n.language)}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                          {/* Show flag if country is selected */}
                          {formData.adjacentCountry1 && (
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                              <CountryFlag countryCode={formData.adjacentCountry1} style={{ width: '24px', height: 'auto' }} />
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveAdjacentCountry1}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  {/* Adjacent Country 2 */}
                  {formData.adjacentCountry1 && !formData.showAdjacentCountry2 && adjacentCountries2.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAddAdjacentCountry2}
                      className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      {t('create.addThirdCountry')}
                    </button>
                  )}

                  {formData.showAdjacentCountry2 && (
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label htmlFor="adjacentCountry2" className="block text-sm font-medium text-gray-700 mb-1">
                          {t('create.thirdCountry')}
                        </label>
                        <div className="relative">
                          <select
                            id="adjacentCountry2"
                            name="adjacentCountry2"
                            value={formData.adjacentCountry2}
                            onChange={handleInputChange}
                            className={`w-full py-2 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary appearance-none pr-10 ${
                              formData.adjacentCountry2 ? 'pl-12' : 'pl-3'
                            }`}
                          >
                            <option value="">{t('create.selectThirdCountry')}</option>
                            {sortedAdjacentCountries2
                              .filter(c => c.code !== formData.adjacentCountry1)
                              .map(country => (
                                <option key={country.id} value={country.id}>
                                  {formatCountryName(country, i18n.language)}
                                </option>
                              ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                          {/* Show flag if country is selected */}
                          {formData.adjacentCountry2 && (
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                              <CountryFlag countryCode={formData.adjacentCountry2} style={{ width: '24px', height: 'auto' }} />
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveAdjacentCountry2}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 4: Golf Courses - Hidden in edit mode */}
              {!isEditMode && (
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <Flag className="w-4 h-4 text-green-700" />
                  </div>
                  <div>
                    <h3 className="text-gray-900 font-bold text-base">{t('create.golfCourses')}</h3>
                    <p className="text-sm text-gray-500">{t('create.golfCoursesSubtitle')}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Main Country Golf Courses */}
                  {formData.country && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CountryFlag countryCode={formData.country.code} style={{ width: '24px', height: 'auto' }} />
                        <h4 className="text-base font-semibold text-gray-900">
                          {formatCountryName(formData.country, i18n.language)}
                        </h4>
                        <span className="text-xs text-gray-500">
                          ({getCoursesForCountry(formData.country.code).length} {t('create.coursesSelected')})
                        </span>
                      </div>

                      {/* List of selected courses */}
                      {getCoursesForCountry(formData.country.code).map((gc, index) => {
                        const globalIndex = formData.golfCourses.findIndex(
                          item => item.countryCode === gc.countryCode && item.course.id === gc.course.id
                        );
                        return (
                          <div key={`${gc.course.id}-${index}`} className="mb-2 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{gc.course.name}</p>
                              {gc.course.approvalStatus === 'PENDING_APPROVAL' && (
                                <p className="text-xs text-yellow-700 mt-1 flex items-center gap-1">
                                  <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full"></span>
                                  {t('create.coursePendingApproval')}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveGolfCourse(globalIndex)}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}

                      {/* Add course button/search */}
                      <div className="mt-3">
                        <GolfCourseSearchBox
                          countryCode={formData.country.code}
                          selectedCourse={null}
                          idsYaElegidos={idsDeLosCamposElegidos}
                          onCourseSelect={(course) => handleGolfCourseSelect(formData.country.code, course)}
                          onRequestNewCourse={() => handleRequestNewCourse(formData.country.code)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Adjacent Country 1 Golf Courses */}
                  {formData.adjacentCountry1 && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CountryFlag countryCode={formData.adjacentCountry1} style={{ width: '24px', height: 'auto' }} />
                        <h4 className="text-base font-semibold text-gray-900">
                          {formatCountryName(
                            allCountries.find(c => c.code === formData.adjacentCountry1) || adjacentCountries1.find(c => c.code === formData.adjacentCountry1),
                            i18n.language
                          )}
                        </h4>
                        <span className="text-xs text-gray-500">
                          ({getCoursesForCountry(formData.adjacentCountry1).length} {t('create.coursesSelected')})
                        </span>
                      </div>

                      {/* List of selected courses */}
                      {getCoursesForCountry(formData.adjacentCountry1).map((gc, index) => {
                        const globalIndex = formData.golfCourses.findIndex(
                          item => item.countryCode === gc.countryCode && item.course.id === gc.course.id
                        );
                        return (
                          <div key={`${gc.course.id}-${index}`} className="mb-2 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{gc.course.name}</p>
                              {gc.course.approvalStatus === 'PENDING_APPROVAL' && (
                                <p className="text-xs text-yellow-700 mt-1 flex items-center gap-1">
                                  <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full"></span>
                                  {t('create.coursePendingApproval')}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveGolfCourse(globalIndex)}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}

                      {/* Add course button/search */}
                      <div className="mt-3">
                        <GolfCourseSearchBox
                          countryCode={formData.adjacentCountry1}
                          selectedCourse={null}
                          idsYaElegidos={idsDeLosCamposElegidos}
                          onCourseSelect={(course) => handleGolfCourseSelect(formData.adjacentCountry1, course)}
                          onRequestNewCourse={() => handleRequestNewCourse(formData.adjacentCountry1)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Adjacent Country 2 Golf Courses */}
                  {formData.adjacentCountry2 && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CountryFlag countryCode={formData.adjacentCountry2} style={{ width: '24px', height: 'auto' }} />
                        <h4 className="text-base font-semibold text-gray-900">
                          {formatCountryName(
                            allCountries.find(c => c.code === formData.adjacentCountry2) || adjacentCountries2.find(c => c.code === formData.adjacentCountry2),
                            i18n.language
                          )}
                        </h4>
                        <span className="text-xs text-gray-500">
                          ({getCoursesForCountry(formData.adjacentCountry2).length} {t('create.coursesSelected')})
                        </span>
                      </div>

                      {/* List of selected courses */}
                      {getCoursesForCountry(formData.adjacentCountry2).map((gc, index) => {
                        const globalIndex = formData.golfCourses.findIndex(
                          item => item.countryCode === gc.countryCode && item.course.id === gc.course.id
                        );
                        return (
                          <div key={`${gc.course.id}-${index}`} className="mb-2 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{gc.course.name}</p>
                              {gc.course.approvalStatus === 'PENDING_APPROVAL' && (
                                <p className="text-xs text-yellow-700 mt-1 flex items-center gap-1">
                                  <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full"></span>
                                  {t('create.coursePendingApproval')}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveGolfCourse(globalIndex)}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}

                      {/* Add course button/search */}
                      <div className="mt-3">
                        <GolfCourseSearchBox
                          countryCode={formData.adjacentCountry2}
                          selectedCourse={null}
                          idsYaElegidos={idsDeLosCamposElegidos}
                          onCourseSelect={(course) => handleGolfCourseSelect(formData.adjacentCountry2, course)}
                          onRequestNewCourse={() => handleRequestNewCourse(formData.adjacentCountry2)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* Section 5: RyderCup Settings — el formato se decide aquí, a la
                  vista: cuántos sois y si se juega con hándicap son las dos
                  preguntas que el organizador SÍ contesta (Agustín, 19 sep) */}
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Settings className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-gray-900 font-bold text-base">{t('create.ryderCupSettings')}</h3>
                </div>

                <div className="space-y-4">
                  {/* Play Mode */}
                  <div>
                    <span className="block text-sm font-medium text-gray-700 mb-2">
                      {t('create.playMode')}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {['HANDICAP', 'SCRATCH'].map(mode => (
                        <button
                          key={mode}
                          type="button"
                          aria-pressed={formData.playMode === mode}
                          onClick={() => setFormData(prev => ({ ...prev, playMode: mode }))}
                          className={`border-2 rounded-lg text-sm px-3 py-2 transition-colors ${
                            formData.playMode === mode
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
                          }`}
                        >
                          {t(`create.${mode.toLowerCase()}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Number of Players */}
                  <div>
                    <label htmlFor="numberOfPlayers" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('create.numberOfPlayers')}
                    </label>
                    <input
                      id="numberOfPlayers"
                      data-testid="campo-jugadores"
                      type="number"
                      name="numberOfPlayers"
                      value={formData.numberOfPlayers === undefined ? '' : formData.numberOfPlayers}
                      onChange={handleInputChange}
                      onBlur={() => setFormData(prev => ({
                        ...prev,
                        // Dejarlo en blanco no es «sin límite»: hay cupo igual, y
                        // callárselo es enterarse con el jugador 13 fuera
                        numberOfPlayers: cupoDeJugadores(prev.numberOfPlayers, cupoCargado.current),
                      }))}
                      min="2"
                      max="100"
                      placeholder={t('create.numberOfPlayersPlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Lo que no hay que decidir para crear: se pliega, pero se dice
                  qué se acepta si nadie lo toca (FE #637) */}
              <div className="border border-gray-200 rounded-xl">
                <button
                  type="button"
                  data-testid="mas-opciones"
                  onClick={() => setMasOpciones((abierto) => !abierto)}
                  aria-expanded={masOpciones}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                >
                  <span className="font-medium text-gray-900">{t('create.moreOptions')}</span>
                  <span className="text-gray-500">{masOpciones ? '−' : '+'}</span>
                </button>

                {!masOpciones && (
                  <p data-testid="resumen-opciones" className="px-4 pb-4 text-sm text-gray-600">
                    {faltaAlgoPlegado
                      ? t('create.moreOptionsIncomplete')
                      // Sin el reparto de equipos: ya no se decide aquí, lo
                      // decide el modo, que está a la vista arriba (FE #695)
                      : t('create.moreOptionsSummary', {
                        equipo1: formData.teamOneName,
                        equipo2: formData.teamTwoName,
                        handicap: formData.maxPlayingHandicap
                          ? t('create.summaryHandicapLimit', { limite: formData.maxPlayingHandicap })
                          : t('create.summaryNoHandicapLimit'),
                      })}
                  </p>
                )}

                {masOpciones && (
                  <div className="space-y-4 border-t border-gray-200 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="teamOneName" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('create.teamOneName')}
                      </label>
                      <input
                        id="teamOneName"
                        data-testid="campo-equipo-1"
                        type="text"
                        name="teamOneName"
                        value={formData.teamOneName}
                        onChange={handleInputChange}
                        placeholder={t('create.teamOneNamePlaceholder')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label htmlFor="teamTwoName" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('create.teamTwoName')}
                      </label>
                      <input
                        id="teamTwoName"
                        data-testid="campo-equipo-2"
                        type="text"
                        name="teamTwoName"
                        value={formData.teamTwoName}
                        onChange={handleInputChange}
                        placeholder={t('create.teamTwoNamePlaceholder')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  {/* Max Playing Handicap */}
                  <div>
                    <label htmlFor="maxPlayingHandicap" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('create.maxPlayingHandicap')}
                    </label>
                    <input
                      id="maxPlayingHandicap"
                      data-testid="campo-handicap"
                      type="number"
                      name="maxPlayingHandicap"
                      value={formData.maxPlayingHandicap === undefined ? '' : formData.maxPlayingHandicap}
                      onChange={handleInputChange}
                      min="1"
                      max="54"
                      placeholder={t('create.maxPlayingHandicapPlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="mt-1 text-xs text-gray-500">{t('create.maxPlayingHandicapHint')}</p>
                  </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              {/* En el móvil la fila ocupa el ancho, alineada con las tarjetas:
                  pegada a la derecha quedaba descolgada. Pero el que crece es
                  «Crear», no «Cancelar»: con los dos a mitad y mitad, cancelar se
                  convertía en un objetivo enorme justo bajo el pulgar, al lado del
                  de enviar, y se lleva el formulario entero sin preguntar */}
              <div className="flex gap-3 pt-2 pb-6 sm:justify-end">
                <button
                  type="button"
                  onClick={() => navigate('/competitions')}
                  className="px-6 py-2.5 bg-gray-100 text-gray-900 text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t('create.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? (isEditMode ? (t('edit.updating') || 'Updating...') : t('create.creating'))
                    : (isEditMode ? (t('edit.updateCompetition') || 'Update Competition') : t('create.createCompetition'))
                  }
                </button>
              </div>
            </form>
            )}

            {/* Footer */}
            <footer className="flex flex-col gap-6 px-5 py-10 text-center">
              <p className="text-gray-500 text-base font-normal leading-normal">
                {t('footer', { year: new Date().getFullYear() })}
              </p>
            </footer>
          </div>
        </div>
      </div>

      {/* Golf Course Request Modal */}
      <GolfCourseRequestModal
        isOpen={showRequestModal}
        onClose={handleRequestModalClose}
        onSuccess={handleRequestSuccess}
        countryCode={requestModalCountry}
        createGolfCourseRequestUseCase={createGolfCourseRequestUseCase}
      />

      {/* Montado solo mientras se pregunta: dejándolo puesto conservaba lo
          elegido la vez anterior, y volver a entrar y confirmar mandaba unos
          días que nadie había vuelto a elegir */}
      {preguntandoApertura && (
        <EnrollmentOpeningModal
          isOpen
          startDate={formData.startDate}
          onConfirm={crear}
          onClose={() => setPreguntandoApertura(false)}
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
};

export default CreateCompetition;
