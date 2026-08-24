import { Link, useLocation } from 'react-router';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useRedirectIfAuthenticated } from '../hooks/useRedirectIfAuthenticated';
import SignInForm from '../components/auth/SignInForm';
import FullScreenLoader from '../components/ui/FullScreenLoader';
import BrandMark from '../components/ui/BrandMark';

const Login = () => {
  const { t } = useTranslation(['auth', 'common']);
  const location = useLocation();
  const successMessage = location.state?.message;
  const isCheckingSession = useRedirectIfAuthenticated();

  // Con sesión guardada por confirmar, el formulario no se pinta: quien llega
  // aquí desde el icono de la PWA se va al dashboard sin verlo (FE #305)
  if (isCheckingSession) {
    return <FullScreenLoader />;
  }

  return (
    <div className="relative flex min-h-screen w-full bg-white">
      <div className="flex w-full">

        {/* Left Side - Hero Image/Brand (Hidden on Mobile) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:flex lg:w-1/2 relative bg-primary overflow-hidden"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
          </div>

          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-20"
            style={{
              backgroundImage: `url("https://images.unsplash.com/photo-1535131749006-b7f58c99034b?q=80&w=2000")`
            }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <BrandMark className="size-10" tinta="blanco" />
              <div className="flex flex-col group-hover:opacity-80 transition-opacity">
                <h1 className="text-2xl font-bold font-poppins">RyderCupFriends</h1>
                <span className="text-sm font-semibold text-accent -mt-1">RCF</span>
              </div>
            </Link>

            {/* Middle Content */}
            <div className="space-y-6">
              <div>
                <h2 className="text-4xl font-black font-poppins mb-4 leading-tight">
                  {t('login.welcomeBack')}
                </h2>
                <p className="text-xl text-white/90 leading-relaxed">
                  {t('login.welcomeDescription')}
                </p>
              </div>

              {/* Features */}
              <div className="space-y-4 mt-8">
                {[
                  { icon: '🏆', text: t('login.features.tournaments') },
                  { icon: '⛳', text: t('login.features.statistics') },
                  { icon: '📊', text: t('login.features.liveScoring') },
                  { icon: '👥', text: t('login.features.friends') }
                ].map((item, idx) => (
                  <motion.div
                    key={item.text}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + idx * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-xl">
                      {item.icon}
                    </div>
                    <span className="text-white/90">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="text-white/70 text-sm">
              {t('common:footer.copyrightShort', { year: new Date().getFullYear() })}
            </div>
          </div>
        </motion.div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >

            {/* Mobile Logo */}
            <Link to="/" className="flex lg:hidden items-center gap-3 mb-8 justify-center group">
              <BrandMark className="size-10" />
              <div className="flex flex-col group-hover:opacity-80 transition-opacity">
                <h1 className="text-2xl font-bold font-poppins text-gray-900">RyderCupFriends</h1>
                <span className="text-sm font-semibold text-primary -mt-1">RCF</span>
              </div>
            </Link>

            {/* Form Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">

              {/* Header */}
              <div className="mb-8">
                <h2 className="text-3xl font-black text-gray-900 font-poppins mb-2">
                  {t('login.title')}
                </h2>
                <p className="text-gray-600">
                  {t('login.subtitle')}
                </p>
              </div>

              {/* Success Message */}
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-green-700 text-sm font-medium">{successMessage}</p>
                  </div>
                </motion.div>
              )}

              <SignInForm />

            </div>

            {/* Back to Home */}
            <Link
              to="/"
              className="flex items-center justify-center gap-2 mt-6 text-gray-600 hover:text-primary transition-colors group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm font-medium">{t('login.backToHome')}</span>
            </Link>

          </motion.div>
        </div>

      </div>
    </div>
  );
};

export default Login;
