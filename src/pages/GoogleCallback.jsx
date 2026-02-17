import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../hooks/useAuthContext';
import { googleLoginUseCase, linkGoogleAccountUseCase } from '../composition';
import { verifyOAuthState } from '../utils/googleOAuth';
import customToast from '../utils/toast';

const GoogleCallback = () => {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser, updateCsrfToken } = useAuthContext();
  const hasProcessed = useRef(false);
  const [error, setError] = useState(null);
  const [flow, setFlow] = useState('login');

  useEffect(() => {
    // Prevent double execution in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const stateParam = searchParams.get('state');

    const processCallback = async () => {
      // Verify CSRF nonce from state parameter
      const { flow: parsedFlow, valid } = verifyOAuthState(stateParam);
      setFlow(parsedFlow);

      if (!valid) {
        setError(t('google.callbackError'));
        return;
      }

      // Handle Google OAuth error
      if (errorParam) {
        setError(t('google.callbackError'));
        return;
      }

      // Missing authorization code
      if (!code) {
        setError(t('google.missingCode'));
        return;
      }

      try {
        if (parsedFlow === 'link') {
          // Link Google account flow
          await linkGoogleAccountUseCase.execute(code);
          customToast.success(t('google.linkSuccess'));
          navigate('/profile/edit', { replace: true });
        } else {
          // Login/register flow
          const { user, csrfToken, isNewUser } = await googleLoginUseCase.execute(code);

          // Update auth context
          setUser(user);
          updateCsrfToken(csrfToken);

          if (isNewUser) {
            customToast.info(t('google.welcomeNewUser'));
            navigate('/auth/complete-profile', { replace: true });
          } else {
            customToast.success(t('login.welcomeMessage', { name: user.firstName }));
            navigate('/dashboard', { replace: true });
          }
        }
      } catch (err) {
        console.error('Google OAuth callback error:', err);

        if (err.status === 423) {
          setError(t('google.accountLocked'));
        } else if (err.status === 429) {
          setError(t('google.rateLimited'));
        } else if (err.status === 409) {
          setError(t('google.alreadyLinked'));
        } else {
          setError(err.message || t('google.genericError'));
        }
      }
    };

    processCallback();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200 max-w-md w-full mx-4 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {t('google.callbackError')}
          </h2>
          <p className="text-gray-600 text-sm mb-6">{error}</p>
          <Link
            to={flow === 'link' ? '/profile/edit' : '/login'}
            className="inline-block bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-6 rounded-lg transition-colors"
          >
            {flow === 'link' ? t('google.backToProfile') : t('login.signInButton')}
          </Link>
        </div>
      </div>
    );
  }

  // Loading state while processing
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">{t('google.processing')}</p>
      </div>
    </div>
  );
};

export default GoogleCallback;
