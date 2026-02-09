import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';

const SECTIONS = ['section1', 'section2', 'section3', 'section4', 'section5', 'section6', 'section7', 'section8', 'section9'];

const Terms = () => {
  const { t } = useTranslation('legal');

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white">
      <div className="layout-container flex h-full grow flex-col">
        <Header />
        <main className="flex-1 max-w-4xl mx-auto px-4 md:px-8 py-12 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              {t('terms.title')}
            </h1>
            <p className="text-sm text-gray-500 mb-10">
              {t('terms.lastUpdated')}
            </p>

            {SECTIONS.map((key) => (
              <section key={key} className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  {t(`terms.${key}.title`)}
                </h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {t(`terms.${key}.content`)}
                </p>
              </section>
            ))}
          </motion.div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Terms;
