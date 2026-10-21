import { useEffect } from 'react';
import { vigilaLaVueltaALaAplicacion } from '../services/sesionCompartida';

/**
 * Vuelve a preguntar por la sesión al volver a la aplicación o a la red
 * (hotfix 2.50.1), con un mínimo de un minuto y solo con sesión. Si ahora los
 * Términos están pendientes, `ProtectedRoute` lleva a aceptarlos. Se monta una
 * vez, en `App.jsx`: el porqué y lo que se cuida está en `sesionCompartida`.
 */
export const useRevalidacionDeLaSesion = () => {
  useEffect(() => vigilaLaVueltaALaAplicacion(), []);
};

export default useRevalidacionDeLaSesion;
