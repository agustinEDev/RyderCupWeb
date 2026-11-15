import { useCallback } from 'react';
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
 * @returns {{ sinVerificar: boolean, confirma: () => Promise<boolean> }}
 */
export const useCorreoVerificado = () => {
  const { user, refetch } = useAuth();
  const sinVerificar = user?.email_verified === false;

  const confirma = useCallback(async () => {
    if (!sinVerificar) return true;
    try {
      const fresco = await refetch();
      return fresco?.email_verified !== false;
    } catch {
      return false;
    }
  }, [sinVerificar, refetch]);

  return { sinVerificar, confirma };
};
