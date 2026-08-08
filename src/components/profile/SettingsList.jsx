import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';

/**
 * Lista de ajustes al estilo de una aplicacion movil (FE #324).
 *
 * Sustituye a la botonera de colores del perfil: filas de ancho completo con
 * icono, etiqueta y chevron, agrupadas bajo un encabezado. Una fila no compite
 * por la atencion como lo hacia un boton solido, asi que el color queda libre
 * para lo unico que deberia destacar en cada grupo.
 */

export const SettingsGroup = ({ title, children }) => (
  <section className="mb-6">
    <h3 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
      {title}
    </h3>
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white divide-y divide-gray-200">
      {children}
    </div>
  </section>
);

/**
 * Fila de la lista. Navega con `to` (enlace) o ejecuta `onClick` (boton): lo
 * que va a otra pantalla debe ser un enlace de verdad para que el navegador
 * ofrezca abrir en otra pestana y los lectores de pantalla lo anuncien como tal.
 */
export const SettingsRow = ({ icon: Icon, label, to, onClick, tone = 'default' }) => {
  const toneClasses = tone === 'danger' ? 'text-red-600 active:bg-red-50' : 'text-gray-900 active:bg-gray-50';

  const content = (
    <>
      <span className="flex items-center gap-3">
        {Icon && <Icon className={`h-5 w-5 ${tone === 'danger' ? 'text-red-500' : 'text-gray-400'}`} aria-hidden="true" />}
        <span className="text-sm font-medium">{label}</span>
      </span>
      {/* El chevron promete "esto te lleva a otra pantalla". Cerrar sesion no
          lleva a ninguna, asi que en el tono destructivo no se pinta */}
      {tone !== 'danger' && <ChevronRight className="h-4 w-4 text-gray-300" aria-hidden="true" />}
    </>
  );

  // 44px: minimo de zona tactil, el mismo que se aplico a la navegacion inferior
  const className = `flex w-full min-h-[44px] items-center justify-between px-4 py-3 text-left transition-colors ${toneClasses}`;

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
};

/**
 * Fila que no navega: aloja un control propio a la derecha (el selector de
 * idioma) en lugar del chevron.
 */
export const SettingsControlRow = ({ icon: Icon, label, children }) => (
  <div className="flex min-h-[44px] items-center justify-between gap-3 px-4 py-3">
    <span className="flex items-center gap-3 text-gray-900">
      {Icon && <Icon className="h-5 w-5 text-gray-400" aria-hidden="true" />}
      <span className="text-sm font-medium">{label}</span>
    </span>
    {children}
  </div>
);
