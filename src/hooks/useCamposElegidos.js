import { useRef, useState } from 'react';
import customToast from '../utils/toast';

/**
 * Los campos de golf que se eligen al crear una competición: añadir uno (sin
 * repetirlo), quitarlo y pedir uno nuevo, que entra solo en el país desde el
 * que se pidió.
 *
 * @param {{t: Function, formData: object, setFormData: Function}} opciones
 */
export const useCamposElegidos = ({ t, formData, setFormData }) => {
  // Golf Course Request Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestModalCountry, setRequestModalCountry] = useState(null);
  // Un campo sin id (recién pedido) no tiene con qué distinguir su fila: se le
  // da una clave del formulario al añadirlo, que nunca viaja en la petición
  const ultimaClave = useRef(0);

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
    const sinId = course?.id
      ? {}
      : { clave: `sin-id-${(ultimaClave.current += 1)}` };
    setFormData((prev) => ({
      ...prev,
      golfCourses: [...prev.golfCourses, { countryCode, course, ...sinId }],
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

  return {
    handleGolfCourseSelect,
    handleRemoveGolfCourse,
    handleRequestNewCourse,
    // Lo que necesita el modal de pedir un campo
    modalDePedirCampo: {
      isOpen: showRequestModal,
      onClose: handleRequestModalClose,
      onSuccess: handleRequestSuccess,
      countryCode: requestModalCountry,
    },
  };
};
