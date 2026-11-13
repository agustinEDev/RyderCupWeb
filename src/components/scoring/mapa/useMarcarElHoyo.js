import { useEffect, useState } from 'react';

/**
 * Lo que hacen los botones de marcar el hoyo: «¿Estás en la salida?» (`responder`),
 * «Marcar el hoyo entero» tras el «No» (`marcarEntero`), «Marcar hoyo» tras
 * «Ahora no» (`empezarAMarcar`) y el propio «Ahora no» (`ahoraNo`). Con el foco
 * a donde toca cuando el botón pulsado se va de la pantalla.
 */
export const useMarcarElHoyo = (
  { enlaceEnteroRef, loQueSePideRef, salidaRecienTocadaRef, hacerLineaAhoraRef, alejarAhoraRef },
  { posicionBuena, greenConocido, preguntaPrimero, empezar },
  { setAvisoDeMarca, setMarca, setDesdeMi, setCodoPendiente, setTocado, setCodoSinTocar, setMedido },
) => {
  const [contestadoNo, setContestadoNo] = useState(0);
  const [pedidoEntero, setPedidoEntero] = useState(0);
  const hacerLinea = (desde, hasta) => hacerLineaAhoraRef.current?.(desde, hasta) ?? false;
  const alejarDesde = (salida) => alejarAhoraRef.current?.(salida);

  const responder = (enLaSalida) => {
    setAvisoDeMarca(null);
    // Contestar ya es empezar: lo que se ve no se rehace mientras se marca
    empezar();
    if (!enLaSalida) {
      // A mitad de hoyo, la distancia de ti al green ya (D1, D2); sin green,
      // primero se toca (D6)
      setContestadoNo((n) => n + 1);
      if (greenConocido) {
        setMarca({ fase: null, tee: null });
        setDesdeMi(true);
        setCodoPendiente(true);
      } else {
        setMarca({ fase: 'pidiendo', tee: null, soloGreen: true });
      }
      return;
    }
    const aqui = posicionBuena;
    if (!aqui) {
      // No te localizamos bien: la salida se toca (M4)
      setMarca({ fase: 'pidiendo', tee: null, malGps: true });
      return;
    }
    if (greenConocido) {
      // Si tu posición y ese green no hacen un hoyo, se avisa y se toca la salida
      if (!hacerLinea(aqui, greenConocido)) setMarca({ fase: 'pidiendo', tee: null });
      return;
    }
    setMarca({ fase: 'pidiendo', tee: aqui });
    alejarDesde(aqui);
  };

  // El hoyo entero: se toca la salida y el green, como lejos del campo; con el
  // green ya puesto, la salida basta (D8). La medida desde ti se va
  const marcarEntero = () => {
    setPedidoEntero((n) => n + 1);
    setDesdeMi(false);
    setTocado(null);
    setCodoSinTocar(false);
    setMedido(null);
    setMarca({ fase: 'pidiendo', tee: null });
  };

  // El «No» se va de la pantalla y con él el foco: pasa al enlace, para que el
  // lector de pantalla diga lo que hay (revisor, 18 oct). Al contestar, una
  // vez: no cada vez que el GPS va y viene (/code-review)
  useEffect(() => {
    if (contestadoNo) enlaceEnteroRef.current?.focus();
  }, [contestadoNo, enlaceEnteroRef]);
  // El enlace se va con el foco: pasa a lo que se pide (revisor, 18 oct)
  useEffect(() => {
    if (pedidoEntero) loQueSePideRef.current?.focus();
  }, [pedidoEntero, loQueSePideRef]);

  const ahoraNo = () => {
    salidaRecienTocadaRef.current = null;
    setMarca({ fase: 'pausado', tee: null });
  };

  const empezarAMarcar = () => {
    salidaRecienTocadaRef.current = null;
    setAvisoDeMarca(null);
    setTocado(null);
    setCodoSinTocar(false);
    setMedido(null);
    setDesdeMi(false);
    // Sin salida, otra vez la pregunta: si no, el «No» se perdía y el primer
    // toque se tomaba por la salida (revisión, 17 oct)
    setMarca({ fase: preguntaPrimero ? 'pregunta' : 'pidiendo', tee: null });
  };

  return { responder, marcarEntero, ahoraNo, empezarAMarcar };
};
