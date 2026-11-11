import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { resendVerificationEmailUseCase } from '../composition';

/**
 * Reenviar el correo de verificación a la dirección de la cuenta (con sesión). Lo usan
 * el aviso de verificar del panel y el de Mis invitaciones (fase 3): mismo botón, mismos
 * textos.
 *
 * @param {string|undefined} correo La dirección de la cuenta
 * @returns {{ reenviar: () => Promise<void>, enviando: boolean, mensaje: string, esError: boolean }}
 */
export const useReenvioDeVerificacion = (correo) => {
  const { t } = useTranslation('auth');
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  // Si fue error se guarda aparte y no se deduce del texto: mirar si empieza por
  // «Failed» dejaba de funcionar en cuanto el mensaje se traducía
  const [esError, setEsError] = useState(false);

  // El `disabled` del botón llega en el siguiente render: dos clics seguidos pedirían
  // dos correos. El ref corta el segundo en el acto
  const enCurso = useRef(false);

  const reenviar = async () => {
    if (enCurso.current) return;
    enCurso.current = true;
    setEnviando(true);
    setMensaje('');
    try {
      await resendVerificationEmailUseCase.execute(correo);
      setEsError(false);
      setMensaje(t('emailVerification.sent'));
    } catch (error) {
      console.error('Error resending email:', error);
      setEsError(true);
      setMensaje(t('emailVerification.failed'));
    } finally {
      enCurso.current = false;
      setEnviando(false);
    }
  };

  return { reenviar, enviando, mensaje, esError };
};
