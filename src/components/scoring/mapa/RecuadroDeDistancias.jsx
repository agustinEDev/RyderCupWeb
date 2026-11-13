// El recuadro de delante, centro y fondo, con de dónde salen sus cifras
// (`origen`: tu posición, tu barra o la salida). Sin distancias, nada
const RecuadroDeDistancias = ({ t, distancias, origen }) =>
  distancias && (
    <>
      {/* Se lee en la frase del recuadro, con las cifras (CodeRabbit, 17 oct) */}
      <p
        aria-hidden="true"
        className="self-start text-[11px] font-semibold text-white/90 [text-shadow:0_1px_2px_#000]"
      >
        {origen}
      </p>
      <div className="grid grid-cols-[1fr_1.35fr_1fr] overflow-hidden rounded-2xl bg-white/95 text-gray-900 shadow-xl">
        <span className="sr-only">
          {t('mapa.etiqueta', { ...distancias, origen })}
        </span>
        {[
          ['delante', distancias.front, ''],
          ['centro', distancias.center, 'bg-green-700 text-white'],
          ['fondo', distancias.back, ''],
        ].map(([lado, metros, destacado]) => (
          <div
            key={lado}
            aria-hidden="true"
            className={`flex flex-col items-center py-2 ${destacado}`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-75">
              {t(`mapa.${lado}`)}
            </span>
            <span
              data-testid={`distancia-${lado}`}
              className={`font-mono font-extrabold tabular-nums leading-none ${lado === 'centro' ? 'text-4xl' : 'text-2xl'}`}
            >
              {metros}
            </span>
            <span className="text-[11px] opacity-70">{t('mapa.metros')}</span>
          </div>
        ))}
      </div>
    </>
  );

export default RecuadroDeDistancias;
