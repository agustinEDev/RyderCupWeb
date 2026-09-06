import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, X } from 'lucide-react';

import ModalShell from '../ui/ModalShell';
import { CountryFlag } from '../../utils/countryUtils';
import TeeColorBadge from './TeeColorBadge';

// Fuera del componente a proposito: definido dentro, React lo trata como un
// tipo nuevo en cada render y desmonta y vuelve a montar lo que hay debajo.
const Dato = ({ etiqueta, children }) => (
  <div>
    <dt className="text-xs uppercase tracking-wide text-gray-500">{etiqueta}</dt>
    <dd className="text-sm text-gray-900 mt-0.5">{children}</dd>
  </div>
);

/**
 * Detalle de un campo de golf, en solo lectura.
 *
 * Hasta ahora el ojo de la tabla solo sacaba un aviso de «próximamente», y para
 * ver lo que guarda un campo había que abrir el formulario de EDICIÓN: una
 * pantalla que escribe puesta delante de una pregunta que solo mira, y que
 * además no sabe enseñar ni la ubicación ni los metros.
 *
 * La tarjeta se elige POR BARRA porque es como se guarda: desde la importación
 * de la RFEG el par, el índice y la distancia cuelgan de la salida, y la del
 * campo es una vista derivada de la primera. En el conjunto federado los metros
 * cambian entre barras en 574 de 800 campos, el índice en 56 y el par en 25, así
 * que una tarjeta única no puede describirlos.
 *
 * @param {Object} props
 * @param {import('../../domain/entities/GolfCourse').default} props.course
 *   Campo COMPLETO, pedido por su id. El listado no trae las tarjetas.
 * @param {Function} props.onClose
 */
const GolfCourseDetailModal = ({ course, onClose }) => {
  const { t } = useTranslation('golfCourses');
  const [barraElegida, setBarraElegida] = useState(0);

  if (!course) return null;

  const tees = course.tees || [];
  const tee = tees[barraElegida] ?? null;

  // Una barra sin tarjeta propia juega la del campo. Se dice en pantalla en vez
  // de pintarla como suya: son datos heredados.
  //
  // Y sin distancias, aunque no porque el campo no las tenga: el backend manda
  // los metros tambien en la tarjeta de referencia, pero `Hole` no guarda ese
  // campo y `fromDTO` lo tira. Arreglarlo es el primer punto de la FE #413, y
  // vive en el value object, no aqui.
  const tarjetaPropia = Boolean(tee?.holes?.length);
  const tarjeta = tarjetaPropia ? tee.holes : (course.holes || []);

  const parDeLaTarjeta = tarjeta.reduce((suma, h) => suma + (h.par || 0), 0);
  // Solo se suman los metros si están TODOS: un total a medias es un número
  // que parece la longitud del campo y no lo es.
  const todosLosMetros = tarjeta.length > 0 && tarjeta.every(h => h.meters != null);
  const metrosDeLaTarjeta = todosLosMetros
    ? tarjeta.reduce((suma, h) => suma + h.meters, 0)
    : null;

  const generoDe = (salida) => salida?.gender ?? salida?.teeGender ?? salida?.tee_gender ?? null;

  const tituloId = 'detalle-campo-titulo';

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      labelledBy={tituloId}
      maxWidthClass="max-w-3xl"
      scrollableBackdrop
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 id={tituloId} className="text-xl font-bold text-gray-900">
            {course.name}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{t('detail.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('detail.close')}
          className="text-gray-400 hover:text-gray-600 shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* El alto propio solo a partir de `md`: en un móvil apaisado, un cuerpo
          limitado al 70% de la ventana MÁS el título y el pie no cabe, y lo que
          se sale no se alcanza. Ahí desplaza el fondo entero */}
      <div className="space-y-6 md:max-h-[70vh] md:overflow-y-auto md:pr-1">
        {/* Identidad */}
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-2">{t('detail.general')}</h3>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Dato etiqueta={t('table.country')}>
              <span className="inline-flex items-center gap-2">
                <CountryFlag countryCode={course.countryCode} className="w-5 h-5" />
                {course.countryCode}
              </span>
            </Dato>
            <Dato etiqueta={t('table.type')}>
              {t(`form.courseTypes.${course.courseType}`)}
            </Dato>
            <Dato etiqueta={t('table.par')}>{course.totalPar}</Dato>
            <Dato etiqueta={t('table.status')}>
              {t(`table.statuses.${course.approvalStatus}`)}
            </Dato>
          </dl>
        </section>

        {/* Ubicación: solo si hay algo que enseñar. Un campo sin ella no lleva
            una sección vacía, que se leería como un dato perdido */}
        {course.hasLocation?.() && (
          <section>
            <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-gray-500" />
              {t('detail.location')}
            </h3>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {course.location.address && (
                <div className="col-span-2 md:col-span-4">
                  <dt className="text-xs uppercase tracking-wide text-gray-500">
                    {t('detail.address')}
                  </dt>
                  <dd className="text-sm text-gray-900 mt-0.5">{course.location.address}</dd>
                </div>
              )}
              {course.location.city && (
                <Dato etiqueta={t('detail.city')}>{course.location.city}</Dato>
              )}
              {course.location.province && (
                <Dato etiqueta={t('detail.province')}>{course.location.province}</Dato>
              )}
              {course.location.latitude != null && course.location.longitude != null && (
                <Dato etiqueta={t('detail.coordinates')}>
                  {course.location.latitude}, {course.location.longitude}
                </Dato>
              )}
            </dl>
          </section>
        )}

        {/* Barras */}
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-2">
            {t('detail.tees', { count: tees.length })}
          </h3>
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
            {tees.map((salida, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                <TeeColorBadge
                  color={salida.color}
                  identifier={salida.identifier}
                  gender={generoDe(salida)}
                />
                <span className="text-xs text-gray-600 whitespace-nowrap">
                  {t('detail.courseRatingShort')} {salida.courseRating} ·{' '}
                  {t('detail.slopeRatingShort')} {salida.slopeRating}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Tarjeta de la barra elegida */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-bold text-gray-900">{t('detail.scorecard')}</h3>
            {tees.length > 1 && (
              <label className="text-xs text-gray-600 flex items-center gap-2">
                {t('detail.pickTee')}
                <select
                  value={barraElegida}
                  onChange={(e) => setBarraElegida(Number(e.target.value))}
                  className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-900"
                >
                  {tees.map((salida, i) => (
                    <option key={i} value={i}>
                      {salida.identifier || t(`form.teeColors.${salida.color}`, { defaultValue: salida.color })}
                      {generoDe(salida) === 'MALE' ? ' (M)' : generoDe(salida) === 'FEMALE' ? ' (F)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {!tarjetaPropia && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-2">
              {t('detail.inheritedCard')}
            </p>
          )}

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">
                    {t('detail.hole')}
                  </th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">
                    {t('form.par')}
                  </th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">
                    {t('detail.strokeIndex')}
                  </th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">
                    {t('detail.meters')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tarjeta.map((hoyo) => (
                  <tr key={hoyo.holeNumber} className="border-t border-gray-100">
                    <td className="py-1.5 px-3 font-medium text-gray-900">{hoyo.holeNumber}</td>
                    <td className="py-1.5 px-3 text-gray-700">{hoyo.par}</td>
                    <td className="py-1.5 px-3 text-gray-700">{hoyo.strokeIndex}</td>
                    {/* Sin metros se deja VACÍO, no con un guion: aquí el guion
                        no significa "no consta" en ninguna otra tarjeta */}
                    <td className="py-1.5 px-3 text-gray-700">{hoyo.meters ?? ''}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="py-2 px-3 font-semibold text-gray-700">{t('detail.total')}</td>
                  <td className="py-2 px-3 font-semibold text-gray-900">{parDeLaTarjeta}</td>
                  <td className="py-2 px-3" />
                  <td className="py-2 px-3 font-semibold text-gray-900">
                    {metrosDeLaTarjeta ?? ''}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </div>

      <div className="flex justify-end pt-4 mt-2 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          {t('detail.close')}
        </button>
      </div>
    </ModalShell>
  );
};

export default GolfCourseDetailModal;
