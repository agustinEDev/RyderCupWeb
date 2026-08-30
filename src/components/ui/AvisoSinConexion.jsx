import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react';
import { useSinConexion } from '../../hooks/useSinConexion';

/**
 * Dice que no hay red, en toda la aplicación y mientras dure.
 *
 * Sin esto, quedarse sin cobertura se notaba solo por lo que NO pasaba: listas
 * vacías, buscadores que no traen nada y avisos de error donde no había error
 * ninguno. El jugador tenía que adivinar si le fallaba el móvil o la
 * aplicación.
 *
 * Solo aparece cuando el navegador afirma que no hay conexión, que es el
 * sentido en el que acierta. Que no salga NO significa que haya cobertura
 * —dos barras en el campo cuentan como estar conectado—, y por eso cada
 * pantalla sigue diciendo lo suyo cuando una petición se queda sin respuesta.
 */
const AvisoSinConexion = () => {
  const { t } = useTranslation('common');
  const sinConexion = useSinConexion();

  if (!sinConexion) return null;

  return (
    <div
      role="status"
      data-testid="aviso-sin-conexion"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-50 px-4 py-2 text-sm text-amber-900 border-b border-amber-200"
    >
      <WifiOff className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>{t('sinConexion.aviso')}</span>
    </div>
  );
};

export default AvisoSinConexion;
