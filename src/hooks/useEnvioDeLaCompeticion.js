import { useRef, useState } from 'react';
import {
  createCompetitionWithGolfCoursesUseCase,
  configureScheduleUseCase,
  updateCompetitionUseCase,
  updateStrokePlaySettingsUseCase,
} from '../composition';
import { formatCountryName } from '../services/countries';
import { validateCompetitionForm } from '../utils/competitionFormValidation';
import { agendaPropuesta } from '../utils/agenda';
import {
  cambiosDeAjustes,
  primeroLosAjustes,
} from '../utils/ajustesDeStrokePlay';
import { mensajeDelError } from '../utils/mensajeDelError';
import { registraElFallo } from '../utils/registraElFallo';
import customToast from '../utils/toast';
import {
  ERRORES_JUNTO_AL_NOMBRE,
  ERRORES_DE_LAS_OPCIONES,
} from '../utils/formularioDeLaCompeticion';
import {
  cargaDeLaCompeticion,
  camposParaElAlta,
  errorDeLasFechasNuevas,
  sesionesQueQuedanFuera,
  motivoDelFalloAlEditar,
  textoDelAvisoDeValidacion,
} from '../utils/peticionDeLaCompeticion';

import { Visibility } from '../domain/value_objects/Visibility';
import { SetupMode } from '../domain/value_objects/SetupMode';

/**
 * El envío del formulario de competición: validar, crear o editar, y avisar de
 * lo que salga. Los manejadores se definen en cada render con los valores de
 * ese render, igual que cuando vivían en el cuerpo de la página; los refs se
 * leen solo dentro de ellos, al enviar, nunca al pintar.
 *
 * @param {object} opciones
 * @param {Function} opciones.t
 * @param {string} opciones.idioma
 * @param {{isEditMode: boolean, competitionId: ?string, formData: object,
 *   conEquipos: boolean, tipoElegido: ?string, pideGenero: boolean,
 *   genero: string, generoParaApuntarse: object}} opciones.formulario
 * @param {{soloFechas: boolean, inscritos: number, guardado: {cupo: Function,
 *   ajustes: Function, dias: Function, recuerdaLosAjustes: Function}}}
 *   opciones.edicion lo leído al editar
 * @param {{allCountries: Array, adjacentCountries1: Array,
 *   adjacentCountries2: Array}} opciones.paises
 * @param {{copiaSinVerificar: boolean, confirmaVerificado: Function}} opciones.correo
 * @param {{campoDelNombre: object, setErrorDeLasFechas: Function,
 *   setMasOpciones: Function}} opciones.avisos lo que también cambia la
 *   página: el aviso de las fechas (su efecto va el primero) y el plegable
 * @param {(ruta: string, ms: number) => void} opciones.navegaDentroDe
 * @returns {{handleSubmit: (e: Event) => Promise<void>,
 *   crear: (diasDeApertura: ?number) => Promise<void>}}
 */
export const useEnvioDeLaCompeticion = ({
  t,
  idioma,
  formulario,
  edicion,
  paises,
  correo,
  avisos,
  navegaDentroDe,
}) => {
  const {
    isEditMode,
    competitionId,
    formData,
    conEquipos,
    tipoElegido,
    pideGenero,
    genero,
    generoParaApuntarse,
  } = formulario;
  const { soloFechas, inscritos, guardado } = edicion;
  const { allCountries, adjacentCountries1, adjacentCountries2 } = paises;
  const { copiaSinVerificar, confirmaVerificado } = correo;
  const { campoDelNombre, setErrorDeLasFechas, setMasOpciones } = avisos;

  // Lo que solo cambia el envío. Enviando, el botón se deshabilita, y tras
  // guardar sigue así hasta ir a la ficha: si no, se podía crear otra igual
  const [isSubmitting, setIsSubmitting] = useState(false);
  // El candado del envío, leído en el acto: dos envíos en el mismo instante ven
  // aún el `isSubmitting` de antes y mandaban dos peticiones. `false` libre;
  // 'envio' desde que se pulsa hasta que falla (o, si sale bien, hasta ir a la
  // ficha); 'pregunta' mientras el modal de la apertura espera respuesta
  const candado = useRef(false);
  // Una pública pregunta antes cuándo abrir las inscripciones
  const [preguntandoApertura, setPreguntandoApertura] = useState(false);
  // El aviso general, arriba del todo
  const [message, setMessage] = useState({ type: '', text: '' });
  // Sin el correo verificado no se crea una competición (B-17): el aviso arriba, y el
  // envío no llama a la API; también si la API lo dice
  const [faltaVerificar, setFaltaVerificar] = useState(false);
  // El aviso del nombre, junto a su campo: la clave de `create.errors`
  const [errorDelNombre, setErrorDelNombre] = useState(null);

  const enElIdioma = { t, idioma };

  // El aviso del nombre, y el campo a la vista y con el foco: el botón queda
  // abajo y en un teléfono no se vería qué falló (como el aviso de arriba)
  const senalaElNombre = (clave) => {
    setErrorDelNombre(clave);
    campoDelNombre.current?.scrollIntoView?.({ block: 'center' });
    campoDelNombre.current?.focus();
  };

  // Un fallo que se dice dos veces: en un aviso flotante y arriba del todo
  const avisaDelError = (texto) => {
    customToast.error(texto);
    setMessage({ type: 'error', text: texto });
  };

  // Sin el correo verificado no se crea (B-17). `null` es otro toque mientras
  // se pregunta: no cuenta
  const sigueTrasVerificar = (verificado) => {
    if (verificado === null) return false;
    setFaltaVerificar(!verificado);
    if (!verificado) {
      globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
      return false;
    }
    return true;
  };

  // Los países sin campos, por su nombre en el idioma de quien mira
  const nombresDeLosPaises = (codigos) =>
    codigos
      .map((code) => {
        const country =
          allCountries.find((c) => c.code === code) ||
          adjacentCountries1.find((c) => c.code === code) ||
          adjacentCountries2.find((c) => c.code === code);
        return formatCountryName(country, idioma);
      })
      .join(', ');

  /**
   * Lo que el formulario no deja pasar, dicho donde se ve: el nombre junto a
   * su campo, lo demás arriba. Los campos de golf solo se piden al crear: al
   * editar los gestiona la ficha. Devuelve si se puede seguir.
   */
  const validaYAvisa = () => {
    const validationError = validateCompetitionForm(formData, {
      exigirCampos: !isEditMode,
      inscritos,
    });
    if (!validationError) return true;
    if (ERRORES_JUNTO_AL_NOMBRE.has(validationError.key)) {
      senalaElNombre(validationError.key);
      return false;
    }
    const paises =
      validationError.key === 'golfCoursesRequired'
        ? nombresDeLosPaises(validationError.missingCourseCountryCodes)
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
    return false;
  };

  // La segunda petición de la edición falló: la primera ya está guardada y se
  // dice qué se guardó y qué no, sin salir (FE #824)
  const avisaDelSegundoFallo = (error, ajustesPrimero, esElNombreYaUsado) => {
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
    avisaDelError(
      t(ajustesPrimero ? 'edit.generalNotSaved' : 'edit.strokePlayNotSaved', {
        motivo: motivoDelFalloAlEditar(error, enElIdioma),
      }),
    );
  };

  // EDIT MODE: lo general y, en un stroke play, los ajustes que cambien. Son
  // dos peticiones: si la segunda falla, la primera ya está guardada (FE #824)
  const guardaLaEdicion = async (payload, envio, esElNombreYaUsado) => {
    const cambios =
      !conEquipos && guardado.ajustes()
        ? cambiosDeAjustes(guardado.ajustes(), formData.strokePlay)
        : null;
    const guardaLoGeneral = () => {
      envio.enLaCompeticion = true;
      return updateCompetitionUseCase.execute(competitionId, payload);
    };
    const guardaLosAjustes = async () => {
      envio.enLaCompeticion = false;
      // Lo guardado pasa a ser la referencia: reintentar no los reenvía
      guardado.recuerdaLosAjustes(
        await updateStrokePlaySettingsUseCase.execute(competitionId, cambios),
      );
    };
    const ajustesPrimero =
      cambios && primeroLosAjustes(cambios, guardado.dias());
    await (ajustesPrimero ? guardaLosAjustes : guardaLoGeneral)();
    if (cambios) {
      try {
        await (ajustesPrimero ? guardaLoGeneral : guardaLosAjustes)();
      } catch (error) {
        avisaDelSegundoFallo(error, ajustesPrimero, esElNombreYaUsado);
        return false;
      }
    }

    customToast.success(t('edit.success'));

    // Navigate to competition detail
    navegaDentroDe(`/competitions/${competitionId}`, 1000);
    return true;
  };

  // Show appropriate message based on results
  const avisaDelAlta = (successCount, failedCourses) => {
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
  };

  // La agenda se propone ya, con las fechas que acaba de poner (FE #654):
  // parejas los primeros días e individuales el último, y se cambia en la
  // ficha. Solo al estilo Ryder —en manual lo decide todo él— y con algún
  // campo, que es de donde el servidor saca el de cada sesión. Si falla, la
  // competición ya está creada: la ficha enseñará la agenda vacía con su
  // aviso, y no se dice que falló el alta
  const proponeLaAgenda = async (createdCompetition, successCount) => {
    const propuesta = agendaPropuesta(formData.startDate, formData.endDate);
    if (
      formData.setupMode === SetupMode.RYDER_CUP &&
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
  };

  // CREATE MODE: Create new competition and attach its golf courses
  const creaLaCompeticion = async (payload, envio) => {
    // Antes que la competición: sin él el servidor la rechaza (#710)
    if (pideGenero) {
      await generoParaApuntarse.guardar(genero);
      envio.generoGuardado = true;
    }

    const golfCourses = camposParaElAlta(formData.golfCourses);
    envio.enLaCompeticion = true;
    const {
      competition: createdCompetition,
      successCount,
      failedCourses,
    } = await createCompetitionWithGolfCoursesUseCase.execute(
      payload,
      golfCourses,
    );

    avisaDelAlta(successCount, failedCourses);
    await proponeLaAgenda(createdCompetition, successCount);

    // Navigate to competition detail
    navegaDentroDe(`/competitions/${createdCompetition.id}`, 1500);
    return true;
  };

  const avisaDelFallo = (error, esElNombreYaUsado) => {
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
      avisaDelError(t('edit.datesDuringDraft'));
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
      const texto =
        sesionesQueQuedanFuera(error, enElIdioma) || t('edit.error');
      customToast.error(texto);
      setErrorDeLasFechas({ texto });
      return;
    }
    avisaDelError(
      sesionesQueQuedanFuera(error, enElIdioma) ||
        mensajeDelError(error, t(isEditMode ? 'edit.error' : 'create.error')),
    );
  };

  /**
   * Crea la competición con los días de apertura elegidos.
   *
   * `diasDeApertura` en `null` significa que no hay apertura programada, que es
   * como el backend entiende «ábrela ya» (RyderCupAM#332).
   */
  const crear = async (diasDeApertura) => {
    // Uno a la vez: dos «crear» del modal, o uno con otro envío, no lanzan dos
    if (candado.current === 'envio') return;
    candado.current = 'envio';
    await envia(diasDeApertura);
  };

  // El envío en sí, con el candado ya echado: lo suelta si no se guarda
  const envia = async (diasDeApertura) => {
    // El modal NO se cierra aquí: se queda con su botón deshabilitado mientras
    // la petición está en vuelo. Cerrándolo antes, el `isLoading` que recibe es
    // siempre falso y devuelve el formulario a la mano justo cuando no se puede
    // tocar. Se cierra al terminar, en el `finally`
    setIsSubmitting(true);
    // Solo el 409 de la propia competición es «ese nombre ya lo tienes»: el del
    // perfil o el de los ajustes no tienen nada que ver con él (`/code-review`)
    const envio = { generoGuardado: false, enLaCompeticion: false };
    // El nombre ya lo tiene otra: un 409 de lo general y sin código. Con código
    // (la sala de draft abierta, por ejemplo) es otra cosa (15 nov 2026)
    const esElNombreYaUsado = (error) =>
      envio.enLaCompeticion && error?.status === 409 && !error?.errorCode;

    // Guardado: el botón sigue deshabilitado hasta ir a la ficha
    let guardadaYa = false;
    try {
      const payload = cargaDeLaCompeticion(formData, {
        conEquipos,
        isEditMode,
        tipoElegido,
        cupoCargado: guardado.cupo(),
        diasDeApertura,
      });
      guardadaYa = isEditMode
        ? await guardaLaEdicion(payload, envio, esElNombreYaUsado)
        : await creaLaCompeticion(payload, envio);
    } catch (error) {
      avisaDelFallo(error, esElNombreYaUsado);
    } finally {
      // Si falló (también la segunda petición de la edición), se reintenta
      if (!guardadaYa) {
        candado.current = false;
        setIsSubmitting(false);
      }
      // Se cierra tanto si salió bien como si falló: si falló, el aviso está en
      // el formulario, y dejarlo tapado por el modal lo esconde
      setPreguntandoApertura(false);
      // Al final, aunque crear falle: el género ya quedó guardado (#710)
      if (envio.generoGuardado) generoParaApuntarse.refrescar();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Con uno en marcha (verificando, preguntando la apertura, en vuelo o ya
    // guardado camino de la ficha) no empieza otro. El candado se echa ANTES
    // de esperar nada, y se suelta en todo camino que no acabe en un envío
    if (candado.current) return;
    candado.current = 'envio';
    let enManosDelEnvio = false;
    try {
      setMessage({ type: '', text: '' });
      if (!isEditMode) {
        // Solo se espera si la copia dice que no: verificado, sigue en el acto
        const verificado = copiaSinVerificar
          ? await confirmaVerificado()
          : true;
        if (!sigueTrasVerificar(verificado)) return;
      }

      // Solo las fechas (15 nov 2026): se comprueban ellas, aquí mismo
      if (soloFechas) {
        const fallo = errorDeLasFechasNuevas(formData, { conEquipos, t });
        setErrorDeLasFechas(fallo ? { texto: fallo } : null);
        if (fallo) return;
        enManosDelEnvio = true;
        await envia(null);
        return;
      }
      if (!validaYAvisa()) return;

      // Una pública se publica al crearse, y eso es lo que hay que decir antes
      // de hacerlo. En una privada no hay nada que avisar: no la ve nadie y se
      // entra por invitación (FE #666). Al editar tampoco: ya existe. Mientras
      // pregunta, otro envío no la vuelve a pedir; el «crear» del modal sí pasa
      if (!isEditMode && formData.visibility === Visibility.PUBLIC) {
        candado.current = 'pregunta';
        enManosDelEnvio = true;
        setPreguntandoApertura(true);
        return;
      }

      enManosDelEnvio = true;
      await envia(null);
    } finally {
      if (!enManosDelEnvio) candado.current = false;
    }
  };

  // Cerrar la pregunta de la apertura sin enviar suelta el candado
  const cierraLaApertura = () => {
    if (candado.current === 'pregunta') candado.current = false;
    setPreguntandoApertura(false);
  };

  return {
    handleSubmit,
    crear,
    isSubmitting,
    preguntandoApertura,
    // Cerrar la pregunta de la apertura sin enviar
    cierraLaApertura,
    message,
    // Escribir en el formulario quita el aviso general
    borraElAviso: () => setMessage({ type: '', text: '' }),
    faltaVerificar,
    errorDelNombre,
    // Corregir el nombre quita su aviso
    borraElErrorDelNombre: () => setErrorDelNombre(null),
  };
};
