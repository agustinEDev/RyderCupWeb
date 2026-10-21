import { GrupoDePestanas, ListaDePestanas, PanelDePestana } from '../ui/Pestanas';

/**
 * Las pestañas de una sección del panel de admin (17 oct): Campos de golf
 * (aprobados y solicitudes) y Hoyos (pendientes y todos los campos). Cada una
 * puede llevar su `ver` en la URL, para enlazarla y que sobreviva a recargar; la
 * primera va sin él. El patrón de pestañas lo pone la pieza compartida
 * (FE #658); aquí, un solo panel para todas y el aspecto de la sección.
 *
 * @param {string} etiqueta - el nombre de las pestañas para los lectores (el de la sección)
 * @param {{id: string, label: string}[]} pestanas
 * @param {string} actual - el id de la abierta
 * @param {(id: string) => void} onElegir
 */
const PestanasDeSeccion = ({ etiqueta, pestanas, actual, onElegir, children }) => (
  <GrupoDePestanas actual={actual} onElegir={onElegir} panelUnico>
    <ListaDePestanas
      etiqueta={etiqueta}
      className="mb-4 flex border-b border-gray-200"
      pestanas={pestanas.map(({ id, label }) => ({ id, contenido: label }))}
      claseDePestana={(abierta) =>
        `min-h-11 flex-1 border-b-2 px-3 text-sm font-medium ${
          abierta ? 'border-primary text-primary' : 'border-transparent text-gray-500'
        }`
      }
    />
    <PanelDePestana>{children}</PanelDePestana>
  </GrupoDePestanas>
);

export default PestanasDeSeccion;
