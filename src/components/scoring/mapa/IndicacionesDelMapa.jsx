import { PLACA } from './clasesDelMapa';

// Los motivos de un reporte, en el orden del menú (entrega 7, 18 oct)
const MOTIVOS_DEL_REPORTE = ['WRONG_HOLE', 'WRONG_LINE', 'HOLE_CHANGED'];

/**
 * Lo que el panel de abajo del mapa dice o pregunta ahora, una sola cosa: el
 * menú de motivos y la barra del reporte, «¿Estás en la salida?», lo que se pide
 * tocar al marcar, «Quitar» lo medido o el codo movido, o la ayuda.
 *
 * Todo en un mismo sitio a propósito: al pasar de una cosa a otra, React aprovecha
 * los mismos elementos (y el lector de pantalla sigue en su región `aria-live`).
 */
const IndicacionesDelMapa = ({
  t,
  sinMapa,
  reporte,
  fase,
  pidiendo,
  marca,
  marcandoSalida,
  medido,
  desdeMi,
  posicionBuena,
  aviso,
  tocado,
  conAyudaDeCodos,
  linea,
  hastaAhi,
  deAhiAlGreen,
  primerMotivoRef,
  loQueSePideRef,
  onElegirMotivo,
  onAcabarElReporte,
  onEnviarReporte,
  onResponder,
  onAhoraNo,
  onQuitarMedido,
  onQuitarTocado,
}) => {
  // «Quitar» y, para quien no ve el mapa, los metros (en el mapa van junto a cada línea)
  const quitarYSusMetros = (alQuitar) => (
    <div className="flex items-center">
      <span role="status" className="sr-only">
        {/* Sin tu posición se mide desde la salida, y se dice (/code-review) */}
        {hastaAhi !== null && (
          <span>
            {t(
              medido && !posicionBuena
                ? 'mapa.hastaAhiDesdeLaSalida'
                : 'mapa.hastaAhi',
              { metros: hastaAhi },
            )}
          </span>
        )}
        {deAhiAlGreen !== null && (
          <span>{t('mapa.deAhiAlGreen', { metros: deAhiAlGreen })}</span>
        )}
      </span>
      <button
        type="button"
        onClick={alQuitar}
        className={`${PLACA} pointer-events-auto min-h-11 px-4 text-sm font-semibold text-yellow-300`}
      >
        {t('mapa.quitarPunto')}
      </button>
    </div>
  );

  return sinMapa ? null : reporte?.fase === 'motivos' ? (
    <div
      role="group"
      aria-labelledby="titulo-del-reporte"
      className={`${PLACA} pointer-events-auto flex flex-col gap-2 p-3`}
    >
      <span id="titulo-del-reporte" className="text-base font-semibold">
        {t('mapa.reporteTitulo')}
      </span>
      {MOTIVOS_DEL_REPORTE.map((clave, i) => (
        <button
          key={clave}
          ref={i === 0 ? primerMotivoRef : undefined}
          type="button"
          onClick={() => onElegirMotivo(clave)}
          className="min-h-11 rounded-xl bg-white/15 px-3 py-2 text-left text-[15px] font-semibold text-white"
        >
          {t(`mapa.motivos.${clave}`)}
        </button>
      ))}
      <button
        type="button"
        onClick={onAcabarElReporte}
        className="min-h-11 px-2 text-sm font-semibold text-yellow-300 underline"
      >
        {t('mapa.cancelar')}
      </button>
    </div>
  ) : reporte ? (
    // Con la propuesta lista, el texto arriba y los botones debajo: a 360 px
    // no caben al lado sin que el texto ocupe medio mapa (revisor, 18 oct)
    <div
      data-testid="barra-del-reporte"
      className={`${PLACA} pointer-events-auto flex gap-2 px-3.5 py-2 ${reporte.fase === 'lista' ? 'flex-col' : 'items-center justify-between'}`}
    >
      <span aria-live="polite" className="text-base font-semibold">
        {t(
          reporte.fase === 'salida'
            ? 'mapa.reporteSalida'
            : reporte.fase === 'green'
              ? 'mapa.reporteGreen'
              : (linea?.length ?? 0) > 2
                ? 'mapa.ayudaCodo'
                : 'mapa.reporteSinCodos',
        )}
      </span>
      <span
        className={`flex shrink-0 gap-2 ${reporte.fase === 'lista' ? 'justify-end' : ''}`}
      >
        {reporte.fase === 'lista' && (
          <button
            type="button"
            onClick={onEnviarReporte}
            className="min-h-11 rounded-xl bg-white px-3 text-[15px] font-semibold text-gray-900"
          >
            {t('mapa.enviarReporte')}
          </button>
        )}
        <button
          type="button"
          onClick={onAcabarElReporte}
          className="min-h-11 px-2 text-sm font-semibold text-yellow-300 underline"
        >
          {t('mapa.cancelar')}
        </button>
      </span>
    </div>
  ) : fase === 'pregunta' ? (
    <div
      className={`${PLACA} pointer-events-auto flex items-center justify-between gap-2 px-3.5 py-2`}
    >
      <span aria-live="polite" className="text-base font-semibold">
        {t('mapa.preguntaSalida')}
      </span>
      <span className="flex gap-2">
        <button
          type="button"
          onClick={() => onResponder(true)}
          className="min-h-11 rounded-xl bg-white px-4 text-[15px] font-semibold text-gray-900"
        >
          {t('mapa.si')}
        </button>
        <button
          type="button"
          onClick={() => onResponder(false)}
          className="min-h-11 rounded-xl bg-white/15 px-4 text-[15px] font-semibold text-white"
        >
          {t('mapa.no')}
        </button>
      </span>
    </div>
  ) : pidiendo ? (
    <div
      className={`${PLACA} pointer-events-auto flex items-center justify-between gap-2 px-3.5 py-2`}
    >
      <span
        ref={loQueSePideRef}
        tabIndex={-1}
        aria-live="polite"
        className="text-base font-semibold"
      >
        {t(
          marca.soloGreen
            ? 'mapa.pideGreen'
            : marcandoSalida && !marca.tee
              ? marca.malGps
                ? 'mapa.malGps'
                : 'mapa.pideSalida'
              : 'mapa.pideGreen',
        )}
      </span>
      <button
        type="button"
        onClick={onAhoraNo}
        className="min-h-11 px-2 text-sm font-semibold text-yellow-300 underline"
      >
        {t('mapa.ahoraNo')}
      </button>
    </div>
  ) : medido ? (
    // Primero el punto tocado; a mitad de hoyo, luego el codo (T5)
    quitarYSusMetros(onQuitarMedido)
  ) : desdeMi && !posicionBuena ? (
    // Sin un GPS bueno no hay línea desde ti: sale en cuanto lo sea (D5), también con
    // codo (D5b).
    // Si el GPS ya tiene su aviso, ese basta (revisor, 18 oct)
    aviso ? null : (
      <p
        aria-live="polite"
        className={`${PLACA} self-start px-3.5 py-2 text-sm`}
      >
        {t('mapa.buscando')}
      </p>
    )
  ) : tocado ? (
    // Solo con el codo movido: lo devuelve a sin tocar (C9, 20 oct)
    quitarYSusMetros(onQuitarTocado)
  ) : conAyudaDeCodos ? (
    <p className={`${PLACA} self-start px-3.5 py-2 text-sm`}>
      {t('mapa.ayudaCodo')}
    </p>
  ) : (
    <p className={`${PLACA} self-start px-3.5 py-2 text-sm`}>
      {t('mapa.ayudaMedir')}
    </p>
  );
};

export default IndicacionesDelMapa;
