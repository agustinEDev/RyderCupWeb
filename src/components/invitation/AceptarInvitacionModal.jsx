import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ModalShell from '../ui/ModalShell';
import SelectorDeGenero from '../profile/SelectorDeGenero';
import SelectorDeBarraGeneral from '../enrollment/SelectorDeBarraGeneral';
import { colorHabitual } from '../../utils/barraPorDefecto';

/**
 * Aceptar una invitación (barras por campo, F1): la barra general es
 * obligatoria, con la habitual de su género marcada; a quien no tiene el
 * género en su perfil se le pregunta también (#710). De él se sale siempre.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {boolean} props.pideGenero
 * @param {string|null} props.generoDelJugador
 * @param {Function} props.onClose
 * @param {(barra: string, genero: string|null) => void} props.onConfirm
 */
const AceptarInvitacionModal = ({ isOpen, ...props }) =>
  isOpen ? <Contenido {...props} /> : null;

const Contenido = ({ pideGenero, generoDelJugador, onClose, onConfirm }) => {
  const { t } = useTranslation('competitions');
  const [genero, setGenero] = useState('');
  // null mientras no se elige: la habitual de su género; al cambiar el género
  // vuelve a null, para no quedarse con la del otro
  const [elegida, setElegida] = useState(null);
  const suGenero = (pideGenero ? genero : generoDelJugador) || null;
  const barra = elegida ?? colorHabitual(suGenero) ?? '';
  const falta = !barra || (pideGenero && !genero);

  return (
    <ModalShell
      isOpen
      closeOnBackdrop={false}
      onClose={onClose}
      labelledBy="aceptar-invitacion-titulo"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!falta) onConfirm(barra, pideGenero ? genero : null);
        }}
        className="space-y-4"
      >
        <h2
          id="aceptar-invitacion-titulo"
          className="text-lg font-bold text-gray-900"
        >
          {t('tees.accept.title')}
        </h2>
        {pideGenero && (
          <SelectorDeGenero
            value={genero}
            onChange={(nuevo) => {
              setGenero(nuevo);
              setElegida(null);
            }}
          />
        )}
        <SelectorDeBarraGeneral
          id="barra-al-aceptar"
          value={barra}
          onChange={setElegida}
        />
        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200"
          >
            {t('tees.accept.cancel')}
          </button>
          <button
            type="submit"
            data-testid="aceptar-con-barra"
            disabled={falta}
            className="min-h-11 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {t('tees.accept.confirm')}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

export default AceptarInvitacionModal;
