import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ALIAS_MAX_LENGTH, loQueHayQueMandar, queLePasaAlAlias } from '../../utils/alias';

const CONFLICTO = 409;

/**
 * Poner, cambiar o quitar el alias sin salir del panel (FE #435).
 *
 * Misma hoja inferior que el resto de la aplicación, con dos diferencias
 * deliberadas respecto a las que ya había:
 *
 * - **El foco se gestiona.** Las otras declaran `aria-modal` y dejan que el
 *   tabulador se escape a los controles de detrás (#389). Esta mueve el foco
 *   al campo al abrirse, lo mantiene dentro mientras está abierta y lo
 *   devuelve a quien la abrió al cerrarse. Añadir una cuarta con el mismo
 *   agujero sería empeorar el problema a sabiendas.
 * - **Guarda ella misma**, porque no vive dentro de ningún formulario.
 */
const AliasSheet = ({ aliasActual, onGuardar, onClose }) => {
  const { t } = useTranslation('profile');
  const [valor, setValor] = useState(aliasActual || '');
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const campoRef = useRef(null);
  const panelRef = useRef(null);
  // Quién tenía el foco antes de abrir, para devolvérselo al cerrar
  const disparadorRef = useRef(null);

  useEffect(() => {
    disparadorRef.current = document.activeElement;
    campoRef.current?.focus();

    return () => {
      // `focus()` sobre un elemento que ya no está en el documento no hace
      // nada y no lanza, así que no hace falta comprobarlo
      disparadorRef.current?.focus?.();
    };
  }, []);

  useEffect(() => {
    const alPulsarTecla = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        // Igual que el fondo y la ✕: con una peticion en vuelo, no
        if (!guardando) onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      // Atrapar el foco: `aria-modal` promete que lo de fuera es inerte, y sin
      // esto es mentira — un tabulador se va a los botones de detrás
      const focusables = panelRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;

      const primero = focusables[0];
      const ultimo = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener('keydown', alPulsarTecla, true);
    return () => document.removeEventListener('keydown', alPulsarTecla, true);
    // `guardando` entra en las dependencias a proposito: el listener tiene que
    // leer el valor de ahora, no el del primer render
  }, [onClose, guardando]);

  const alEscribir = (e) => {
    if (error) setError(null);
    setValor(e.target.value);
  };

  const guardar = async () => {
    const problema = queLePasaAlAlias(valor);
    if (problema) {
      setError(problema);
      return;
    }

    // `undefined` es «no ha cambiado nada»: cerrar sin llamar a la API
    const aEnviar = loQueHayQueMandar(valor, aliasActual);
    if (aEnviar === undefined) {
      onClose();
      return;
    }

    setGuardando(true);
    try {
      await onGuardar(aEnviar);
      onClose();
    } catch (err) {
      // El conflicto se queda DENTRO de la hoja, con lo tecleado intacto: si
      // se cerrara para enseñar un aviso fuera, habría que escribirlo otra vez
      setError(err?.status === CONFLICTO ? 'alias.errors.taken' : 'alias.errors.saveFailed');
    } finally {
      setGuardando(false);
    }
  };

  const hayAlgoQueQuitar = Boolean(aliasActual);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      role="presentation"
      /* Con una peticion en vuelo no se cierra: si se cerrara y esa peticion
         acabara en 409, el aviso caeria sobre un componente desmontado y el
         conflicto desapareceria sin decir nada, dejando a quien lo escribio
         creyendo que su alias quedo puesto */
      onClick={guardando ? undefined : onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('alias.sheet.title')}
        className="w-full max-w-md rounded-t-2xl bg-white p-4 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="min-w-0 truncate text-sm font-semibold text-gray-600">
            {t('alias.sheet.title')}
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label={t('alias.sheet.close')}
            className="flex-shrink-0 text-lg leading-none text-gray-400 hover:text-gray-600 disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <input
          ref={campoRef}
          type="text"
          value={valor}
          onChange={alEscribir}
          placeholder={t('edit.personalInfo.aliasPlaceholder')}
          maxLength={ALIAS_MAX_LENGTH}
          aria-label={t('edit.personalInfo.alias')}
          aria-describedby={error ? 'alias-sheet-error' : 'alias-sheet-help'}
          aria-invalid={error ? 'true' : undefined}
          data-testid="alias-sheet-input"
          className={`w-full rounded-lg border px-3 py-3 text-base focus:outline-none focus:ring-2 ${
            error ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-primary'
          }`}
        />

        {error ? (
          <p id="alias-sheet-error" role="alert" className="mt-2 text-sm text-red-600">
            {t(error)}
          </p>
        ) : (
          <p id="alias-sheet-help" className="mt-2 text-sm text-gray-500">
            {t('edit.personalInfo.aliasHelp')}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          {hayAlgoQueQuitar && (
            /* Quitar el alias es vaciar el campo, pero nadie lo adivina: el
               botón lo hace explícito. No guarda solo — deja el campo vacío y
               se confirma abajo, como en el perfil */
            <button
              type="button"
              onClick={() => {
                setError(null);
                setValor('');
                campoRef.current?.focus();
              }}
              className="rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 active:bg-gray-100"
            >
              {t('edit.personalInfo.aliasClear')}
            </button>
          )}
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            data-testid="alias-sheet-save"
            className="flex-1 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white active:bg-primary-700 disabled:opacity-60"
          >
            {guardando ? t('alias.sheet.saving') : t('alias.sheet.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AliasSheet;
