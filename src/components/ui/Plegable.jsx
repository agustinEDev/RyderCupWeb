import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Una tarjeta de la ficha que se pliega tocando su título (14 oct 2026): con el
 * torneo en juego o acabado, la configuración y los jugadores salen plegados.
 * Si sale plegada se decide al pintarse; luego manda quien la abre o la
 * cierra: que empiece el torneo con la ficha abierta no le cierra lo que
 * estaba mirando (/code-review).
 *
 * @param {Object} props
 * @param {import('react').ReactNode} props.titulo - Lo que va en su encabezado
 * @param {string} [props.claseDelTitulo] - Las clases del encabezado
 * @param {boolean} props.abiertoAlPrincipio - Si sale abierta al pintarse
 * @param {import('react').ReactNode} props.children
 */
const Plegable = ({ titulo, claseDelTitulo = 'text-lg', abiertoAlPrincipio, children }) => {
  const [abierto, setAbierto] = useState(abiertoAlPrincipio);

  return (
    <details
      open={abierto}
      onToggle={(e) => setAbierto(e.currentTarget.open)}
      className="group bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 group-open:mb-4 [&::-webkit-details-marker]:hidden">
        <h3 className={`flex min-w-0 flex-1 items-center gap-2 font-bold text-gray-900 ${claseDelTitulo}`}>{titulo}</h3>
        <ChevronDown aria-hidden="true" className="h-5 w-5 flex-none text-gray-400 transition-transform group-open:rotate-180" />
      </summary>
      {children}
    </details>
  );
};

export default Plegable;
