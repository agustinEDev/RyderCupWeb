import { useEffect, useRef, useState } from 'react';
import { nombresPorDefectoDeLosEquipos } from '../utils/nombresPorDefectoDeLosEquipos';
import { formularioInicial } from '../utils/formularioDeLaCompeticion';

/**
 * El formulario de crear o editar una competición, con los nombres de los
 * equipos en el idioma de la app mientras el organizador no escriba los suyos.
 *
 * @param {{t: Function, idioma: string, isEditMode: boolean}} opciones
 */
export const useFormularioDeLaCompeticion = ({ t, idioma, isEditMode }) => {
  // Solo en el primer render: después manda el efecto de los nombres
  const [formData, setFormData] = useState(() =>
    formularioInicial(nombresPorDefectoDeLosEquipos(t)),
  );

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
  }, [t, idioma, isEditMode]);

  // Lo escrito en un campo; si es el nombre de un equipo, ya es suyo
  const escribeElCampo = (name, value) => {
    if (name in nombresEditados.current) nombresEditados.current[name] = true;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Un valor elegido (no escrito): un botón, una casilla, los ajustes
  const cambia = (campo, valor) =>
    setFormData((prev) => ({ ...prev, [campo]: valor }));

  return { formData, setFormData, escribeElCampo, cambia };
};
