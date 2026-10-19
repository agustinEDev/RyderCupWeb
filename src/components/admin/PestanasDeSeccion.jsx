/**
 * Las pestañas de una sección del panel de admin (17 oct): Campos de golf
 * (aprobados y solicitudes) y Hoyos (pendientes y todos los campos). Cada una
 * puede llevar su `ver` en la URL, para enlazarla y que sobreviva a recargar; la
 * primera va sin él. Siguen el patrón de pestañas: una sola en el orden del
 * tabulador y las flechas para moverse.
 *
 * @param {string} nombre - prefijo de los ids (`pestana-<nombre>-<id>`, `panel-<nombre>`)
 * @param {string} etiqueta - el nombre de las pestañas para los lectores (el de la sección)
 * @param {{id: string, label: string}[]} pestanas
 * @param {string} actual - el id de la abierta
 * @param {(id: string) => void} onElegir
 */
const PestanasDeSeccion = ({ nombre, etiqueta, pestanas, actual, onElegir, children }) => {
  const idDe = (id) => `pestana-${nombre}-${id}`;
  const alPulsar = (evento) => {
    if (evento.key !== 'ArrowRight' && evento.key !== 'ArrowLeft') return;
    evento.preventDefault();
    const paso = evento.key === 'ArrowRight' ? 1 : -1;
    const donde = pestanas.findIndex((p) => p.id === actual);
    const siguiente = pestanas[(donde + paso + pestanas.length) % pestanas.length].id;
    onElegir(siguiente);
    globalThis.document.getElementById(idDe(siguiente))?.focus();
  };
  return (
    <>
      <div role="tablist" aria-label={etiqueta} className="mb-4 flex border-b border-gray-200">
        {pestanas.map(({ id, label }) => (
          <button
            key={id}
            id={idDe(id)}
            type="button"
            role="tab"
            aria-controls={`panel-${nombre}`}
            aria-selected={actual === id}
            tabIndex={actual === id ? 0 : -1}
            onClick={() => onElegir(id)}
            onKeyDown={alPulsar}
            className={`min-h-11 flex-1 border-b-2 px-3 text-sm font-medium ${
              actual === id ? 'border-primary text-primary' : 'border-transparent text-gray-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div id={`panel-${nombre}`} role="tabpanel" aria-labelledby={idDe(actual)}>
        {children}
      </div>
    </>
  );
};

export default PestanasDeSeccion;
