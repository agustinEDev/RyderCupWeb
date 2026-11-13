import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ModalShell from '../ui/ModalShell';

/**
 * Pide la contraseña actual antes de ir a Google a vincularlo (RyderCupAm #753), o antes
 * de desvincularlo (tabla D, 8 nov 2026). Con solo la sesión, una robada podía añadir un
 * Google que sobrevive a restablecer la contraseña, o quitar el del dueño.
 *
 * De un modal se sale siempre: «Cancelar» y Escape cierran también mientras comprueba;
 * lo escrito no se pierde por un toque en el fondo.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {(password: string) => Promise<string|null>} props.alConfirmar Devuelve la
 *   clave del error que enseñar en la ventana, o null si no hay nada que enseñar en ella
 *   (fue bien, o el fallo ya lo avisó quien llama con un toast: D9)
 * @param {'vincular'|'desvincular'} [props.para] Para vincular, si va bien la página se va
 *   a Google y la ventana se queda; para desvincular, la página se queda y la ventana se
 *   cierra (también tras un fallo general avisado con un toast)
 */
const ContrasenaParaGoogleModal = ({
  isOpen,
  onClose,
  alConfirmar,
  para = 'vincular',
}) => {
  const desvincular = para === 'desvincular';
  const { t } = useTranslation('profile');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [comprobando, setComprobando] = useState(false);
  const inputRef = useRef(null);
  // Cuál es la comprobación en curso: lo que responda una anterior, o una de antes de
  // cancelar, ya no toca la ventana (CodeRabbit en FE #1058)
  const comprobacion = useRef(0);
  const titulo = useId();
  const explicacion = useId();
  const campo = useId();

  const cierra = () => {
    comprobacion.current += 1;
    setPassword('');
    setError(null);
    setComprobando(false);
    onClose();
  };

  const envia = async (e) => {
    e.preventDefault();
    if (!password || comprobando) return;
    const esta = ++comprobacion.current;
    setComprobando(true);
    setError(null);
    let fallo;
    try {
      fallo = await alConfirmar(password);
    } catch (errorAlComprobar) {
      console.error('Password check failed:', errorAlComprobar);
      fallo = 'edit.linkedAccounts.passwordCheckFailed';
    }
    if (esta !== comprobacion.current) return;
    if (fallo) {
      setError(fallo);
      setComprobando(false);
    } else if (desvincular) {
      // Desvinculado: la página se queda, la ventana se cierra y olvida lo escrito
      cierra();
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={cierra}
      labelledBy={titulo}
      describedBy={explicacion}
      closeOnBackdrop={false}
      busy={comprobando}
      inicialRef={inputRef}
      testId="contrasena-para-google"
    >
      <form onSubmit={envia} className="p-6">
        <h2 id={titulo} className="text-lg font-bold text-gray-900 mb-2">
          {t('edit.linkedAccounts.passwordTitle')}
        </h2>
        <p id={explicacion} className="text-sm text-gray-600 mb-4">
          {t(
            desvincular
              ? 'edit.linkedAccounts.unlinkPasswordExplanation'
              : 'edit.linkedAccounts.passwordExplanation',
          )}
        </p>
        <label
          htmlFor={campo}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {t('edit.linkedAccounts.currentPassword')}
        </label>
        <input
          id={campo}
          ref={inputRef}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            // Lo escrito ya no es lo que falló
            setError(null);
          }}
          aria-invalid={error ? 'true' : 'false'}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus-visible:border-primary"
        />
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {t(error)}
          </p>
        )}
        <div className="mt-6 flex gap-3 justify-end">
          <button
            type="button"
            onClick={cierra}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200"
          >
            {t('edit.linkedAccounts.cancel')}
          </button>
          <button
            type="submit"
            disabled={!password || comprobando}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {comprobando
              ? t('edit.linkedAccounts.checking')
              : t(
                  desvincular
                    ? 'edit.linkedAccounts.unlink'
                    : 'edit.linkedAccounts.continue',
                )}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

export default ContrasenaParaGoogleModal;
