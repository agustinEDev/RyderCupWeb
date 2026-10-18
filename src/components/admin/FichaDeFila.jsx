import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import ModalShell from '../ui/ModalShell';

/**
 * La ficha de una fila del panel de admin en el móvil (17 oct 2026, entrega 5):
 * sube desde abajo con lo que en el ordenador son las columnas de la tabla y,
 * debajo, sus acciones.
 *
 * @param {Object} props
 * @param {string} props.titulo
 * @param {string} [props.subtitulo]
 * @param {Array<{etiqueta: string, valor: React.ReactNode}>} props.datos
 * @param {string} [props.describedBy] id del texto que explica la ficha
 * @param {Function} props.onClose
 * @param {React.ReactNode} props.children Las acciones
 */
const FichaDeFila = ({ titulo, subtitulo, datos, describedBy, onClose, children }) => {
  const { t } = useTranslation('admin');
  const idDelTitulo = useId();

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      labelledBy={idDelTitulo}
      describedBy={describedBy}
      hojaInferior
      boxClassName="bg-white w-full md:max-w-md md:mx-4 rounded-t-2xl md:rounded-2xl shadow-xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[85dvh] overflow-y-auto"
    >
      <h2 id={idDelTitulo} className="text-lg font-bold text-gray-900 break-words">{titulo}</h2>
      {subtitulo && <p className="text-sm text-gray-500 break-all">{subtitulo}</p>}

      <dl className="mt-4 divide-y divide-gray-100 text-sm">
        {datos.map(({ etiqueta, valor }) => (
          <div key={etiqueta} className="flex items-center justify-between gap-3 py-2">
            <dt className="text-gray-500">{etiqueta}</dt>
            <dd className="text-right font-medium text-gray-900">{valor}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-col gap-2">
        {children}
        <button
          type="button"
          onClick={onClose}
          className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          {t('common:close')}
        </button>
      </div>
    </ModalShell>
  );
};

export default FichaDeFila;
