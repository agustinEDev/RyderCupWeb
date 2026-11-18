import { useState, useRef } from 'react';
import { tieneEquipos } from '../domain/value_objects/TournamentType';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useFormularioDeLaCompeticion } from '../hooks/useFormularioDeLaCompeticion';
import { usePaisesDeLaCompeticion } from '../hooks/usePaisesDeLaCompeticion';
import { useEdicionDeLaCompeticion } from '../hooks/useEdicionDeLaCompeticion';
import { useLlevaALaVista } from '../hooks/useLlevaALaVista';
import { useNavegacionDiferida } from '../hooks/useNavegacionDiferida';
import customToast from '../utils/toast';
import { crearEnvio } from '../components/competition/create/envioDeLaCompeticion';
import HeaderAuth from '../components/layout/HeaderAuth';
import { useAuth } from '../hooks/useAuth';
import { useCorreoVerificado } from '../hooks/useCorreoVerificado';
import AvisoVerificaParaLlegarAOtros from '../components/auth/AvisoVerificaParaLlegarAOtros';
import { useGeneroParaApuntarse } from '../hooks/useGeneroParaApuntarse';
import SelectorDeGenero from '../components/profile/SelectorDeGenero';
import { createGolfCourseRequestUseCase } from '../composition';
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
import FullScreenLoader from '../components/ui/FullScreenLoader';
import CompetitionTypeChooser from '../components/competition/CompetitionTypeChooser';
import SetupModeChooser from '../components/competition/SetupModeChooser';
import { cupoDeJugadores } from '../utils/cupoDeJugadores';
import { PANTALLA_MENOS_BARRA_INFERIOR } from '../utils/barraInferior';
import {
  faltaAlgoPlegado as faltaAlgoEnLoPlegado,
  pideGenero as hayQuePedirElGenero,
  pasoDelAlta,
} from '../utils/formularioDeLaCompeticion';

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
  useLlevaALaVista(avisoDeLasFechas, errorDeLasFechas);
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

  // A la ficha tras guardar, salvo que ya se haya salido de aquí
  const navegaDentroDe = useNavegacionDiferida(navigate);

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

  useLlevaALaVista(avisoRef, message, Boolean(message.text));

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

  // El envío, con los valores de este render: se arma al usarlo, en el evento,
  // que es donde puede leer los refs
  const envio = () =>
    crearEnvio({
      t,
      idioma: i18n.language,
      isEditMode,
      competitionId,
      formData,
      conEquipos,
      tipoElegido,
      soloFechas,
      inscritos,
      pideGenero,
      genero,
      generoParaApuntarse,
      copiaSinVerificar,
      confirmaVerificado,
      allCountries,
      adjacentCountries1,
      adjacentCountries2,
      cupoCargado,
      ajustesCargados,
      diasCargados,
      navegaDentroDe,
      campoDelNombre,
      setMessage,
      setErrorDelNombre,
      setFaltaVerificar,
      setErrorDeLasFechas,
      setMasOpciones,
      setPreguntandoApertura,
      setIsSubmitting,
    });
  const handleSubmit = (e) => envio().handleSubmit(e);
  const crear = (diasDeApertura) => envio().crear(diasDeApertura);

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
