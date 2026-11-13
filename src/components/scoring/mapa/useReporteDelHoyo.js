import { useEffect, useRef } from 'react';
import { salidaGreenFueraDeLimites } from '../../../domain/services/hoyoMarcado';

/**
 * Lo que hacen los botones del reporte (entrega 7, 18 oct): «⋮» abre el menú
 * (`abrirElMenu`), un motivo empieza la propuesta (`elegirMotivo`), «Cancelar» o
 * Escape la dejan (`acabarElReporte`) y «Enviar» la manda con `onReporte`
 * (`enviarReporte`). Con el foco al primer motivo al abrir el menú, y a «⋮» al
 * acabar.
 *
 * `antesDelReporteRef` guarda la edición de antes: es lo que se envía si el mapa
 * se cierra a mitad (la propuesta no es una muestra) y lo que vuelve al acabar.
 */
export const useReporteDelHoyo = (
  { antesDelReporteRef, primerMotivoRef, botonDeReportarRef },
  {
    t,
    reporte,
    edicion,
    linea,
    tocado,
    codoSinTocar,
    desdeMi,
    onReporte,
    empezar,
  },
  {
    setReporte,
    setEdicion,
    setMedido,
    setGracias,
    setAvisoDeMarca,
    setTocado,
    setCodoSinTocar,
  },
) => {
  const codoAntesDelReporteRef = useRef(null);
  const reportabaRef = useRef(false);

  // El foco: al primer motivo al abrir el menú, y a «⋮» al acabar el reporte
  // (revisor, 18 oct: el botón que se pulsó desaparece)
  const faseDelReporte = reporte?.fase ?? null;
  useEffect(() => {
    if (faseDelReporte === 'motivos') primerMotivoRef.current?.focus();
    else if (!faseDelReporte && reportabaRef.current)
      botonDeReportarRef.current?.focus();
    reportabaRef.current = Boolean(faseDelReporte);
  }, [faseDelReporte, primerMotivoRef, botonDeReportarRef]);

  // Lo de antes, desde que se abre el menú: si el mapa se cierra o se oculta
  // con él abierto, se envía eso (revisor, 18 oct)
  const abrirElMenu = () => {
    antesDelReporteRef.current = edicion;
    codoAntesDelReporteRef.current = { tocado, codoSinTocar };
    // El punto medido no se queda debajo de lo que se propone (T7)
    setMedido(null);
    setGracias(false);
    setReporte({ fase: 'motivos' });
  };
  const elegirMotivo = (motivo) => {
    // Lo que se ve no se rehace mientras se propone
    empezar();
    setAvisoDeMarca(null);
    setTocado(null);
    setCodoSinTocar(false);
    setEdicion((e) => ({
      ...e,
      linea: null,
      green: null,
      version: e.version + 1,
    }));
    setReporte({ fase: 'salida', motivo });
  };
  const acabarElReporte = () => {
    const antes = antesDelReporteRef.current;
    antesDelReporteRef.current = null;
    setAvisoDeMarca(null);
    setReporte(null);
    // Tal cual, con su versión: si ya salió al ocultarse, no vuelve a salir
    if (antes) setEdicion(antes);
    // Midiendo desde ti, vuelve también el codo, donde estaba o sin él si se
    // quitó (H9, revisor)
    if (desdeMi && codoAntesDelReporteRef.current) {
      setTocado(codoAntesDelReporteRef.current.tocado);
      setCodoSinTocar(codoAntesDelReporteRef.current.codoSinTocar);
    }
  };
  const enviarReporte = () => {
    // Arrastrando se puede salir de los límites: se dice, y no se manda algo
    // que el servidor tiraría tras darle las gracias (/code-review)
    if (salidaGreenFueraDeLimites(linea[0], linea.at(-1))) {
      setAvisoDeMarca(t('mapa.fueraDeLimites'));
      return;
    }
    onReporte?.({
      id: globalThis.crypto.randomUUID(),
      reason: reporte.motivo,
      tee: linea[0],
      bends: linea.slice(1, -1),
      greenCenter: linea.at(-1),
    });
    acabarElReporte();
    setGracias(true);
  };

  return { abrirElMenu, elegirMotivo, acabarElReporte, enviarReporte };
};
