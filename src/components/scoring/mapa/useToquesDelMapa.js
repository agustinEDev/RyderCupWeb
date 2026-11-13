import { useLayoutEffect } from 'react';
import { distanciaEnMetros } from '../../../domain/services/distanciasAlGreen';
import { limitesDelHoyo, rumbo } from '../../../domain/services/geometriaDelHoyo';
import { aCodosDelPar, circuloAlrededor, conCodosDelPar, salidaGreenFueraDeLimites } from '../../../domain/services/hoyoMarcado';
import { DOBLE_TOQUE_MS, FUERA_DE_LA_SALIDA_M } from './geometriaDelMapa';

/**
 * Lo que leen los oyentes del mapa, que se montan una vez y verían el estado de
 * entonces: por ref, al día en cada render.
 *
 * - `alTocarRef`: el toque. Mientras se marca, marca; reportando, propone la
 *   salida y el green; si no, mide.
 * - `hacerLineaAhoraRef`: de la salida al green, con los codos de su par.
 * - `alejarAhoraRef`: se aleja (sin girar) la mitad que los metros de la
 *   tarjeta, para buscar el green (16 oct: antes, a los metros enteros, con un anillo).
 * - `ultimaLineaRef` y `alCerrarRef`: lo que pinta el `load` y lo que se envía al cerrar.
 */
export const useToquesDelMapa = (
  { ultimaLineaRef, alCerrarRef, antesDelReporteRef, hacerLineaAhoraRef, alejarAhoraRef, alTocarRef, mapaRef, ultimoToqueRef, salidaRecienTocadaRef },
  {
    t,
    par,
    metros,
    margen,
    datosDeLaLinea,
    reporte,
    edicion,
    recoge,
    onMuestra,
    referenciaDelCampo,
    fase,
    pidiendo,
    marca,
    marcandoSalida,
    greenConocido,
    hoyo,
    posicionEnElCampo,
    posicionBuena,
    desdeMi,
    salidaDelHoyo,
    empezar,
  },
  { setAvisoDeMarca, setEdicion, setConAyudaDeCodos, setMarca, setVista, setReporte, setGracias, setMedido, setDesdeMi, setCodoPendiente },
) => {
  useLayoutEffect(() => {
    const hacerLinea = (desde, hasta) => hacerLineaAhoraRef.current?.(desde, hasta) ?? false;
    const alejarDesde = (salida) => alejarAhoraRef.current?.(salida);
    ultimaLineaRef.current = datosDeLaLinea;
    // A mitad de un reporte, lo que se enviaría al cerrar es lo de antes de él
    alCerrarRef.current = { edicion: reporte ? antesDelReporteRef.current : edicion, recoge, onMuestra, campo: referenciaDelCampo };
    // De la salida al green, con los codos de su par puestos sobre la recta
    hacerLineaAhoraRef.current = (desde, hasta) => {
      if (salidaGreenFueraDeLimites(desde, hasta)) {
        setAvisoDeMarca(t('mapa.fueraDeLimites'));
        return false;
      }
      const nueva = conCodosDelPar([desde, hasta], par);
      setEdicion((e) => ({ linea: nueva, green: null, cambiada: true, version: e.version + 1 }));
      setConAyudaDeCodos(nueva.length > 2);
      setMarca({ fase: null, tee: null });
      // Marcado, el mapa se orienta como se juega (O5); lo pidió el jugador
      setVista({ tipo: 'hoyo', porElJugador: true });
      return true;
    };
    alejarAhoraRef.current = (salida) => {
      if (!metros) return;
      mapaRef.current?.fitBounds(limitesDelHoyo({ playLine: circuloAlrededor(salida, metros / 2) }), {
        bearing: mapaRef.current.getBearing(),
        padding: margen(),
      });
    };
    alTocarRef.current = (p) => {
      // Reportando, el mapa no mide: marca la salida y el green que se proponen
      if (reporte) {
        // El segundo toque de un doble toque no es el green (/code-review)
        const ahora = globalThis.performance.now();
        const dobleToque = ahora - ultimoToqueRef.current < DOBLE_TOQUE_MS;
        ultimoToqueRef.current = ahora;
        if (dobleToque) return;
        if (reporte.fase === 'salida') {
          setReporte({ ...reporte, fase: 'green', tee: p });
        } else if (reporte.fase === 'green') {
          if (salidaGreenFueraDeLimites(reporte.tee, p)) {
            setAvisoDeMarca(t('mapa.fueraDeLimites'));
            return;
          }
          setAvisoDeMarca(null);
          setEdicion((e) => ({ ...e, linea: conCodosDelPar([reporte.tee, p], par), green: null, version: e.version + 1 }));
          setReporte({ fase: 'lista', motivo: reporte.motivo });
        }
        return;
      }
      // Mientras se pregunta si estás en la salida, el mapa no marca ni mide
      if (fase === 'pregunta') return;
      if (pidiendo) {
        const ahora = globalThis.performance.now();
        if (ahora - ultimoToqueRef.current < DOBLE_TOQUE_MS) {
          // El segundo toque no marca, pero corta el alejamiento: se rehace (QA)
          if (salidaRecienTocadaRef.current) alejarDesde(salidaRecienTocadaRef.current);
          return;
        }
        ultimoToqueRef.current = ahora;
        salidaRecienTocadaRef.current = null;
        setAvisoDeMarca(null);
        empezar();
        // No estás en la salida: el green que tocas, solo (17 oct)
        if (marca.soloGreen) {
          // A más de lo que mide un hoyo de donde estás, no es el green de este
          // hoyo: será de cada jugador que venga después (revisión, 17 oct)
          if (posicionEnElCampo && salidaGreenFueraDeLimites(posicionEnElCampo, p) === 'lejos') {
            setAvisoDeMarca(t('mapa.fueraDeLimites'));
            return;
          }
          setEdicion((e) => ({ linea: null, green: p, cambiada: true, version: e.version + 1 }));
          setMarca({ fase: null, tee: null });
          // Con el green puesto, de ti a él (D6)
          setDesdeMi(true);
          setCodoPendiente(true);
          return;
        }
        if (marcandoSalida && !marca.tee) {
          // Con el green ya puesto, la salida basta: también el que se acaba de
          // tocar tras el «No», y la muestra sale completa (D8b, D8c)
          const greenYaPuesto = greenConocido ?? edicion.green;
          if (greenYaPuesto) {
            hacerLinea(p, greenYaPuesto);
            return;
          }
          setMarca((m) => ({ ...m, fase: 'pidiendo', tee: p }));
          salidaRecienTocadaRef.current = p;
          alejarDesde(p);
          return;
        }
        // Sobre la línea aprobada, su final (donde acaba el hoyo) es el green
        const aprobada = hoyo?.playLine ?? [];
        const desde = marcandoSalida ? [marca.tee] : aprobada.slice(0, Math.max(1, aprobada.length - 1));
        if (desde.length === 0 || salidaGreenFueraDeLimites(desde[0], p)) {
          setAvisoDeMarca(t('mapa.fueraDeLimites'));
          return;
        }
        // Con los codos de su par ya puestos, para llevarlos a la calle; una
        // línea de OSM con muchos puntos se queda con los de su par (QA, 16 oct)
        const reducida = aCodosDelPar([...desde, p], par);
        const nueva = conCodosDelPar(reducida, par);
        setEdicion((e) => ({ linea: nueva, green: null, cambiada: true, version: e.version + 1 }));
        // La ayuda, solo si se pusieron codos (no si la línea ya traía los suyos)
        setConAyudaDeCodos(nueva.length > reducida.length);
        setMarca({ fase: null, tee: null });
        setVista({ tipo: 'hoyo', porElJugador: true });
        return;
      }
      // El segundo de un doble toque no mide: si el primero marcó (revisor, 31
      // oct) o si midió, que el mapa ya se mueve hacia el punto y el segundo
      // caería en otro sitio (/code-review, 2 nov)
      const ahora = globalThis.performance.now();
      if (ahora - ultimoToqueRef.current < DOBLE_TOQUE_MS) return;
      ultimoToqueRef.current = ahora;
      setGracias(false);
      setMedido(p);
      // El mapa gira hacia el punto y os encuadra, contigo abajo (Agustín, 16
      // oct): con tu posición y en la salida. A mitad de hoyo ya va orientado, y
      // sin posición (o lejos) alejaría a kilómetros (T6, 19 oct)
      const enLaSalida = !salidaDelHoyo || distanciaEnMetros(posicionBuena ?? salidaDelHoyo, salidaDelHoyo) <= FUERA_DE_LA_SALIDA_M;
      if (posicionBuena && !desdeMi && enLaSalida) {
        mapaRef.current?.fitBounds(limitesDelHoyo({ playLine: [posicionBuena, p] }), {
          bearing: rumbo(posicionBuena, p),
          padding: margen(),
          maxZoom: 18,
        });
      }
    };
  });
};
