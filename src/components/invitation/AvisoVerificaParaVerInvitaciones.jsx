import { useTranslation } from 'react-i18next';
import { useReenvioDeVerificacion } from '../../hooks/useReenvioDeVerificacion';

/**
 * Sin el correo verificado, el backend no enseña las invitaciones enviadas a esa
 * dirección (fase 3, BE-3): se dice, sin número (contarlas diría si hay alguna), con el
 * botón de reenviar del aviso de verificar. Sin el correo a mano (sin conexión, la copia
 * del dispositivo no lo guarda) no hay botón.
 *
 * @param {{ correo?: string }} props
 */
const AvisoVerificaParaVerInvitaciones = ({ correo }) => {
  const { t } = useTranslation('invitations');
  const { t: tAuth } = useTranslation('auth');
  const { reenviar, enviando, mensaje, esError } =
    useReenvioDeVerificacion(correo);

  return (
    <div
      data-testid="aviso-verificar-invitaciones"
      className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded-lg text-sm text-yellow-800"
    >
      <p>{t('player.verifyEmailNotice')}</p>
      {mensaje && (
        <p className={`mt-2 ${esError ? 'text-red-700' : 'text-green-700'}`}>
          {mensaje}
        </p>
      )}
      {correo && (
        <button
          type="button"
          onClick={reenviar}
          disabled={enviando}
          className="mt-3 font-medium underline hover:text-yellow-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {enviando
            ? tAuth('emailVerification.sending')
            : tAuth('emailVerification.resend')}
        </button>
      )}
    </div>
  );
};

export default AvisoVerificaParaVerInvitaciones;
