import { useTranslation } from 'react-i18next';

/**
 * La casilla de los Términos (que declara además la edad mínima) y, fuera de
 * ella, el aviso de privacidad. La privacidad se informa, no se acepta: el
 * tratamiento se basa en el contrato, no en un consentimiento.
 *
 * Vive aquí porque la piden dos pantallas: el registro y la de completar el
 * perfil, por la que pasan los usuarios nuevos de Google que entran desde
 * /login o /start sin haber visto el registro.
 *
 * Los enlaces abren pestaña nueva para no perder lo escrito.
 *
 * @param {Object} props
 * @param {string} props.id - id de la casilla; el del error es `${id}-error`
 * @param {boolean} props.checked
 * @param {(checked: boolean) => void} props.onChange
 * @param {string} [props.error] - texto del error, ya traducido
 * @param {boolean} [props.disabled]
 */
const AceptacionDeTerminos = ({ id, checked, onChange, error, disabled = false }) => {
  const { t } = useTranslation('auth');
  const idDelError = `${id}-error`;

  return (
    <div className="pt-2">
      <div className="flex items-start gap-2">
        <input
          id={id}
          type="checkbox"
          name={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          aria-required="true"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? idDelError : undefined}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <label htmlFor={id} className="text-xs text-gray-700">
          {t('register.acceptTermsPrefix')}{' '}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary-600 font-semibold"
          >
            {t('register.termsLink')}
          </a>
          {' '}{t('register.acceptTermsSuffix')}
        </label>
      </div>
      {error && (
        <p id={idDelError} role="alert" className="text-red-500 text-xs mt-2">
          {error}
        </p>
      )}
      <p className="text-xs text-gray-600 mt-3">
        {t('register.privacyNoticePrefix')}{' '}
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary-600 font-semibold"
        >
          {t('register.privacyLink')}
        </a>
        {t('register.privacyNoticeSuffix')}
      </p>
    </div>
  );
};

export default AceptacionDeTerminos;
