import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { getUserData, setUserData } from '../utils/secureAuth';
import { verifyEmailUseCase } from '../composition'; // Nuevo


const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('verifying'); // verifying | success | error | invalid
  const [message, setMessage] = useState('');
  const redirectTimeoutRef = useRef(null);
  const hasVerifiedRef = useRef(false); // Usar ref para prevenir doble ejecución

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Prevenir ejecución múltiple usando ref (más confiable que state con React Strict Mode)
    if (hasVerifiedRef.current) return;
    hasVerifiedRef.current = true;

    const verifyEmail = async () => {
      if (!token || token.trim() === '') {
        setStatus('invalid');
        setMessage('Verification token is missing or invalid.');
        return;
      }

      try {
        console.log('🔄 Verifying email with token...');
        const updatedUserEntity = await verifyEmailUseCase.execute(token);
        console.log('✅ Email verified successfully:', updatedUserEntity);

        // Update user data in secure storage if logged in
        const userData = getUserData();
        if (userData && userData.id === updatedUserEntity.id) {
          const updatedUserPlain = updatedUserEntity.toPersistence();
          setUserData(updatedUserPlain);
          console.log('📝 Secure storage updated with verified status');
        }

        await new Promise(resolve => setTimeout(resolve, 1500));
        setStatus('success');
        setMessage('Your email has been verified successfully!');

        console.log('⏱️ Redirecting to dashboard in 3 seconds...');
        redirectTimeoutRef.current = setTimeout(() => {
          navigate('/dashboard');
        }, 3000);

      } catch (error) {
        console.error('❌ Verification error:', error);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setStatus('error');
        setMessage(error.message || 'Failed to verify email. The token may be invalid or expired.');
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
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mb-6"></div>
                  <h1 className="text-gray-900 text-2xl font-bold mb-4 text-center">
                    Verifying your email...
                  </h1>
                  <p className="text-gray-600 text-center">
                    Please wait while we verify your email address.
                  </p>
                </>
              )}

              {/* Success state */}
              {status === 'success' && (
                <>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h1 className="text-gray-900 text-2xl font-bold mb-4 text-center">
                    Email Verified!
                  </h1>
                  <p className="text-gray-600 text-center mb-6">
                    {message}
                  </p>
                  <p className="text-gray-500 text-sm text-center">
                    Redirecting to dashboard in 3 seconds...
                  </p>
                  <Link
                    to="/dashboard"
                    className="mt-6 flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-wide hover:bg-primary/90 transition-all"
                  >
                    Go to Dashboard Now
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
                    Verification Failed
                  </h1>
                  <p className="text-gray-600 text-center mb-6">
                    {message}
                  </p>
                  <div className="flex flex-col gap-3 items-center">
                    <Link
                      to="/dashboard"
                      className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-wide hover:bg-primary/90 transition-all"
                    >
                      Go to Dashboard
                    </Link>
                    <Link
                      to="/profile"
                      className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-100 text-gray-900 text-sm font-bold leading-normal tracking-wide hover:bg-gray-200 transition-all"
                    >
                      Go to Profile
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
                    Invalid Link
                  </h1>
                  <p className="text-gray-600 text-center mb-6">
                    {message}
                  </p>
                  <Link
                    to="/"
                    className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-wide hover:bg-primary/90 transition-all"
                  >
                    Go to Home
                  </Link>
                </>
              )}
            </div>

            {/* Back to Home */}
            <Link to="/" className="text-center mt-8">
              <p className="text-gray-500 text-sm font-normal hover:text-primary transition-colors">
                ← Back to Home
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
