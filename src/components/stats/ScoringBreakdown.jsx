import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flag, MapPin, PieChart } from 'lucide-react';

/**
 * El desglose de golpes: dónde gana y dónde pierde el jugador (FE #592).
 *
 * El resumen de arriba dice CUÁNTO juega de bien. Esto dice DÓNDE, que es lo
 * que se puede llevar al campo de prácticas: si los golpes se van en los par 3,
 * en los segundos nueve, o en un campo concreto.
 *
 * Tres cosas que esta pantalla tiene que respetar y son fáciles de romper:
 *
 * 1. **La distribución viene en bruto y en neto**, y la diferencia es el punto.
 *    Sale primero el bruto —un birdie es un birdie, que es lo que el jugador
 *    entiende al leer la palabra— y el interruptor deja ver el neto, donde un
 *    hándicap alto descubre los pares netos que sí está haciendo.
 * 2. **Hay DOS escalas.** Por par y por mitad de vuelta son medias POR HOYO;
 *    por campo es POR VUELTA de 18, la misma de `scoring_avg`. Pintar una con
 *    las unidades de la otra es el error obvio, y no se nota.
 * 3. **`backNine` a null no es cero.** Cero significa jugar al par; null es que
 *    esa mitad no se jugó.
 */

const CESTAS = ['birdieOrBetter', 'par', 'bogey', 'doubleOrWorse'];

const COLOR_DE_CESTA = {
  birdieOrBetter: 'bg-emerald-500',
  par: 'bg-sky-500',
  bogey: 'bg-amber-500',
  doubleOrWorse: 'bg-rose-500',
};

// `decimales` cambia entre las dos escalas: una media por hoyo necesita dos
// para no aplanar +0.11 y +0.44 en el mismo número; una por vuelta, uno basta
const formatearAlPar = (valor, t, decimales = 2) => {
  if (valor === null || valor === undefined) return '--';
  if (valor === 0) return t('playerStats.levelPar');
  return valor > 0 ? `+${valor.toFixed(decimales)}` : valor.toFixed(decimales);
};

const ScoringBreakdown = ({ breakdown, failed = false }) => {
  const { t } = useTranslation('dashboard');
  const [enNeto, setEnNeto] = useState(false);

  // Primero el fallo, y separado del vacío: si no se pudo preguntar, no se
  // puede afirmar que el jugador no tenga vueltas
  if (failed) {
    return (
      <div
        data-testid="breakdown-error"
        className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center"
      >
        <p className="text-sm font-medium text-amber-900">{t('breakdown.errorTitle')}</p>
        <p className="mt-1 text-xs text-amber-800">{t('breakdown.errorDescription')}</p>
      </div>
    );
  }

  if (!breakdown || breakdown.holesCounted === 0) {
    return (
      <div
        data-testid="breakdown-empty"
        className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center"
      >
        <PieChart className="mx-auto h-6 w-6 text-gray-300" aria-hidden="true" />
        <p className="mt-2 text-sm font-medium text-gray-900">
          {t('breakdown.emptyTitle')}
        </p>
        {/* El porqué importa: casi siempre no es que falten partidas, sino que
            las que hay están sin terminar, son foursomes o media tarjeta */}
        <p className="mt-1 text-xs text-gray-500">{t('breakdown.emptyDescription')}</p>
      </div>
    );
  }

  const distribucion = enNeto ? breakdown.netDistribution : breakdown.grossDistribution;
  const totalHoyos = distribucion.holes || 0;
  const porcentaje = (n) => (totalHoyos ? Math.round((n / totalHoyos) * 100) : 0);

  // Solo se señala un par si se pierde de verdad en él: por encima del par y
  // con media conocida. Sin las dos condiciones, un jugador bajo par en todos
  // los hoyos vería marcado en rojo su par menos bueno —que sigue siendo
  // bueno—, y una tarjeta sin medias marcaría la primera casilla por sorteo.
  const peorPar = breakdown.byPar.reduce((peor, actual) => {
    if (actual.averageToPar === null || actual.averageToPar <= 0) return peor;
    return peor === null || actual.averageToPar > peor.averageToPar ? actual : peor;
  }, null);

  const esElPeor = (entrada) =>
    peorPar !== null && entrada.par === peorPar.par && breakdown.byPar.length > 1;

  const mitad = (datos, etiqueta, testId) => (
    <div data-testid={testId} className="rounded-lg border border-gray-200 p-3">
      <p className="text-xs font-medium text-gray-500">{etiqueta}</p>
      {datos ? (
        <>
          <p className="text-xl font-bold text-gray-900">
            {formatearAlPar(datos.averageToPar, t)}
          </p>
          <p className="text-xs text-gray-500">
            {t('breakdown.perHoleOver', { count: datos.holes })}
          </p>
        </>
      ) : (
        // No jugada, que no es lo mismo que jugada al par
        <p className="mt-1 text-sm text-gray-400">{t('breakdown.nineNotPlayed')}</p>
      )}
    </div>
  );

  return (
    <div data-testid="scoring-breakdown" className="space-y-6">
      {/* Distribución */}
      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-gray-900">{t('breakdown.distribution')}</h3>
          <div className="flex rounded-lg border border-gray-200 p-0.5" role="group">
            <button
              type="button"
              onClick={() => setEnNeto(false)}
              aria-pressed={!enNeto}
              className={`rounded px-2.5 py-1 text-xs font-medium ${
                !enNeto ? 'bg-primary text-white' : 'text-gray-600'
              }`}
            >
              {t('breakdown.gross')}
            </button>
            <button
              type="button"
              onClick={() => setEnNeto(true)}
              aria-pressed={enNeto}
              className={`rounded px-2.5 py-1 text-xs font-medium ${
                enNeto ? 'bg-primary text-white' : 'text-gray-600'
              }`}
            >
              {t('breakdown.net')}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {CESTAS.map((cesta) => (
            <div key={cesta} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-xs text-gray-600">
                {t(`breakdown.buckets.${cesta}`)}
              </span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full ${COLOR_DE_CESTA[cesta]}`}
                  style={{ width: `${porcentaje(distribucion[cesta])}%` }}
                />
              </div>
              <span className="w-20 shrink-0 text-right text-xs tabular-nums text-gray-700">
                {porcentaje(distribucion[cesta])}%
                <span className="ml-1 text-gray-400">({distribucion[cesta]})</span>
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {t('breakdown.overHoles', { count: breakdown.holesCounted })}
        </p>
      </section>

      {/* Por par */}
      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-gray-900">
          <Flag className="h-4 w-4 text-gray-400" aria-hidden="true" />
          {t('breakdown.byPar')}
        </h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {breakdown.byPar.map((entrada) => (
            <div
              key={entrada.par}
              data-testid={`par-${entrada.par}`}
              className={`rounded-lg border p-3 ${
                esElPeor(entrada) ? 'border-rose-200 bg-rose-50' : 'border-gray-200'
              }`}
            >
              <p className="text-xs font-medium text-gray-500">
                {t('breakdown.parN', { par: entrada.par })}
              </p>
              <p className="text-xl font-bold text-gray-900">
                {formatearAlPar(entrada.averageToPar, t)}
              </p>
              <p className="text-xs text-gray-500">
                {t('breakdown.perHoleOver', { count: entrada.holes })}
              </p>
              {/* Con TEXTO y no solo con el color: al sol el matiz no se
                  aprecia, y un lector de pantalla no ve un fondo rosa */}
              {esElPeor(entrada) && (
                <p className="mt-1 text-xs font-semibold text-rose-700">
                  {t('breakdown.worstPar')}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Ida y vuelta */}
      <section>
        <h3 className="mb-2 text-sm font-bold text-gray-900">{t('breakdown.nines')}</h3>
        <div className="grid grid-cols-2 gap-3">
          {mitad(breakdown.frontNine, t('breakdown.frontNine'), 'front-nine')}
          {mitad(breakdown.backNine, t('breakdown.backNine'), 'back-nine')}
        </div>
      </section>

      {/* Campos */}
      {breakdown.byCourse.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-gray-900">
            <MapPin className="h-4 w-4 text-gray-400" aria-hidden="true" />
            {t('breakdown.byCourse')}
          </h3>
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {breakdown.byCourse.map((campo) => (
              <div
                key={campo.golfCourseId}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-gray-900">
                    {campo.golfCourseName || t('breakdown.unnamedCourse')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t('breakdown.roundsCount', { count: campo.rounds })}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold tabular-nums text-gray-900">
                  {formatearAlPar(campo.averageToPar, t, 1)}
                </span>
              </div>
            ))}
          </div>
          {/* La otra escala: aquí es por vuelta, no por hoyo */}
          <p className="mt-2 text-xs text-gray-500">{t('breakdown.perRoundHint')}</p>
        </section>
      )}
    </div>
  );
};

export default ScoringBreakdown;
