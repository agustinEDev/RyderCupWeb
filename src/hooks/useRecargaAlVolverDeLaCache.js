import { useEffect } from 'react';

/**
 * Una página que vuelve desde la caché del historial del navegador (bfcache,
 * casi siempre en Safari) se recarga (14 oct 2026, FE #865).
 *
 * Volvía tal cual, con su JavaScript congelado: tras salir con recarga se
 * quedaba en «Loading...» para siempre (la consulta de la sesión ya no
 * pregunta mientras la página se va), y si entretanto otra pestaña cerró la
 * sesión enseñaba los datos de la cuenta anterior. Recargar es barato: la
 * aplicación ya arranca sin conexión. Escucha desde que se monta y deja de
 * hacerlo al desmontarse (sin escuchadores acumulados con la recarga en caliente).
 */
export const useRecargaAlVolverDeLaCache = () => {
  useEffect(() => {
    const alVolver = (evento) => {
      if (evento.persisted) globalThis.location.reload();
    };
    globalThis.addEventListener('pageshow', alVolver);
    return () => globalThis.removeEventListener('pageshow', alVolver);
  }, []);
};
