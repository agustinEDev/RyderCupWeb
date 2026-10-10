import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import {
  categoriasDeLosLimites,
  errorDeLimites,
  MAX_LIMITES,
  MIN_CATEGORIAS_IGUALES,
  MAX_CATEGORIAS_IGUALES,
  ACUMULADO,
  MEJOR_TARJETA,
} from '../../domain/value_objects/StrokePlaySetup';
import {
  IGUALES,
  LIMITES,
  errorDeLasCategorias,
  errorDeLasJornadas,
  limiteEscrito,
  limiteVacio,
  formatoUnDecimal,
} from '../../utils/ajustesDeStrokePlay';

const CUANTAS_IGUALES = Array.from(
  { length: MAX_CATEGORIAS_IGUALES - MIN_CATEGORIAS_IGUALES + 1 },
  (_, i) => String(MIN_CATEGORIAS_IGUALES + i)
);

/**
 * Los ajustes de un Stableford o un Medal en el formulario (FE #824):
 * categorías, jornadas por jugador y la general.
 *
 * Las categorías van de una de dos maneras (RyderCupAm#536): límites de
 * hándicap a mano, con una vista previa de cómo quedan, o N categorías iguales
 * que se reparten al cerrar las inscripciones. Lo escrito en un modo se
 * conserva al pasar al otro: solo se envía el elegido.
 *
 * Controlado: recibe los campos (`formularioDeAjustes`) y devuelve los nuevos.
 */
const StrokePlaySettings = ({ valor, onCambio, tipo, dias }) => {
  const { t, i18n } = useTranslation('competitions');
  const cambia = (cambios) => onCambio({ ...valor, ...cambios });

  const conUnDecimal = (numero) => formatoUnDecimal(numero, i18n.language);

  // Cada error por su lado: uno de las categorías no tapa el de las jornadas
  // (/code-review). Un límite recién añadido, aún sin escribir, no es un error
  // que anunciar: se anunciaba al pulsar «Añadir» (revisor). Al enviar sí se
  // para, arriba
  const delModo = errorDeLasCategorias(valor);
  const errorDeCategorias = delModo === 'categoryLimitEmpty' ? null : delModo;
  const errorDeJornadas = errorDeLasJornadas(valor, dias);
  // La vista previa, con los escritos: los huecos aún vacíos no cuentan
  const escritos = valor.limites.filter((v) => !limiteVacio(v)).map(limiteEscrito);
  const vistaPrevia = valor.modo === LIMITES && !errorDeLimites(escritos) ? categoriasDeLosLimites(escritos) : null;
  // Qué campos fallan, para marcarlos: el suyo propio, o estar desordenado
  const leidos = valor.limites.map(limiteEscrito);
  const fallan = valor.limites.map(
    (escrito, i) =>
      Boolean(errorDeCategorias) &&
      !limiteVacio(escrito) &&
      (errorDeLimites([leidos[i]]) !== null || (i > 0 && leidos[i] <= leidos[i - 1]))
  );

  const ponLimite = (i, escrito) => cambia({ limites: valor.limites.map((v, j) => (j === i ? escrito : v)) });
  const quitaLimite = (i) => cambia({ limites: valor.limites.filter((_, j) => j !== i) });

  const textoDeCategoria = ({ numero, desde, hasta, masDe }) => {
    if (masDe !== null) return t('create.strokePlay.preview.above', { numero, masDe: conUnDecimal(masDe) });
    if (hasta === null) return t('create.strokePlay.preview.single');
    if (desde === null) return t('create.strokePlay.preview.upTo', { numero, hasta: conUnDecimal(hasta) });
    return t('create.strokePlay.preview.between', { numero, desde: conUnDecimal(desde), hasta: conUnDecimal(hasta) });
  };

  const botonDeModo = (modo) => (
    <button
      key={modo}
      type="button"
      data-testid={`modo-${modo}`}
      aria-pressed={valor.modo === modo}
      onClick={() => cambia({ modo })}
      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
        valor.modo === modo
          ? 'border-green-600 bg-green-50 text-green-800'
          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
      }`}
    >
      {t(`create.strokePlay.mode.${modo}`)}
    </button>
  );

  return (
    <div className="space-y-5">
      {/* Categorías */}
      <fieldset className="space-y-3">
        <legend className="block text-sm font-medium text-gray-700 mb-1">{t('create.strokePlay.categories')}</legend>
        <div className="flex gap-2">{[LIMITES, IGUALES].map(botonDeModo)}</div>

        {valor.modo === LIMITES ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">{t('create.strokePlay.limitsHint')}</p>
            {valor.limites.map((escrito, i) => (
              <div key={i} className="flex items-center gap-2">
                <label htmlFor={`limite-${i}`} className="w-28 shrink-0 text-sm text-gray-600">
                  {t('create.strokePlay.limitLabel', { numero: i + 1 })}
                </label>
                <input
                  id={`limite-${i}`}
                  type="text"
                  inputMode="decimal"
                  value={escrito}
                  onChange={(e) => ponLimite(i, e.target.value)}
                  aria-invalid={fallan[i] || undefined}
                  aria-describedby={fallan[i] ? 'error-de-categorias' : undefined}
                  className="w-24 min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => quitaLimite(i)}
                  aria-label={t('create.strokePlay.removeLimit', { numero: i + 1 })}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {valor.limites.length < MAX_LIMITES && (
              <button
                type="button"
                onClick={() => cambia({ limites: [...valor.limites, ''] })}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-green-700 hover:bg-green-50"
              >
                <Plus className="h-4 w-4" />
                {t('create.strokePlay.addLimit')}
              </button>
            )}
            {/* Solo con límites válidos: unos desordenados darían rangos absurdos */}
            {vistaPrevia && (
              <ul data-testid="vista-previa" className="space-y-0.5 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {vistaPrevia.map((categoria) => (
                  <li key={categoria.numero}>{textoDeCategoria(categoria)}</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <label htmlFor="categorias-iguales" className="block text-sm text-gray-600">
              {t('create.strokePlay.equalCount')}
            </label>
            <select
              id="categorias-iguales"
              value={valor.categoriasIguales}
              onChange={(e) => cambia({ categoriasIguales: e.target.value })}
              className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {CUANTAS_IGUALES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">{t('create.strokePlay.equalHint')}</p>
          </div>
        )}

        <p className="text-xs text-gray-500">{t('create.strokePlay.sixRule')}</p>
        {errorDeCategorias && (
          <p id="error-de-categorias" role="alert" className="text-sm text-red-600">
            {t(`create.errors.${errorDeCategorias}`)}
          </p>
        )}
      </fieldset>

      {/* Jornadas por jugador */}
      <div className="space-y-1">
        <label htmlFor="jornadas-por-jugador" className="block text-sm font-medium text-gray-700">
          {t('create.strokePlay.matchdays')}
        </label>
        <input
          id="jornadas-por-jugador"
          type="number"
          min="1"
          max={dias ?? undefined}
          value={valor.jornadas}
          onChange={(e) => cambia({ jornadas: e.target.value })}
          className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <p className="text-xs text-gray-500">{t('create.strokePlay.matchdaysHint')}</p>
        {errorDeJornadas && (
          <p role="alert" className="text-sm text-red-600">
            {t(`create.errors.${errorDeJornadas}`, errorDeJornadas === 'matchdaysMoreThanDays' ? { count: dias } : undefined)}
          </p>
        )}
      </div>

      {/* La general */}
      <fieldset className="space-y-2">
        <legend className="block text-sm font-medium text-gray-700 mb-1">{t('create.strokePlay.overall.title')}</legend>
        {[ACUMULADO, MEJOR_TARJETA].map((general) => (
          <label key={general} className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="general"
              value={general}
              checked={valor.general === general}
              onChange={() => cambia({ general })}
              aria-label={t(`create.strokePlay.overall.${general}.label`)}
              className="mt-1"
            />
            <span>
              <span className="block font-medium">{t(`create.strokePlay.overall.${general}.label`)}</span>
              <span className="block text-xs text-gray-500">
                {general === ACUMULADO
                  ? t(`create.strokePlay.overall.${ACUMULADO}.${tipo}`)
                  : t(`create.strokePlay.overall.${MEJOR_TARJETA}.hint`)}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
    </div>
  );
};

export default StrokePlaySettings;
