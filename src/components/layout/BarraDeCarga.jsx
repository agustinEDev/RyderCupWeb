import { useEffect, useState } from 'react';
import { useNavigation } from 'react-router';

/** Lo que tarda en salir: una espera más corta no se nota, y la barra parpadearía. */
export const ESPERA_ANTES_DE_LA_BARRA_MS = 150;

/**
 * La barra fina de arriba mientras la pantalla siguiente espera sus datos
 * (FE #647, fase 3; decidido el 2 nov 2026). Con `loader` se sigue viendo la
 * pantalla anterior hasta que llegan, y sin esto pulsar parecía no hacer nada.
 */
const BarraDeCarga = () => {
  const esperando = useNavigation().state !== 'idle';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!esperando) return undefined;
    const reloj = setTimeout(() => setVisible(true), ESPERA_ANTES_DE_LA_BARRA_MS);
    return () => {
      clearTimeout(reloj);
      setVisible(false);
    };
  }, [esperando]);

  if (!esperando || !visible) return null;
  return (
    <div
      data-testid="barra-de-carga"
      role="progressbar"
      aria-busy="true"
      className="fixed top-0 inset-x-0 z-[100] h-[3px] overflow-hidden pointer-events-none"
    >
      <div className="h-full w-1/3 bg-primary animate-[barra-de-carga_1s_ease-in-out_infinite]" />
    </div>
  );
};

export default BarraDeCarga;
