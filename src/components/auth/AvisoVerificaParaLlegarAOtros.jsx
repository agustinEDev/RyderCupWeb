import { useTranslation } from 'react-i18next';
import { useReenvioDeVerificacion } from '../../hooks/useReenvioDeVerificacion';

/**
 * Sin el correo verificado no se puede invitar, pedir amistad ni crear competiciones
 * (B-17 de la auditoría de la fase 6, 15 nov 2026): se dice, con el botón de reenviar del
 * aviso de verificar. Sin el correo a mano (sin conexión, la copia del dispositivo no lo
 * guarda) no hay botón.
 *
 * @param {{ correo?: string }} props
 */
const AvisoVerificaParaLlegarAOtros = ({ correo }) => {
  const { t } = useTranslation('auth');
  const { reenviar, enviando, mensaje, esError } =
    useReenvioDeVerificacion(correo);

  return (
    <div
      data-testid="aviso-verificar-para-llegar-a-otros"
      role="status"
      className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded-lg text-sm text-yellow-800"
    >
      <p>{t('emailVerification.outreachNotice')}</p>
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
            ? t('emailVerification.sending')
            : t('emailVerification.resend')}
        </button>
      )}
    </div>
  );
};

export default AvisoVerificaParaLlegarAOtros;
