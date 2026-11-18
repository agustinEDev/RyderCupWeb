import { useState, useEffect, useRef } from 'react';
import { tieneEquipos } from '../domain/value_objects/TournamentType';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useFormularioDeLaCompeticion } from '../hooks/useFormularioDeLaCompeticion';
import { usePaisesDeLaCompeticion } from '../hooks/usePaisesDeLaCompeticion';
import { useEdicionDeLaCompeticion } from '../hooks/useEdicionDeLaCompeticion';
import { agendaPropuesta } from '../utils/agenda';
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
  createGolfCourseRequestUseCase,
} from '../composition';
import { formatCountryName } from '../services/countries';
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
  cambiosDeAjustes,
  primeroLosAjustes,
} from '../utils/ajustesDeStrokePlay';
import { cupoDeJugadores } from '../utils/cupoDeJugadores';
import { PANTALLA_MENOS_BARRA_INFERIOR } from '../utils/barraInferior';
import { mensajeDelError } from '../utils/mensajeDelError';
import { registraElFallo } from '../utils/registraElFallo';
import {
  ERRORES_DEL_NOMBRE,
  ERRORES_DE_LAS_OPCIONES,
  faltaAlgoPlegado as faltaAlgoEnLoPlegado,
  pideGenero as hayQuePedirElGenero,
  pasoDelAlta,
} from '../utils/formularioDeLaCompeticion';
import {
  cargaDeLaCompeticion,
  camposParaElAlta,
  errorDeLasFechasNuevas,
  sesionesQueQuedanFuera as sesionesFuera,
  motivoDelFalloAlEditar as motivoAlEditar,
  textoDelAvisoDeValidacion,
} from '../utils/peticionDeLaCompeticion';

const CreateCompetition = () => {
  const navigate = useNavigate();
  const { id: competitionId } = useParams();
  const { t, i18n } = useTranslation('competitions');
  const { user, loading: isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preguntandoApertura, setPreguntandoApertura] = useState(false);
  // Editar o crear lo dice la URL, y se sabe desde el primer render. Vivía en un
  // estado que se encendía DENTRO del efecto que carga la competición, y ese
  // efecto sale antes si los países aún no han llegado: sin cobertura la
  // pantalla de edición se quedaba con el modo de crear —enseñando el selector
  // de tipo— y al enviar creaba una competición nueva en vez de editar la que
  // se había abierto (`/code-review`)
  const isEditMode = Boolean(competitionId);
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

  const { formData, setFormData, escribeElCampo } =
    useFormularioDeLaCompeticion({ t, idioma: i18n.language, isEditMode });
  const {
    allCountries,
    adjacentCountries1,
    adjacentCountries2,
    setAdjacentCountries1,
    setAdjacentCountries2,
    olvidaLosVecinosPedidos,
    selectores,
  } = usePaisesDeLaCompeticion({
    idioma: i18n.language,
    formData,
    setFormData,
  });
  const {
    loadingCompetition,
    soloFechas,
    inscritos,
    cupoCargado,
    ajustesCargados,
    diasCargados,
  } = useEdicionDeLaCompeticion({
    competitionId,
    allCountries,
    t,
    idioma: i18n.language,
    navigate,
    setFormData,
    setAdjacentCountries1,
    setAdjacentCountries2,
    olvidaLosVecinosPedidos,
  });

  // Solo una Ryder tiene equipos y modo de montaje (FE #791). Sin tipo todavía,
  // la de siempre: así se cargaba y se creaba todo antes del tipo
  const conEquipos = tieneEquipos(formData.tournamentType);
  const pideGenero = hayQuePedirElGenero({
    isEditMode,
    falta: generoParaApuntarse.falta,
    conEquipos,
    organizerPlays: formData.organizerPlays,
  });

  // El aviso se pinta arriba del todo y el botón vive abajo: en un teléfono se
  // pulsa «Crear» y no pasa nada visible. Hay que llevarlo a los ojos
  // (`/code-review`)
  const avisoRef = useRef(null);
  const faltaAlgoPlegado = faltaAlgoEnLoPlegado(formData);

  // Golf Course Request Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestModalCountry, setRequestModalCountry] = useState(null);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    escribeElCampo(name, value);

    if (message.text) setMessage({ type: '', text: '' });
    if (name === 'competitionName') setErrorDelNombre(null);

    if (name === 'playMode') {
      setFormData((prev) => ({
        ...prev,
        playMode: value,
      }));
    }
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
                    ...selectores,
                    onCambiarAdyacente2: handleInputChange,
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
