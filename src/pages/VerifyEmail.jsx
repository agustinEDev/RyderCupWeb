import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { verifyEmailUseCase, resendVerificationLinkUseCase } from '../composition';
import BlockLoader from '../components/ui/BlockLoader';
import { stripSecretsFromAddressBar, readStrippedSecret } from '../utils/stripSecretsFromAddressBar';


const VerifyEmail = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  // Tras quitarlo de la barra, una recarga lo recupera del historial
  const token = searchParams.get('token') || readStrippedSecret('token');

  // Leido: fuera de la barra, antes de que Replay grabe el href de la pagina
  // y de que acabe en el Referer (utils/stripSecretsFromAddressBar.js)
  useEffect(() => {
    stripSecretsFromAddressBar();
  }, []);

  // verifying | verifiedSignIn | deactivated | expired | error | invalid
  const [status, setStatus] = useState('verifying');
  const hasVerifiedRef = useRef(false); // Usar ref para prevenir doble ejecución
  // Pedir otro enlace con el caducado (fase 3): idle | sending | sent | limited | failed
  const [reenvio, setReenvio] = useState('idle');

  // El `disabled` llega en el siguiente render: el ref corta un segundo clic en el acto
  const pidiendoEnlace = useRef(false);
  const pideOtroEnlace = async () => {
    if (pidiendoEnlace.current) return;
    pidiendoEnlace.current = true;
    setReenvio('sending');
    try {
      await resendVerificationLinkUseCase.execute(token);
      setReenvio('sent');
    } catch (error) {
      if (error?.status === 429) {
        setReenvio('limited');
        return;
      }
      console.error('Error resending the verification link:', error);
      setReenvio('failed');
    } finally {
      // Enviado, el botón queda desactivado; si falló, se puede volver a pedir
      pidiendoEnlace.current = false;
    }
  };

  useEffect(() => {
    // Prevenir ejecución múltiple usando ref (más confiable que state con React Strict Mode)
    if (hasVerifiedRef.current) return;
    hasVerifiedRef.current = true;

    const verifyEmail = async () => {
      if (!token || token.trim() === '') {
        setStatus('invalid');
        return;
      }

      try {
        await verifyEmailUseCase.execute(token);

        await new Promise(resolve => setTimeout(resolve, 1500));
        // Verificar no abre sesión (RyderCupAm #753): se entra con la contraseña. Con
        // una sesión ya abierta, el enlace de iniciar sesión lleva al panel
        setStatus('verifiedSignIn');
      } catch (error) {
        console.error('❌ Verification error:', error);
        await new Promise(resolve => setTimeout(resolve, 1500));
        if (error?.errorCode === 'VERIFICATION_TOKEN_EXPIRED') {
          // Es el de la cuenta, pero pasaron sus 48 horas: se ofrece otro (fase 3)
          setStatus('expired');
          return;
        }
        // Desactivada: el correo SÍ quedó verificado, pero no entra (RyderCupAm #750)
        setStatus(error?.errorCode === 'ACCOUNT_DEACTIVATED' ? 'deactivated' : 'error');
      }
    };

    verifyEmail();
  }, [token, navigate]);

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white">
      <div className="layout-container flex h-full grow flex-col">
        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col w-full max-w-[512px] py-5">

            {/* Spacer */}
            <div className="w-full" style={{ height: '80px' }}></div>

            {/* Content based on status */}
            <div className="flex flex-col items-center justify-center p-8">

              {/* Verifying state */}
              {status === 'verifying' && (
                <>
                  {/* `mb-6` y sin relleno propio: sus hermanas —el icono de
                      exito y el de error— miden asi, y con el `py-12` de serie
                      la tarjeta daba un salto al cambiar de estado */}
                  <div className="flex justify-center mb-6">
                    <BlockLoader sinRelleno />
                  </div>
                  <h1 className="text-gray-900 text-2xl font-bold mb-4 text-center">
                    {t('verifyEmail.verifyingTitle')}
                  </h1>
                  <p className="text-gray-600 text-center">
                    {t('verifyEmail.verifyingBody')}
                  </p>
                </>
              )}

              {/* Verificado, sin sesión: a iniciar sesión (RyderCupAm #753) */}
              {status === 'verifiedSignIn' && (
                <>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h1 className="text-gray-900 text-2xl font-bold mb-4 text-center">
                    {t('verifyEmail.successTitle')}
                  </h1>
                  <p className="text-gray-600 text-center mb-6">
                    {t('verifyEmail.signInNow')}
                  </p>
                  {/* Con recarga: con una sesión ya abierta, el login lleva al panel y este
                      ya pregunta el usuario verificado, sin el aviso de verificar */}
                  <a
                    href="/login"
                    className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-wide hover:bg-primary/90 transition-all"
                  >
                    {t('verifyEmail.goToLogin')}
                  </a>
                </>
              )}

              {/* Enlace caducado: se ofrece otro, sin sesión (fase 3) */}
              {status === 'expired' && (
                <>
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h1 className="text-gray-900 text-2xl font-bold mb-4 text-center">
                    {t('verifyEmail.expiredTitle')}
                  </h1>
                  <p className="text-gray-600 text-center mb-6">
                    {t('verifyEmail.expiredMessage')}
                  </p>
                  {reenvio !== 'idle' && reenvio !== 'sending' && (
                    <p
                      role="status"
                      className={`text-center mb-6 ${reenvio === 'sent' ? 'text-green-700' : 'text-red-700'}`}
                    >
                      {reenvio === 'sent' && t('verifyEmail.resendLinkSent')}
                      {reenvio === 'limited' && t('common:demasiadasPeticiones')}
                      {reenvio === 'failed' && t('emailVerification.failed')}
                    </p>
                  )}
                  {/* Enviado, no se vuelve a pedir: la respuesta es la misma con
                      cualquier token y otro clic solo gastaría el límite */}
                  <button
                    type="button"
                    onClick={pideOtroEnlace}
                    disabled={reenvio === 'sending' || reenvio === 'sent'}
                    className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-wide hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('verifyEmail.resendLink')}
                  </button>
                  {/* La salida, como en la pantalla de error */}
                  <div className="flex flex-col gap-3 items-center mt-3">
                    <Link
                      to="/login"
                      className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-100 text-gray-900 text-sm font-bold leading-normal tracking-wide hover:bg-gray-200 transition-all"
                    >
                      {t('verifyEmail.goToLogin')}
                    </Link>
                    <Link
                      to="/"
                      className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-100 text-gray-900 text-sm font-bold leading-normal tracking-wide hover:bg-gray-200 transition-all"
                    >
                      {t('verifyEmail.goToHome')}
                    </Link>
                  </div>
                </>
              )}

              {/* Cuenta desactivada: verificado, pero sin sesión ni panel */}
              {status === 'deactivated' && (
                <>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h1 className="text-gray-900 text-2xl font-bold mb-4 text-center">
                    {t('verifyEmail.successTitle')}
                  </h1>
                  <p role="alert" className="text-gray-600 text-center mb-6">
                    {t('google.accountDeactivated')}
                  </p>
                  <Link
                    to="/"
                    className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-wide hover:bg-primary/90 transition-all"
                  >
                    {t('verifyEmail.goToHome')}
                  </Link>
                </>
              )}

              {/* Error state */}
              {status === 'error' && (
                <>
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h1 className="text-gray-900 text-2xl font-bold mb-4 text-center">
                    {t('verifyEmail.errorTitle')}
                  </h1>
                  <p className="text-gray-600 text-center mb-6">
                    {t('verifyEmail.errorMessage')}
                  </p>
                  <div className="flex flex-col gap-3 items-center">
                    <Link
                      to="/login"
                      className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-wide hover:bg-primary/90 transition-all"
                    >
                      {t('verifyEmail.goToLogin')}
                    </Link>
                    <Link
                      to="/"
                      className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-100 text-gray-900 text-sm font-bold leading-normal tracking-wide hover:bg-gray-200 transition-all"
                    >
                      {t('verifyEmail.goToHome')}
                    </Link>
                  </div>
                </>
              )}

              {/* Invalid token state */}
              {status === 'invalid' && (
                <>
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h1 className="text-gray-900 text-2xl font-bold mb-4 text-center">
                    {t('verifyEmail.invalidTitle')}
                  </h1>
                  <p className="text-gray-600 text-center mb-6">
                    {t('verifyEmail.invalidMessage')}
                  </p>
                  <Link
                    to="/"
                    className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-wide hover:bg-primary/90 transition-all"
                  >
                    {t('verifyEmail.goToHome')}
                  </Link>
                </>
              )}
            </div>

            {/* Back to Home */}
            <Link to="/" className="text-center mt-8">
              <p className="text-gray-500 text-sm font-normal hover:text-primary transition-colors">
                ← {t('verifyEmail.backToHome')}
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
