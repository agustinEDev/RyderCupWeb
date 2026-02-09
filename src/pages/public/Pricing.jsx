import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';

const FREE_FEATURES = ['competitions', 'players', 'scheduling', 'scoring', 'teams', 'courses', 'bilingual'];
const PRO_FEATURES = ['everything', 'players', 'statistics', 'export', 'branding', 'priority'];
const ENTERPRISE_FEATURES = ['everything', 'unlimited', 'multi', 'api', 'sso', 'dedicated'];

const Pricing = () => {
  const { t } = useTranslation('pricing');
  const navigate = useNavigate();

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white">
      <div className="layout-container flex h-full grow flex-col">
        <Header />
        <main className="flex-1">
          {/* Hero */}
          <div className="max-w-7xl mx-auto px-4 md:px-8 pt-16 pb-12 text-center">
            <motion.h1
              className="text-3xl md:text-5xl font-bold text-gray-900 mb-4"
              {...fadeInUp}
            >
              {t('title')}
            </motion.h1>
            <motion.p
              className="text-lg text-gray-600 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {t('subtitle')}
            </motion.p>
          </div>

          {/* Pricing Cards */}
          <div className="max-w-7xl mx-auto px-4 md:px-8 pb-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Free Plan */}
              <motion.div
                className="border-2 border-primary rounded-2xl p-8 relative"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t('free.name')}</h3>
                <p className="text-gray-600 text-sm mb-4">{t('free.description')}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">{t('free.price')}</span>
                  <span className="text-gray-500 ml-2">{t('free.period')}</span>
                </div>
                <button
                  onClick={() => navigate('/register')}
                  className="w-full py-3 px-4 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors mb-8"
                >
                  {t('free.cta')}
                </button>
                <ul className="space-y-3">
                  {FREE_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{t(`free.features.${feature}`)}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Pro Plan */}
              <motion.div
                className="border border-gray-200 rounded-2xl p-8 relative opacity-60"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 0.6, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gray-400 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {t('pro.badge')}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t('pro.name')}</h3>
                <p className="text-gray-600 text-sm mb-4">{t('pro.description')}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">{t('pro.price')}</span>
                  <span className="text-gray-500 ml-2">{t('pro.period')}</span>
                </div>
                <button
                  disabled
                  className="w-full py-3 px-4 bg-gray-300 text-gray-500 font-bold rounded-lg cursor-not-allowed mb-8"
                >
                  {t('pro.cta')}
                </button>
                <ul className="space-y-3">
                  {PRO_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-500">{t(`pro.features.${feature}`)}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Enterprise Plan */}
              <motion.div
                className="border border-gray-200 rounded-2xl p-8 relative opacity-60"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 0.6, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gray-400 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {t('enterprise.badge')}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t('enterprise.name')}</h3>
                <p className="text-gray-600 text-sm mb-4">{t('enterprise.description')}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">{t('enterprise.price')}</span>
                  <span className="text-gray-500 ml-2">{t('enterprise.period')}</span>
                </div>
                <button
                  disabled
                  className="w-full py-3 px-4 bg-gray-300 text-gray-500 font-bold rounded-lg cursor-not-allowed mb-8"
                >
                  {t('enterprise.cta')}
                </button>
                <ul className="space-y-3">
                  {ENTERPRISE_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-500">{t(`enterprise.features.${feature}`)}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="bg-gray-50 py-16">
            <div className="max-w-3xl mx-auto px-4 md:px-8 text-center">
              <motion.h2
                className="text-2xl md:text-3xl font-bold text-gray-900 mb-4"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
              >
                {t('bottomCta.title')}
              </motion.h2>
              <p className="text-gray-600 mb-8">{t('bottomCta.subtitle')}</p>
              <button
                onClick={() => navigate('/register')}
                className="py-3 px-8 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors"
              >
                {t('bottomCta.button')}
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Pricing;
