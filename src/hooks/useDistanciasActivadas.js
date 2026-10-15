import { useCallback, useState } from 'react';

const clave = (partida) => `distanciasActivadas:${partida}`;

const leer = (partida) => {
  try {
    return globalThis.localStorage.getItem(clave(partida)) === '1';
  } catch {
    return false;
  }
};

/**
 * Si el jugador activó las distancias en esta partida (G3): se recuerda para no
 * tener que tocar otra vez al volver a la anotación. Sin almacenamiento, vale
 * para esta pantalla.
 */
export function useDistanciasActivadas(partida) {
  const [activadasAqui, setActivadasAqui] = useState(false);
  const activadas = activadasAqui || (Boolean(partida) && leer(partida));

  const activar = useCallback(() => {
    setActivadasAqui(true);
    try {
      if (partida) globalThis.localStorage.setItem(clave(partida), '1');
    } catch {
      // Sin almacenamiento: se queda activada solo aquí
    }
  }, [partida]);

  return { activadas, activar };
}
