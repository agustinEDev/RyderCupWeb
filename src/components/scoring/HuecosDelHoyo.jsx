import ValidationIcon from './ValidationIcon';
import { HuecoParaAnotar } from './HuecoParaAnotar';
import { clasesDelHueco } from './clasesDelHueco';
import {
  pintaGolpe,
  siguienteHueco as calculaSiguienteHueco,
} from './golpeDeLaCasilla';
import { loQuePusoElOtro } from './textosDeLaCasilla';

const CLASES_DE_ETIQUETA =
  'min-w-0 break-words text-xs font-medium text-gray-500';

// Un golpe de la casilla: el botón que abre el teclado o, bloqueado, el número.
// Uno para los tres —el tuyo y el de cada marcado— para que digan lo mismo
const HuecoDelGolpe = ({
  id,
  prefijo,
  valor,
  bloqueado,
  siguiente,
  onAbrir,
  pinta,
}) =>
  !bloqueado ? (
    <button
      id={id}
      data-testid={`${prefijo}-score-button`}
      onClick={onAbrir}
      className={`w-full h-12 flex items-center justify-center rounded-xl transition-colors ${
        valor === undefined
          ? clasesDelHueco(siguiente)
          : 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300'
      }`}
    >
      {valor === undefined ? (
        <HuecoParaAnotar siguiente={siguiente} />
      ) : (
        <span
          data-testid={`${prefijo}-score-value`}
          className="text-2xl font-bold text-gray-900"
        >
          {pinta(valor)}
        </span>
      )}
    </button>
  ) : (
    <p
      data-testid={`${prefijo}-score-value`}
      className="h-12 flex items-center justify-center text-2xl font-bold text-gray-400"
    >
      {pinta(valor)}
    </p>
  );

// La marca del jugador al que anotas va aquí y no en la cabecera: la de arriba
// es la de TU resultado, y son dos acuerdos distintos. Sin esta, un anotador
// veía su tick verde mientras la tira de hoyos se ponía roja por el otro, sin
// forma de saber por quién. La tarjeta ya no la lleva, así que este es el único
// sitio.
const EtiquetaDelMarcado = ({ id, etiqueta, markedValidationStatus }) => (
  <div className="flex items-center justify-between gap-2">
    {/* min-w-0 y break-words: en foursomes lleva la pareja, y un nombre largo ensanchaba la columna (scroll lateral a 360 px) */}
    <label htmlFor={id} className={CLASES_DE_ETIQUETA}>
      {etiqueta}
    </label>
    {markedValidationStatus && (
      <span data-testid="marked-validation">
        <ValidationIcon status={markedValidationStatus} />
      </span>
    )}
  </div>
);

// El golpe del marcado. Si lo puso otro marcador, su número con su nombre y
// sin poder tocarlo: no se toca desde aquí
const CasillaDelMarcado = ({
  t,
  id,
  valor,
  bloqueado,
  markedScoredBy,
  siguiente,
  onAbrir,
  pinta,
}) => {
  return bloqueado && markedScoredBy ? (
    <div className="flex h-12 flex-col items-center justify-center">
      <p
        data-testid="marked-score-value"
        className="text-2xl font-bold text-gray-400"
      >
        {pinta(valor)}
      </p>
      <p data-testid="anotado-por-otro" className="text-xs text-gray-500">
        {t('input.scoredBy', { nombre: markedScoredBy })}
      </p>
    </div>
  ) : (
    <HuecoDelGolpe
      id={id}
      prefijo="marked"
      valor={valor}
      bloqueado={bloqueado}
      siguiente={siguiente}
      onAbrir={onAbrir}
      pinta={pinta}
    />
  );
};

// En un desacuerdo, lo que puso el otro: con solo la ✗ no se sabía qué
// discutir (QA del 11 oct 2026). Cada uno en su columna; vacío, un hueco sin
// texto (revisor)
const AvisoDeDesacuerdo = ({ loQuePuso, conMarcado }) => (
  <>
    <p className="text-xs text-red-700">
      {loQuePuso.own && (
        <span data-testid="lo-que-puso-el-otro-own">{loQuePuso.own}</span>
      )}
    </p>
    {conMarcado && (
      <p className="text-xs text-red-700">
        {loQuePuso.marked && (
          <span data-testid="lo-que-puso-el-otro-marked">
            {loQuePuso.marked}
          </span>
        )}
      </p>
    )}
  </>
);

// El segundo marcado, en la columna de la derecha bajo el primero; a la
// izquierda, hueco (26 oct 2026)
const SegundoMarcado = ({
  id,
  etiqueta,
  secondMarked,
  valor,
  bloqueado,
  siguiente,
  onAbrir,
  pinta,
  loQuePuso,
}) => (
  <>
    <span aria-hidden="true" />
    <div className="flex items-center justify-between gap-2 pt-2">
      <label htmlFor={id} className={CLASES_DE_ETIQUETA}>
        {etiqueta}
      </label>
      {secondMarked.validationStatus && (
        <span data-testid="second-marked-validation">
          <ValidationIcon status={secondMarked.validationStatus} />
        </span>
      )}
    </div>
    <span aria-hidden="true" />
    <HuecoDelGolpe
      id={id}
      prefijo="second-marked"
      valor={valor}
      bloqueado={bloqueado}
      siguiente={siguiente}
      onAbrir={onAbrir}
      pinta={pinta}
    />
    {loQuePuso && (
      <>
        <span aria-hidden="true" />
        <p className="text-xs text-red-700">
          <span data-testid="lo-que-puso-el-otro-second">{loQuePuso}</span>
        </p>
      </>
    )}
  </>
);

/**
 * Las casillas para anotar el hoyo: la tuya, la del marcado y, si marcas a
 * dos, la del segundo. Etiquetas en una fila de la rejilla y huecos en la
 * siguiente (FE #736): la cabecera del marcado lleva su marca y es más alta
 * que la tuya, y con una columna por jugador su hueco quedaba más abajo. Así
 * comparten fila.
 *
 * @param {{
 *   t: (clave: string, valores?: object) => string,
 *   ids: { propio: string, marcado: string, segundo: string },
 *   etiquetas: { propia: string, marcado: string, segundo: string },
 *   valores: { propio: number | null | undefined, marcado: number | null | undefined, segundo: number | null | undefined },
 *   bloqueos: { propio: boolean, marcado: boolean, segundo: boolean },
 *   conMarcado: boolean,
 *   enParejas: boolean,
 *   validationStatus?: string,
 *   markedValidationStatus?: string,
 *   playerScore?: object | null,
 *   markedPlayerScore?: object | null,
 *   markerName?: string | null,
 *   markedName?: string | null,
 *   markedScoredBy?: string | null,
 *   secondMarked?: object | null,
 *   onAbrir: (panel: 'own' | 'marked' | 'second') => void,
 * }} props
 */
const HuecosDelHoyo = ({
  t,
  ids,
  etiquetas,
  valores,
  bloqueos,
  conMarcado,
  enParejas,
  validationStatus,
  markedValidationStatus,
  playerScore,
  markedPlayerScore,
  markerName,
  markedName,
  markedScoredBy,
  secondMarked,
  onAbrir,
}) => {
  const pinta = (val) => pintaGolpe(val, t);
  const loQuePuso = loQuePusoElOtro(t, {
    enParejas,
    validationStatus,
    markedValidationStatus,
    playerScore,
    markedPlayerScore,
    markerName,
    markedName,
    secondMarked,
  });
  const siguienteHueco = calculaSiguienteHueco({
    propioBloqueado: bloqueos.propio,
    propio: valores.propio,
    marcadoBloqueado: bloqueos.marcado,
    marcado: valores.marcado,
    haySegundo: Boolean(secondMarked),
    segundoBloqueado: bloqueos.segundo,
    segundo: valores.segundo,
  });

  return (
    <div
      data-testid="huecos-del-hoyo"
      className={`grid ${conMarcado ? 'grid-cols-2' : 'grid-cols-1'} gap-x-4 gap-y-1 items-end`}
    >
      <label htmlFor={ids.propio} className={CLASES_DE_ETIQUETA}>
        {etiquetas.propia}
      </label>
      {conMarcado && (
        <EtiquetaDelMarcado
          id={ids.marcado}
          etiqueta={etiquetas.marcado}
          markedValidationStatus={markedValidationStatus}
        />
      )}

      <HuecoDelGolpe
        id={ids.propio}
        prefijo="own"
        valor={valores.propio}
        bloqueado={bloqueos.propio}
        siguiente={siguienteHueco === 'own'}
        onAbrir={() => onAbrir('own')}
        pinta={pinta}
      />

      {conMarcado && (
        <CasillaDelMarcado
          t={t}
          id={ids.marcado}
          valor={valores.marcado}
          bloqueado={bloqueos.marcado}
          markedScoredBy={markedScoredBy}
          siguiente={siguienteHueco === 'marked'}
          onAbrir={() => onAbrir('marked')}
          pinta={pinta}
        />
      )}

      {(validationStatus === 'mismatch' ||
        markedValidationStatus === 'mismatch') && (
        <AvisoDeDesacuerdo loQuePuso={loQuePuso} conMarcado={conMarcado} />
      )}

      {secondMarked && (
        <SegundoMarcado
          id={ids.segundo}
          etiqueta={etiquetas.segundo}
          secondMarked={secondMarked}
          valor={valores.segundo}
          bloqueado={bloqueos.segundo}
          siguiente={siguienteHueco === 'second'}
          onAbrir={() => onAbrir('second')}
          pinta={pinta}
          loQuePuso={loQuePuso.second}
        />
      )}
    </div>
  );
};

export default HuecosDelHoyo;
