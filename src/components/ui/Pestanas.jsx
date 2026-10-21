import { createContext, useContext, useId, useRef } from 'react';

/**
 * Las pestañas de toda la aplicación (FE #658): el patrón de pestañas de
 * WAI-ARIA en una sola pieza. Antes cada pantalla pintaba botones sueltos y un
 * lector de pantalla los anunciaba como botones, sin decir cuál estaba abierto.
 *
 * Tres piezas, porque la barra y los paneles no suelen estar juntos en el
 * árbol: `GrupoDePestanas` reparte la abierta y los ids (con `useId`, para que
 * dos grupos, o uno dentro de otro, no choquen); `ListaDePestanas` es la barra;
 * `PanelDePestana`, cada panel.
 *
 * Teclado: una sola pestaña en el orden del tabulador (la abierta); las
 * flechas abren la de al lado (dando la vuelta) e Inicio/Fin la primera y la
 * última, y el foco va con ellas. Con Alt, Cmd o Ctrl la tecla no es de la
 * barra: son atajos del navegador o del sistema.
 */
const Contexto = createContext(null);

const idDePestana = (base, id) => `${base}-pestana-${id}`;
const idDePanel = (base, id, unico) => (unico ? `${base}-panel` : `${base}-panel-${id}`);

/**
 * @param {string} actual - el id de la abierta
 * @param {(id: string) => void} onElegir
 * @param {boolean} [panelUnico] - un solo panel para todas (una lista que cambia según la pestaña)
 * @param {boolean} [sinPestanas] - no se pinta la barra: los paneles salen como elementos normales
 */
export const GrupoDePestanas = ({ actual, onElegir, panelUnico = false, sinPestanas = false, children }) => {
  const base = useId();
  return (
    <Contexto.Provider value={{ base, actual, onElegir, panelUnico, sinPestanas }}>
      {children}
    </Contexto.Provider>
  );
};

/**
 * @param {string} etiqueta - el nombre de la barra para los lectores
 * @param {{id: string, contenido: import('react').ReactNode, testId?: string}[]} pestanas
 * @param {(abierta: boolean, id: string) => string} claseDePestana
 * El resto (`className`, `data-testid`, `ref`, `tabIndex`...) va a la barra.
 */
export const ListaDePestanas = ({ etiqueta, pestanas, claseDePestana, ...resto }) => {
  const { base, actual, onElegir, panelUnico } = useContext(Contexto);
  const botones = useRef(new Map());

  // Si la abierta no es ninguna de la barra, la primera hace de entrada: sin
  // ninguna con tabindex 0, a la barra no se llegaba con el teclado
  const hayAbierta = pestanas.some((p) => p.id === actual);

  const alPulsar = (evento) => {
    if (evento.altKey || evento.metaKey || evento.ctrlKey) return;
    const ultima = pestanas.length - 1;
    const donde = Math.max(0, pestanas.findIndex((p) => p.id === actual));
    const destinos = {
      ArrowRight: donde === ultima ? 0 : donde + 1,
      ArrowLeft: donde === 0 ? ultima : donde - 1,
      Home: 0,
      End: ultima,
    };
    if (!(evento.key in destinos)) return;
    evento.preventDefault();
    const siguiente = pestanas[destinos[evento.key]].id;
    onElegir(siguiente);
    botones.current.get(siguiente)?.focus();
  };

  return (
    <div role="tablist" aria-label={etiqueta} {...resto}>
      {pestanas.map(({ id, contenido, testId }, indice) => {
        const abierta = id === actual;
        const entrada = abierta || (!hayAbierta && indice === 0);
        return (
          <button
            key={id}
            ref={(boton) => {
              if (boton) botones.current.set(id, boton);
              else botones.current.delete(id);
            }}
            type="button"
            role="tab"
            id={idDePestana(base, id)}
            aria-selected={abierta}
            aria-controls={idDePanel(base, id, panelUnico)}
            tabIndex={entrada ? 0 : -1}
            data-testid={testId}
            onClick={() => onElegir(id)}
            onKeyDown={alPulsar}
            className={claseDePestana(abierta, id)}
          >
            {contenido}
          </button>
        );
      })}
    </div>
  );
};

/**
 * @param {string} [id] - la pestaña de este panel (sin él, el panel único)
 * @param {import('react').ElementType} [como] - el elemento que lo pinta (un `form`, un `motion.div`...)
 * @param {boolean} [montadoSiempre] - cerrado sigue montado, oculto con `hidden`
 * @param {boolean} [enfocable] - el panel entra en el tabulador. Solo para el
 *   que no tiene nada enfocable dentro (una tabla, una clasificación) o es una
 *   lista que se desplaza: con botones o campos dentro, el panel sería una
 *   parada de más y un anillo alrededor de todo (WAI-ARIA)
 * El resto va al elemento.
 */
export const PanelDePestana = ({ id, como: Elemento = 'div', montadoSiempre = false, enfocable = false, children, ...resto }) => {
  const { base, actual, panelUnico, sinPestanas } = useContext(Contexto);
  const abierto = panelUnico || id === actual;
  if (!abierto && !montadoSiempre) return null;
  if (sinPestanas) return <Elemento hidden={!abierto} {...resto}>{children}</Elemento>;
  return (
    <Elemento
      role="tabpanel"
      id={idDePanel(base, id, panelUnico)}
      aria-labelledby={idDePestana(base, panelUnico ? actual : id)}
      tabIndex={enfocable ? 0 : undefined}
      hidden={!abierto}
      {...resto}
    >
      {children}
    </Elemento>
  );
};
