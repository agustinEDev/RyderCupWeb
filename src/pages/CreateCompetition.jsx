import { useState, useEffect, useEffectEvent, useRef, useMemo } from 'react';
import { tieneEquipos } from '../domain/value_objects/TournamentType';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useCargaCancelableEffect } from '../hooks/useCargaCancelableEffect';
import { nombresPorDefectoDeLosEquipos } from './nombresPorDefectoDeLosEquipos';
import { agendaPropuesta } from '../utils/agenda';
import { aCamposDeLaCompeticion } from '../utils/camposDeLaCompeticion';
import HeaderAuth from '../components/layout/HeaderAuth';
import { useAuth } from '../hooks/useAuth';
import { useCorreoVerificado } from '../hooks/useCorreoVerificado';
import AvisoVerificaParaLlegarAOtros from '../components/auth/AvisoVerificaParaLlegarAOtros';
import { useGeneroParaApuntarse } from '../hooks/useGeneroParaApuntarse';
import SelectorDeGenero from '../components/profile/SelectorDeGenero';
import {
  createCompetitionWithGolfCoursesUseCase,
  configureScheduleUseCase,
  updateCompetitionUseCase,
  updateStrokePlaySettingsUseCase,
  getCompetitionDetailUseCase,
  getCompetitionGolfCoursesUseCase,
  fetchCountriesUseCase,
  getAdjacentCountriesUseCase,
  createGolfCourseRequestUseCase,
} from '../composition';
import { formatCountryName, sortCountriesByName } from '../services/countries';
import { validateCompetitionForm } from '../utils/competitionFormValidation';
import GolfCourseRequestModal from '../components/golf_course/GolfCourseRequestModal';
import EnrollmentOpeningModal from '../components/competition/EnrollmentOpeningModal';
import SoloLectura from '../components/competition/create/SoloLectura';
import CamposDeLaCompeticion from '../components/competition/create/CamposDeLaCompeticion';
import DatosBasicos from '../components/competition/create/DatosBasicos';
import AvisoDelFormulario from '../components/competition/create/AvisoDelFormulario';
import FormatoDeLaCompeticion from '../components/competition/create/FormatoDeLaCompeticion';
import AjustesDeStrokePlayDelAlta from '../components/competition/create/AjustesDeStrokePlayDelAlta';
import MasOpciones from '../components/competition/create/MasOpciones';
import BotonesDelFormulario from '../components/competition/create/BotonesDelFormulario';
import customToast from '../utils/toast';
import FullScreenLoader from '../components/ui/FullScreenLoader';
import CompetitionTypeChooser from '../components/competition/CompetitionTypeChooser';
import SetupModeChooser from '../components/competition/SetupModeChooser';
import {
  diasDelTorneo,
  cambiosDeAjustes,
  primeroLosAjustes,
} from '../utils/ajustesDeStrokePlay';
import { cupoDeJugadores, CUPO_POR_DEFECTO } from '../utils/cupoDeJugadores';
import {
  soloSePuedenEditarLasFechas,
  seEditaLaCompeticion,
} from '../domain/services/edicionDeLaCompeticion';
import { PANTALLA_MENOS_BARRA_INFERIOR } from '../utils/barraInferior';
import { mensajeDelError } from '../utils/mensajeDelError';
import { registraElFallo } from '../utils/registraElFallo';
import {
  ERRORES_DEL_NOMBRE,
  ERRORES_DE_LAS_OPCIONES,
  aPaises,
  vecinosDelSegundoNivel,
  formularioInicial,
  formularioDeLaEdicion,
  faltaAlgoPlegado as faltaAlgoEnLoPlegado,
  pideGenero as hayQuePedirElGenero,
  pasoDelAlta,
  alElegirPais,
  alVaciarPais,
  alCambiarAdyacente1,
  alQuitarAdyacente1,
  alQuitarAdyacente2,
} from '../utils/formularioDeLaCompeticion';
import {
  cargaDeLaCompeticion,
  camposParaElAlta,
  errorDeLasFechasNuevas,
  sesionesQueQuedanFuera as sesionesFuera,
  motivoDelFalloAlEditar as motivoAlEditar,
  textoDelAvisoDeValidacion,
} from '../utils/peticionDeLaCompeticion';

// Los vecinos de un país; sin poder leerlos, ninguno
const leeVecinos = async (countryId) => {
  try {
    return aPaises(await getAdjacentCountriesUseCase.execute(countryId));
  } catch (error) {
    registraElFallo(
      'CreateCompetition.error-fetching-adjacent-countries',
      'Error fetching adjacent countries:',
      error,
    );
    return [];
  }
};

// Todo lo que hace falta para editar una competición, leído de una vez: la
// competición, los vecinos de sus países y sus campos. Una cerrada vuelve sin
// lo demás: no se edita
const leeLaCompeticionParaEditar = async (competitionId) => {
  // Fetch competition details
  const competition = await getCompetitionDetailUseCase.execute(competitionId);

  // Por URL se llegaba al formulario de una cerrada, y solo al guardar
  // fallaba, con el estado sin traducir (FE #710). La misma regla que
  // ofrece «Editar» en la ficha
  // Cerrada por el plazo (no por el organizador), se mueve: solo las fechas
  // (15 nov 2026, RyderCupAm #865)
  const soloFechas = soloSePuedenEditarLasFechas(competition);
  if (!seEditaLaCompeticion(competition)) {
    return { competition, editable: false };
  }

  // Extract main country code from location
  // The mapper returns location as a string or we need to extract from countries array
  let mainCountryCode = null;
  if (competition.countries && competition.countries.length > 0) {
    // First country in array is the main country
    mainCountryCode = competition.countries[0].code;
  }

  // Prepare adjacent countries (all countries except the first one)
  const adjacentCountriesArray = competition.countries?.slice(1) || [];
  const adjacentCountry1 = adjacentCountriesArray[0]?.code || '';
  const adjacentCountry2 = adjacentCountriesArray[1]?.code || '';

  // Fetch adjacent countries lists if needed. Sin país principal la lista
  // del primer nivel no se toca, y sin adyacente tampoco la del segundo
  const vecinos1 = mainCountryCode ? await leeVecinos(mainCountryCode) : null;
  const vecinos2 = adjacentCountry1
    ? vecinosDelSegundoNivel(
        vecinos1 ?? [],
        await leeVecinos(adjacentCountry1),
        mainCountryCode,
        adjacentCountry1,
      )
    : null;

  // Fetch golf courses for this competition
  let golfCoursesData = [];
  try {
    const coursesResult =
      await getCompetitionGolfCoursesUseCase.execute(competitionId);

    // Map the result to the format expected by formData
    if (Array.isArray(coursesResult)) {
      golfCoursesData = aCamposDeLaCompeticion(coursesResult).map((campo) => ({
        countryCode: campo.countryCode || competition.main_country,
        course: {
          id: campo.id,
          name: campo.name,
          approvalStatus: campo.approvalStatus,
        },
      }));
    }
  } catch (error) {
    registraElFallo(
      'CreateCompetition.error-loading-golf-courses',
      'Error loading golf courses:',
      error,
    );
  }

  return {
    competition,
    editable: true,
    soloFechas,
    mainCountryCode,
    adjacentCountry1,
    adjacentCountry2,
    vecinos1,
    vecinos2,
    golfCoursesData,
  };
};

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
  // Cerrada por el plazo de inscripción: solo se cambian las fechas, y el
  // servidor la reabre si el plazo nuevo queda por delante (RyderCupAm #865)
  const [soloFechas, setSoloFechas] = useState(false);
  // Lo que no vale de las fechas nuevas, junto a ellas. Un objeto y no su texto:
  // el mismo aviso repetido tiene que volver a traerse a la vista
  const [errorDeLasFechas, setErrorDeLasFechas] = useState(null);
  const avisoDeLasFechas = useRef(null);
  // En el móvil se guarda desde abajo y el aviso queda arriba: a la vista y con
  // el foco, como el aviso general (FE #731)
  useEffect(() => {
    if (!errorDeLasFechas) return;
    avisoDeLasFechas.current?.scrollIntoView({ block: 'center' });
    avisoDeLasFechas.current?.focus({ preventScroll: true });
  }, [errorDeLasFechas]);
  // El género del organizador, que juega: solo al crear y solo si le falta (#710)
  const generoParaApuntarse = useGeneroParaApuntarse();
  const [genero, setGenero] = useState('');
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
    // En el formulario también: la validación, los pasos y la petición lo leen
    // de ahí, igual al crear que al editar (FE #791)
    setFormData((prev) => ({ ...prev, tournamentType: tipo }));
    globalThis.scrollTo?.(0, 0);
  };

  // Igual que el tipo: al elegir, el formulario empieza por arriba
  const eligeElModo = (modo) => {
    setFormData((prev) => ({ ...prev, setupMode: modo }));
    globalThis.scrollTo?.(0, 0);
  };
  const [message, setMessage] = useState({ type: '', text: '' });
  // Sin el correo verificado no se crea una competición (B-17): el aviso arriba, y el
  // envío no llama a la API; también si la API lo dice
  const [faltaVerificar, setFaltaVerificar] = useState(false);
  const { sinVerificar: copiaSinVerificar, confirma: confirmaVerificado } =
    useCorreoVerificado();
  // El aviso del nombre, junto a su campo: la clave de `create.errors`
  const [errorDelNombre, setErrorDelNombre] = useState(null);
  const campoDelNombre = useRef(null);

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
    [adjacentCountries1, i18n.language],
  );
  const sortedAdjacentCountries2 = useMemo(
    () => sortCountriesByName(adjacentCountries2, i18n.language),
    [adjacentCountries2, i18n.language],
  );

  // Form data
  const [formData, setFormData] = useState(
    formularioInicial(nombresPorDefectoDeLosEquipos(t)),
  );
  // Solo una Ryder tiene equipos y modo de montaje (FE #791). Sin tipo todavía,
  // la de siempre: así se cargaba y se creaba todo antes del tipo
  const conEquipos = tieneEquipos(formData.tournamentType);
  const pideGenero = hayQuePedirElGenero({
    isEditMode,
    falta: generoParaApuntarse.falta,
    conEquipos,
    organizerPlays: formData.organizerPlays,
  });

  // El resumen del plegable no puede prometer un equipo que ya no está escrito
  // Vaciar el campo en edición no puede recortar el cupo de una competición con
  // gente ya aprobada: se conserva el que se cargó (`/code-review`)
  const cupoCargado = useRef(CUPO_POR_DEFECTO);
  // Al editar un stroke play: los ajustes y los días guardados. De ellos sale qué
  // ha cambiado (el PATCH lleva solo eso) y qué petición va primero (FE #824)
  const ajustesCargados = useRef(null);
  const diasCargados = useRef(null);
  // Cuántos hay ya dentro, al editar: el cupo no puede bajar de ahí (FE #662).
  // Con la competición de la que son: crear y editar montan este componente en
  // el mismo sitio, y al ir de editar una a crear otra se arrastraba el mínimo
  const [inscritosDe, setInscritosDe] = useState({ de: null, cuantos: 0 });
  const inscritos =
    competitionId && inscritosDe.de === competitionId ? inscritosDe.cuantos : 0;

  // El aviso se pinta arriba del todo y el botón vive abajo: en un teléfono se
  // pulsa «Crear» y no pasa nada visible. Hay que llevarlo a los ojos
  // (`/code-review`)
  const avisoRef = useRef(null);
  const faltaAlgoPlegado = faltaAlgoEnLoPlegado(formData);

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
      const uno = nombresEditados.current.teamOneName
        ? antes.teamOneName
        : porDefecto.uno;
      const dos = nombresEditados.current.teamTwoName
        ? antes.teamTwoName
        : porDefecto.dos;
      // Sin cambios, el MISMO objeto: uno nuevo vuelve a pintar, y si `t`
      // cambia en cada pintada el efecto no acaba nunca
      if (uno === antes.teamOneName && dos === antes.teamTwoName) return antes;
      return { ...antes, teamOneName: uno, teamTwoName: dos };
    });
  }, [t, i18n.language, isEditMode]);

  // Todos los países, una vez
  useCargaCancelableEffect(() => fetchCountriesUseCase.execute(), [], {
    alCargar: (data) => setAllCountries(aPaises(data)),
    alFallar: (error) => {
      registraElFallo(
        'CreateCompetition.error-fetching-countries',
        'Error fetching countries:',
        error,
      );
      setAllCountries([]);
    },
  });

  // Cuál es la última petición de vecinos de cada nivel: la que llegue después
  // de otra más nueva (se cambió de país antes de que respondiera) no pisa la
  // lista. También cuentan como más nuevas vaciar la lista y la carga de la
  // edición, que trae las suyas
  const vecinosPedidos = useRef({ 1: 0, 2: 0 });
  const olvidaLosVecinosPedidos = (...niveles) => {
    for (const nivel of niveles) vecinosPedidos.current[nivel] += 1;
  };

  /**
   * Load competition data when in edit mode
   *
   * Lo que llega se aplica con los `t`, idioma y países del momento en que
   * llega (eventos del efecto): cambiar de idioma no la vuelve a pedir.
   *
   * No usa `useCargaCancelableEffect`: su espera sale ya puesta en el mismo
   * pintado en que llegan los países, y aquí sale con el efecto, un pintado
   * después, como siempre
   */
  const aplicaLaEdicion = useEffectEvent((datos) => {
    const { competition } = datos;
    if (!datos.editable) {
      customToast.error(t('edit.notEditable'));
      navigate(`/competitions/${competitionId}`, { replace: true });
      return;
    }

    const formDataToSet = formularioDeLaEdicion(datos, {
      equipos: nombresPorDefectoDeLosEquipos(t),
      idioma: i18n.language,
      allCountries,
    });

    // Los vecinos de esta competición: lo que se pidiera antes ya no vale
    if (datos.vecinos1) {
      olvidaLosVecinosPedidos(1);
      setAdjacentCountries1(datos.vecinos1);
    }
    if (datos.vecinos2) {
      olvidaLosVecinosPedidos(2);
      setAdjacentCountries2(datos.vecinos2);
    }
    setSoloFechas(datos.soloFechas === true);
    // Lo que había guardado: vaciar el campo no puede recortarlo
    cupoCargado.current = formDataToSet.numberOfPlayers;
    ajustesCargados.current = competition.strokePlay ?? null;
    diasCargados.current = diasDelTorneo(
      competition.startDate,
      competition.endDate,
    );
    setInscritosDe({
      de: competitionId,
      cuantos: competition.enrolledCount || 0,
    });
    setFormData(formDataToSet);
  });
  const avisaDelFalloAlEditar = useEffectEvent((error) => {
    console.error('Error loading competition:', error);
    customToast.error(t('edit.errorLoading'));
    navigate('/competitions');
  });
  useEffect(() => {
    // Pasando de editar una a editar otra el formulario no se desmonta: lo que
    // llegue tarde de la anterior no redirige, ni avisa, ni pisa el formulario
    // ni los vecinos (CodeRabbit en la #722)
    let vigente = true;
    const loadCompetitionData = async () => {
      if (!competitionId || !allCountries.length) return;

      setLoadingCompetition(true);
      try {
        const datos = await leeLaCompeticionParaEditar(competitionId);
        if (vigente) aplicaLaEdicion(datos);
      } catch (error) {
        if (vigente) avisaDelFalloAlEditar(error);
      } finally {
        if (vigente) setLoadingCompetition(false);
      }
    };

    loadCompetitionData();
    return () => {
      vigente = false;
    };
  }, [competitionId, allCountries]);

  useEffect(() => {
    if (!message.text) return;
    // Instantáneo, no `smooth`: comprobado en Chrome, el suave no llega a
    // ejecutarse desde aquí y el aviso se quedaba fuera de pantalla
    avisoRef.current?.scrollIntoView({ block: 'center' });
    // Y el foco, para quien no lo ve: el botón está abajo y el aviso arriba
    // (FE #731). Sin volver a desplazar, que ya lo ha hecho la línea de arriba
    avisoRef.current?.focus({ preventScroll: true });
    // El mensaje entero y no su texto: el mismo error repetido es otro objeto
    // y tiene que volver a llevar el foco (revisión local de la FE #731)
  }, [message]);

  // Los vecinos para los selectores de país adyacente: el nivel 1 son los del
  // principal y el 2, los del tercer país. Solo se aplica la última petición
  // de cada nivel
  const fetchAdjacentCountries = async (countryId, level, context = {}) => {
    olvidaLosVecinosPedidos(level);
    const peticion = vecinosPedidos.current[level];
    const mappedData = await leeVecinos(countryId);
    if (peticion !== vecinosPedidos.current[level]) return;

    if (level === 1) {
      setAdjacentCountries1(mappedData);
    } else if (level === 2) {
      const {
        currentAdjacentCountries1 = [],
        mainCountryCode = null,
        adjacentCountry1Code = null,
      } = context;
      setAdjacentCountries2(
        vecinosDelSegundoNivel(
          currentAdjacentCountries1,
          mappedData,
          mainCountryCode,
          adjacentCountry1Code,
        ),
      );
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name in nombresEditados.current) nombresEditados.current[name] = true;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (message.text) setMessage({ type: '', text: '' });
    if (name === 'competitionName') setErrorDelNombre(null);

    if (name === 'playMode') {
      setFormData((prev) => ({
        ...prev,
        playMode: value,
      }));
    }
  };

  const handleCountrySelect = (country) => {
    setFormData((prev) => alElegirPais(prev, country));
    // Los vecinos del tercer país eran del principal anterior: si llegan tarde,
    // tampoco valen
    olvidaLosVecinosPedidos(2);
    setAdjacentCountries1([]);
    setAdjacentCountries2([]);
    fetchAdjacentCountries(country.code, 1);
  };

  // El autocompletado avisa con el código, o '' al vaciarlo
  const alCambiarElPais = (code) => {
    const selectedCountry = allCountries.find((c) => c.code === code);
    if (selectedCountry) {
      handleCountrySelect(selectedCountry);
    } else {
      setFormData(alVaciarPais);
    }
  };

  const handleAddAdjacentCountry1 = () => {
    if (formData.country) {
      setFormData((prev) => ({ ...prev, showAdjacentCountry1: true }));
    }
  };

  const handleAdjacentCountry1Change = (e) => {
    const countryId = e.target.value;
    setFormData((prev) => alCambiarAdyacente1(prev, countryId));
    // Los vecinos del tercer país eran del adyacente anterior: ni se enseñan
    // mientras llegan los del nuevo ni, si llegan tarde, valen
    olvidaLosVecinosPedidos(2);
    setAdjacentCountries2([]);
    if (countryId) {
      fetchAdjacentCountries(countryId, 2, {
        currentAdjacentCountries1: adjacentCountries1,
        mainCountryCode: formData.country?.code,
        adjacentCountry1Code: countryId,
      });
    }
  };

  const handleAddAdjacentCountry2 = () => {
    if (formData.adjacentCountry1) {
      setFormData((prev) => ({
        ...prev,
        showAdjacentCountry2: true,
      }));
    }
  };

  const handleRemoveAdjacentCountry1 = () => {
    setFormData(alQuitarAdyacente1);
    olvidaLosVecinosPedidos(2);
    setAdjacentCountries2([]);
  };

  const handleRemoveAdjacentCountry2 = () => {
    setFormData(alQuitarAdyacente2);
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
      Boolean(course?.id) &&
      formData.golfCourses.some((gc) => gc.course?.id === course.id);
    if (yaEsta) {
      customToast.info(t('create.courseAlreadyAdded'));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      golfCourses: [...prev.golfCourses, { countryCode, course }],
    }));
  };

  const handleRemoveGolfCourse = (index) => {
    setFormData((prev) => ({
      ...prev,
      golfCourses: prev.golfCourses.filter((_, i) => i !== index),
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

  const enElIdioma = { t, idioma: i18n.language };
  const sesionesQueQuedanFuera = (error) => sesionesFuera(error, enElIdioma);
  const motivoDelFalloAlEditar = (error) => motivoAlEditar(error, enElIdioma);

  // El aviso del nombre, y el campo a la vista y con el foco: el botón queda
  // abajo y en un teléfono no se vería qué falló (como el aviso de arriba)
  const senalaElNombre = (clave) => {
    setErrorDelNombre(clave);
    campoDelNombre.current?.scrollIntoView?.({ block: 'center' });
    campoDelNombre.current?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    if (!isEditMode) {
      // Solo se espera si la copia dice que no: verificado, sigue en el acto
      const verificado = copiaSinVerificar ? await confirmaVerificado() : true;
      // Otro toque mientras se pregunta: no cuenta
      if (verificado === null) return;
      setFaltaVerificar(!verificado);
      if (!verificado) {
        globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    if (soloFechas) {
      const fallo = errorDeLasFechasNuevas(formData, { conEquipos, t });
      setErrorDeLasFechas(fallo ? { texto: fallo } : null);
      if (fallo) return;
      await crear(null);
      return;
    }
    // UI Validation
    // Los campos de golf solo se piden al crear: al editar los gestiona la ficha
    const validationError = validateCompetitionForm(formData, {
      exigirCampos: !isEditMode,
      inscritos,
    });
    if (validationError && ERRORES_DEL_NOMBRE.has(validationError.key)) {
      senalaElNombre(validationError.key);
      return;
    }
    if (validationError) {
      const paises =
        validationError.key === 'golfCoursesRequired'
          ? validationError.missingCourseCountryCodes
              .map((code) => {
                const country =
                  allCountries.find((c) => c.code === code) ||
                  adjacentCountries1.find((c) => c.code === code) ||
                  adjacentCountries2.find((c) => c.code === code);
                return formatCountryName(country, i18n.language);
              })
              .join(', ')
          : undefined;
      setMessage({
        type: 'error',
        text: textoDelAvisoDeValidacion(validationError, { t, paises }),
      });
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
    let generoGuardado = false;
    // Solo el 409 de la propia competición es «ese nombre ya lo tienes»: el del
    // perfil o el de los ajustes no tienen nada que ver con él (`/code-review`)
    let enLaCompeticion = false;
    // El nombre ya lo tiene otra: un 409 de lo general y sin código. Con código
    // (la sala de draft abierta, por ejemplo) es otra cosa (15 nov 2026)
    const esElNombreYaUsado = (error) =>
      enLaCompeticion && error?.status === 409 && !error?.errorCode;

    try {
      const payload = cargaDeLaCompeticion(formData, {
        conEquipos,
        isEditMode,
        tipoElegido,
        cupoCargado: cupoCargado.current,
        diasDeApertura,
      });

      if (isEditMode) {
        // EDIT MODE: lo general y, en un stroke play, los ajustes que cambien.
        // Son dos peticiones: si la segunda falla, la primera ya está guardada
        // y hay que decir qué se guardó y qué no, sin salir (FE #824)
        const cambios =
          !conEquipos && ajustesCargados.current
            ? cambiosDeAjustes(ajustesCargados.current, formData.strokePlay)
            : null;
        const guardaLoGeneral = () => {
          enLaCompeticion = true;
          return updateCompetitionUseCase.execute(competitionId, payload);
        };
        const guardaLosAjustes = async () => {
          enLaCompeticion = false;
          // Lo guardado pasa a ser la referencia: reintentar no los reenvía
          ajustesCargados.current =
            await updateStrokePlaySettingsUseCase.execute(
              competitionId,
              cambios,
            );
        };
        const ajustesPrimero =
          cambios && primeroLosAjustes(cambios, diasCargados.current);
        await (ajustesPrimero ? guardaLosAjustes : guardaLoGeneral)();
        if (cambios) {
          try {
            await (ajustesPrimero ? guardaLoGeneral : guardaLosAjustes)();
          } catch (error) {
            registraElFallo(
              'CreateCompetition.updating-competition-second-request',
              'Error updating competition (second request):',
              error,
            );
            // Lo general fue segundo y el nombre ya lo tiene otra: junto al
            // campo, como si fuera la primera (revisión de la FE-B). Los
            // ajustes ya quedaron guardados y al reintentar no se reenvían
            // Solo el 409 sin código es el del nombre (15 nov 2026)
            if (esElNombreYaUsado(error)) {
              senalaElNombre('nameTaken');
              return;
            }
            // El motivo como en cualquier otro fallo: las sesiones que se quedan
            // fuera, con sus días, antes que el texto en bruto (revisor); con un
            // código, su texto o el genérico
            const texto = t(
              ajustesPrimero
                ? 'edit.generalNotSaved'
                : 'edit.strokePlayNotSaved',
              { motivo: motivoDelFalloAlEditar(error) },
            );
            customToast.error(texto);
            setMessage({ type: 'error', text: texto });
            return;
          }
        }

        customToast.success(t('edit.success'));

        // Navigate to competition detail
        navigationTimerRef.current = setTimeout(() => {
          navigate(`/competitions/${competitionId}`);
        }, 1000);
      } else {
        // Antes que la competición: sin él el servidor la rechaza (#710)
        if (pideGenero) {
          await generoParaApuntarse.guardar(genero);
          generoGuardado = true;
        }

        // CREATE MODE: Create new competition and attach its golf courses
        const golfCourses = camposParaElAlta(formData.golfCourses);
        enLaCompeticion = true;
        const {
          competition: createdCompetition,
          successCount,
          failedCourses,
        } = await createCompetitionWithGolfCoursesUseCase.execute(
          payload,
          golfCourses,
        );

        // Show appropriate message based on results
        if (failedCourses.length === 0) {
          customToast.success(t('create.success'));
        } else if (successCount > 0) {
          customToast.warning(
            t('create.partialSuccess', {
              success: successCount,
              failed: failedCourses.length,
              courses: failedCourses.join(', '),
            }),
          );
        } else {
          customToast.error(t('create.errorAddingCourses'));
        }

        // La agenda se propone ya, con las fechas que acaba de poner (FE #654):
        // parejas los primeros días e individuales el último, y se cambia en
        // la ficha. Solo al estilo Ryder —en manual lo decide todo él— y con
        // algún campo, que es de donde el servidor saca el de cada sesión.
        // Si falla, la competición ya está creada: la ficha enseñará la
        // agenda vacía con su aviso, y no se dice que falló el alta
        const propuesta = agendaPropuesta(formData.startDate, formData.endDate);
        if (
          formData.setupMode === 'RYDER_CUP' &&
          successCount > 0 &&
          propuesta
        ) {
          try {
            await configureScheduleUseCase.execute(
              createdCompetition.id,
              propuesta,
            );
          } catch (error) {
            registraElFallo(
              'CreateCompetition.no-se-ha-podido-proponer-la-agenda',
              'No se ha podido proponer la agenda:',
              error,
            );
          }
        }

        // Navigate to competition detail
        navigationTimerRef.current = setTimeout(() => {
          navigate(`/competitions/${createdCompetition.id}`);
        }, 1500);
      }
    } catch (error) {
      registraElFallo(
        isEditMode
          ? 'CreateCompetition.updating-competition'
          : 'CreateCompetition.creating-competition',
        `Error ${isEditMode ? 'updating' : 'creating'} competition:`,
        error,
      );
      // Con la sala de draft abierta no se mueven las fechas (15 nov 2026). Antes
      // que el 409 del nombre, que lo tomaría por un nombre ya usado
      if (isEditMode && error?.errorCode === 'DRAFT_IN_PROGRESS') {
        const texto = t('edit.datesDuringDraft');
        customToast.error(texto);
        setMessage({ type: 'error', text: texto });
        return;
      }
      // Ya tiene otra con ese nombre: junto al campo y en el idioma de la app,
      // no el texto del servidor (RyderCupAm#540)
      if (esElNombreYaUsado(error)) {
        senalaElNombre('nameTaken');
        return;
      }
      // El servidor dice que falta verificar (la copia del usuario estaba desfasada):
      // el aviso con su botón de reenviar, no el texto del servidor (B-17)
      if (error?.errorCode === 'EMAIL_NOT_VERIFIED') {
        setFaltaVerificar(true);
        globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
        return;
      }
      // Solo las fechas: el error del servidor junto a ellas, traducido por su
      // código si se conoce; si no, el genérico, nunca el texto en bruto
      if (soloFechas) {
        const texto = sesionesQueQuedanFuera(error) || t('edit.error');
        customToast.error(texto);
        setErrorDeLasFechas({ texto });
        return;
      }
      const texto =
        sesionesQueQuedanFuera(error) ||
        mensajeDelError(error, t(isEditMode ? 'edit.error' : 'create.error'));
      customToast.error(texto);
      setMessage({ type: 'error', text: texto });
    } finally {
      setIsSubmitting(false);
      // Se cierra tanto si salió bien como si falló: si falló, el aviso está en
      // el formulario, y dejarlo tapado por el modal lo esconde
      setPreguntandoApertura(false);
      // Al final, aunque crear falle: el género ya quedó guardado (#710)
      if (generoGuardado) generoParaApuntarse.refrescar();
    }
  };

  const paso = pasoDelAlta({
    isEditMode,
    tipoElegido,
    conEquipos,
    setupMode: formData.setupMode,
  });

  if (isLoading || loadingCompetition) {
    return (
      <FullScreenLoader
        texto={loadingCompetition ? t('edit.loading') : t('common:loading')}
      />
    );
  }

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
            {!isEditMode && (copiaSinVerificar || faltaVerificar) && (
              <div className="px-4">
                <AvisoVerificaParaLlegarAOtros correo={user?.email} />
              </div>
            )}

            {/* Page Title */}
            <div className="flex flex-wrap justify-between gap-3 p-4">
              <p
                data-testid="titulo-pantalla"
                className="hidden md:block text-gray-900 tracking-tight text-3xl md:text-[32px] font-bold leading-tight min-w-72"
              >
                {isEditMode
                  ? t('edit.title') || 'Edit Competition'
                  : t('create.title')}
              </p>
            </div>

            {/* Message Display */}
            {message.text && (
              <AvisoDelFormulario ref={avisoRef} message={message} />
            )}

            {paso === 'tipo' && (
              <div className="px-4">
                <CompetitionTypeChooser onSelect={eligeElTipo} />
              </div>
            )}

            {/* Y detrás del tipo, cuánto hace la app por su cuenta (FE #695).
                Editando no es un paso: la competición ya existe y el modo se
                cambia dentro del formulario, como el resto de su configuración */}
            {paso === 'modo' && (
              <div className="px-4">
                <SetupModeChooser onSelect={eligeElModo} />
              </div>
            )}

            {paso === 'formulario' && (
              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-6 px-4"
              >
                {/* Volver a elegir el tipo. Lo escrito se queda: `formData` no se
                  toca al cambiar de paso, que perder el formulario por mirar
                  los otros tipos es peor que no dejar mirarlos */}
                {!isEditMode && (
                  <button
                    type="button"
                    data-testid="volver-al-tipo"
                    onClick={() => {
                      setTipoElegido(null);
                      setFormData((prev) => ({ ...prev, setupMode: null }));
                    }}
                    className="self-start text-sm text-gray-600 hover:text-gray-900"
                  >
                    {t('create.type.back')}
                  </button>
                )}

                {/* Cerrada por el plazo, solo las fechas: se dice arriba */}
                {soloFechas && (
                  <p
                    data-testid="solo-las-fechas"
                    role="status"
                    className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                  >
                    {t('edit.onlyDates')}
                  </p>
                )}

                {/* El modo, a la vista y no dentro de «más opciones»: decide qué
                  pasos existen después, así que esconderlo sería esconder el
                  resto del camino (FE #695). Al crear ya viene elegido del paso
                  anterior; aquí se cambia */}
                {conEquipos && (
                  <SoloLectura activa={soloFechas}>
                    <div className="border border-gray-200 rounded-xl p-4">
                      <SetupModeChooser
                        value={formData.setupMode}
                        onSelect={eligeElModo}
                      />
                    </div>
                  </SoloLectura>
                )}

                {/* El organizador juega: su género, solo si le falta (#710) */}
                {pideGenero && (
                  <div className="border border-gray-200 rounded-xl p-4">
                    <SelectorDeGenero value={genero} onChange={setGenero} />
                  </div>
                )}

                <DatosBasicos
                  soloFechas={soloFechas}
                  isEditMode={isEditMode}
                  conEquipos={conEquipos}
                  formData={formData}
                  setFormData={setFormData}
                  onChange={handleInputChange}
                  errorDelNombre={errorDelNombre}
                  campoDelNombre={campoDelNombre}
                  errorDeLasFechas={errorDeLasFechas}
                  avisoDeLasFechas={avisoDeLasFechas}
                  paises={{
                    allCountries,
                    adjacentCountries1,
                    adjacentCountries2,
                    sortedAdjacentCountries1,
                    sortedAdjacentCountries2,
                    onElegirPais: alCambiarElPais,
                    onAnadirAdyacente1: handleAddAdjacentCountry1,
                    onCambiarAdyacente1: handleAdjacentCountry1Change,
                    onQuitarAdyacente1: handleRemoveAdjacentCountry1,
                    onAnadirAdyacente2: handleAddAdjacentCountry2,
                    onCambiarAdyacente2: handleInputChange,
                    onQuitarAdyacente2: handleRemoveAdjacentCountry2,
                  }}
                />

                {/* Section 4: Golf Courses - Hidden in edit mode */}
                {!isEditMode && (
                  <CamposDeLaCompeticion
                    formData={formData}
                    allCountries={allCountries}
                    adjacentCountries1={adjacentCountries1}
                    adjacentCountries2={adjacentCountries2}
                    onElegir={handleGolfCourseSelect}
                    onPedir={handleRequestNewCourse}
                    onQuitar={handleRemoveGolfCourse}
                  />
                )}

                <SoloLectura
                  activa={soloFechas}
                  className="flex flex-col gap-6"
                >
                  <FormatoDeLaCompeticion
                    playMode={formData.playMode}
                    onElegirModo={(mode) =>
                      setFormData((prev) => ({
                        ...prev,
                        playMode: mode,
                      }))
                    }
                    numberOfPlayers={formData.numberOfPlayers}
                    onChange={handleInputChange}
                    onBlurDelCupo={() =>
                      setFormData((prev) => ({
                        ...prev,
                        // Dejarlo en blanco no es «sin límite»: hay cupo igual, y
                        // callárselo es enterarse con el jugador 13 fuera
                        numberOfPlayers: cupoDeJugadores(
                          prev.numberOfPlayers,
                          cupoCargado.current,
                        ),
                      }))
                    }
                    inscritos={inscritos}
                  />

                  {!conEquipos && (
                    <AjustesDeStrokePlayDelAlta
                      formData={formData}
                      onCambio={(strokePlay) =>
                        setFormData((prev) => ({ ...prev, strokePlay }))
                      }
                    />
                  )}

                  <MasOpciones
                    abierto={masOpciones}
                    onAlternar={() => setMasOpciones((abierto) => !abierto)}
                    faltaAlgoPlegado={faltaAlgoPlegado}
                    conEquipos={conEquipos}
                    formData={formData}
                    onChange={handleInputChange}
                  />
                </SoloLectura>

                <BotonesDelFormulario
                  isEditMode={isEditMode}
                  isSubmitting={isSubmitting}
                  onCancelar={() => navigate('/competitions')}
                />
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
