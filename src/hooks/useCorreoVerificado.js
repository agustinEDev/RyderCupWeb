import { useCallback, useRef } from 'react';
import { useAuth } from './useAuth';

/**
 * Si el usuario tiene el correo verificado, para lo que llega a otros (B-17 de la
 * auditoría de la fase 6): crear competiciones, pedir amistad, invitar.
 *
 * La sesión se lee una vez por carga de página: quien verificó desde el enlace del correo
 * (que se abre en el navegador) y vuelve a la app sin recargar seguiría «sin verificar».
 * Por eso, cuando la copia dice que no, `confirma` vuelve a preguntar al servidor antes de
 * decidir; si dice que sí, no hace falta (el servidor lo comprueba igual).
 *
 * Mientras se vuelve a preguntar, otro toque devuelve `null`: no cuenta (ni pasa ni
 * enseña el aviso), y así un doble toque no lanza dos envíos (CodeRabbit). Sin usuario en
 * la respuesta, no vale: como un error.
 *
 * @returns {{ sinVerificar: boolean, confirma: () => Promise<boolean|null> }}
 */
export const useCorreoVerificado = () => {
  const { user, refetch } = useAuth();
  const sinVerificar = user?.email_verified === false;

  const preguntando = useRef(false);

  const confirma = useCallback(async () => {
    if (!sinVerificar) return true;
    if (preguntando.current) return null;
    preguntando.current = true;
    try {
      const fresco = await refetch();
      return Boolean(fresco) && fresco.email_verified !== false;
    } catch {
      return false;
    } finally {
      preguntando.current = false;
    }
  }, [sinVerificar, refetch]);

  return { sinVerificar, confirma };
};
