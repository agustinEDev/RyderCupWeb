import { useEffect, useRef, useState } from 'react';

/**
 * El aviso de error del asistente de partida rápida: uno a la vez, arriba.
 *
 * Se guarda por su clave (o el texto ya hecho de un fallo del servidor, o una
 * clave de `common` con `comun`): así se quita uno concreto sin comparar
 * textos traducidos, y cambia de idioma con la página.
 *
 * @returns {{
 *   error: {clave?: string, texto?: string, comun?: boolean}|null,
 *   setError: (clave: string|null) => void,
 *   quitaElAviso: (clave: string) => void,
 *   ponElAviso: (aviso: Object|null) => void,
 *   refDelAviso: Object,
 * }} `ponElAviso` pone el aviso tal cual (texto o `comun`); `refDelAviso` va
 *   en el recuadro del aviso
 */
export const useAvisoDelAsistente = () => {
  const [error, ponElAviso] = useState(null);
  // Un aviso nuevo cada vez, también si se repite: así vuelve a la vista (ver
  // el efecto de abajo)
  const setError = (clave) => ponElAviso(clave ? { clave } : null);
  const quitaElAviso = (clave) =>
    ponElAviso((e) => (e?.clave === clave ? null : e));
  // El aviso va arriba y el botón que lo provoca, abajo: en un móvil se
  // pintaba fuera de la vista y parecía que no pasaba nada
  const refDelAviso = useRef(null);
  useEffect(() => {
    if (error) refDelAviso.current?.scrollIntoView?.({ block: 'nearest' });
  }, [error]);
  return { error, setError, quitaElAviso, ponElAviso, refDelAviso };
};
