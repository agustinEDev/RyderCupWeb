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
 * para esta pantalla. Lo que se toca aquí es de ESTA partida: al pasar a otra
 * sin salir de la pantalla, cuenta lo de la otra.
 */
export function useDistanciasActivadas(partida) {
  const [aqui, setAqui] = useState({ partida: null, activadas: null });
  const tocadoAqui = aqui.partida === partida ? aqui.activadas : null;
  const activadas = tocadoAqui ?? (Boolean(partida) && leer(partida));

  const activar = useCallback(() => {
    setAqui({ partida, activadas: true });
    try {
      if (partida) globalThis.localStorage.setItem(clave(partida), '1');
    } catch {
      // Sin almacenamiento: se queda activada solo aquí
    }
  }, [partida]);

  // Con la ubicación no permitida, para quitar el aviso de todos los hoyos
  const ocultar = useCallback(() => {
    setAqui({ partida, activadas: false });
    try {
      if (partida) globalThis.localStorage.removeItem(clave(partida));
    } catch {
      // Sin almacenamiento: se queda oculta solo aquí
    }
  }, [partida]);

  return { activadas, activar, ocultar };
}
