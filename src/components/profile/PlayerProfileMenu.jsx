import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Ban, UserMinus } from 'lucide-react';

/**
 * El «⋯» del perfil de otro jugador: lo que no es la acción principal.
 *
 * «Eliminar amigo» solo entre amigos; «Bloquear» siempre, también a quien no
 * lo es (22 oct). Elegir una opción solo avisa: la confirmación la pide la
 * página, que es quien sabe qué pasa después.
 */
const PlayerProfileMenu = ({ isFriend, disabled = false, onRemove, onBlock, t }) => {
  const [isOpen, setIsOpen] = useState(false);
  const contenedor = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const alPulsarFuera = (event) => {
      if (contenedor.current && !contenedor.current.contains(event.target)) setIsOpen(false);
    };
    const alPulsarTecla = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', alPulsarFuera);
    document.addEventListener('touchstart', alPulsarFuera);
    document.addEventListener('keydown', alPulsarTecla);
    return () => {
      document.removeEventListener('mousedown', alPulsarFuera);
      document.removeEventListener('touchstart', alPulsarFuera);
      document.removeEventListener('keydown', alPulsarTecla);
    };
  }, [isOpen]);

  const elige = (accion) => () => {
    setIsOpen(false);
    accion();
  };

  return (
    <div className="relative shrink-0" ref={contenedor}>
      <button
        type="button"
        onClick={() => setIsOpen((abierto) => !abierto)}
        disabled={disabled}
        aria-label={t('playerProfile:menu.label')}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="p-2 -m-1 text-gray-500 rounded-full hover:bg-gray-100 hover:text-gray-700 disabled:opacity-60"
        data-testid="player-profile-menu"
      >
        <MoreHorizontal className="w-5 h-5" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-48 max-w-[calc(100vw-2rem)] py-1 bg-white border border-gray-200 rounded-lg shadow-lg"
        >
          {isFriend && (
            <button
              type="button"
              role="menuitem"
              onClick={elige(onRemove)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
              data-testid="player-profile-menu-remove"
            >
              <UserMinus className="w-4 h-4 shrink-0" aria-hidden="true" />
              {t('playerProfile:menu.remove')}
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={elige(onBlock)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
            data-testid="player-profile-menu-block"
          >
            <Ban className="w-4 h-4 shrink-0" aria-hidden="true" />
            {t('playerProfile:menu.block')}
          </button>
        </div>
      )}
    </div>
  );
};

export default PlayerProfileMenu;
