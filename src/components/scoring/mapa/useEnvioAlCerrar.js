import { useEffect, useRef } from 'react';
import { muestraDeLaEdicion } from './geometriaDelMapa';

/**
 * Al cerrar: si la hizo o la movió, y el hoyo aún recoge, la línea va como
 * muestra; si no es válida (green imposible, más codos de los que se guardan),
 * no. Nada de esto se le dice al jugador.
 *
 * `alCerrarRef` lleva lo último (`{ edicion, recoge, onMuestra, campo }`): se
 * envía al desmontar, se cierre como se cierre (botón, Escape o «atrás»).
 */
export const useEnvioAlCerrar = (alCerrarRef) => {
  // Lo ya enviado de esta apertura: la versión. Toda la apertura es una sola
  // muestra con un solo id: si la app se oculta, sale ya; si luego se toca, al
  // cerrar sale otra vez con el mismo id (en el móvil sustituye a la de la cola;
  // en el servidor, si ya llegó, cuenta una)
  const enviadaRef = useRef({ version: null, id: null });
  useEffect(() => {
    const enviarSiHace = () => {
      const {
        edicion: { linea: ultima, green: soloGreen, cambiada, version },
        recoge: recogiendo,
        onMuestra: enviar,
        campo,
      } = alCerrarRef.current;
      if (!cambiada || !recogiendo || !enviar) return;
      // Una línea que vale, o (17 oct) un green solo que no esté lejos del campo
      const muestra = muestraDeLaEdicion(ultima, soloGreen, campo);
      if (!muestra) return;
      if (enviadaRef.current.version === version) return;
      enviadaRef.current = {
        version,
        id: enviadaRef.current.id ?? globalThis.crypto.randomUUID(),
      };
      enviar({ id: enviadaRef.current.id, ...muestra });
    };
    // Si se cierra la app (o el móvil la mata) con el mapa abierto, lo hecho no
    // se pierde: sale al ocultarse (Agustín, 16 oct)
    const alOcultarse = () => {
      if (globalThis.document.visibilityState === 'hidden') enviarSiHace();
    };
    globalThis.document.addEventListener('visibilitychange', alOcultarse);
    return () => {
      globalThis.document.removeEventListener('visibilitychange', alOcultarse);
      enviarSiHace();
    };
  }, [alCerrarRef]);
};
