import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import VolverDeLoLegal from '../../components/layout/VolverDeLoLegal';
import { URL_RFEG } from '../../components/golf_course/FuenteRfeg';

// La sexta es «Fuentes de datos y licencias», que lleva enlaces y se pinta aparte
const ANTES_DE_LAS_FUENTES = ['section1', 'section2', 'section3', 'section4', 'section5'];
const DESPUES_DE_LAS_FUENTES = ['section7'];

/**
 * A quién se cita y dónde está su licencia. Los nombres y lo que aporta cada
 * fuente van por `t()`; las direcciones no se traducen, y por eso viven aquí.
 */
const FUENTES = [
  ['rfeg', URL_RFEG],
  ['osm', 'https://www.openstreetmap.org/copyright'],
  ['pnoa', 'https://www.scne.es'],
  ['icgc', 'https://www.icgc.cat'],
  ['geoeuskadi', 'https://www.geo.euskadi.eus'],
  ['idena', 'https://idena.navarra.es'],
  ['maplibre', 'https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt'],
  ['fonts', 'https://openfontlicense.org'],
];

const Seccion = ({ t, clave }) => (
  <section className="mb-8">
    <h2 className="text-xl font-semibold text-gray-900 mb-3">{t(`legalNotice.${clave}.title`)}</h2>
    <p className="text-gray-600 leading-relaxed whitespace-pre-line break-words">
      {t(`legalNotice.${clave}.content`)}
    </p>
  </section>
);

/**
 * Aviso Legal (auditoría del 20 oct 2026): quién presta el servicio —una persona
 * física, no una sociedad con el nombre comercial—, en qué condiciones y con qué
 * datos de terceros.
 */
const LegalNotice = () => {
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
            <VolverDeLoLegal />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              {t('legalNotice.title')}
            </h1>
            <p className="text-sm text-gray-500 mb-10">
              {t('legalNotice.lastUpdated')}
            </p>

            {ANTES_DE_LAS_FUENTES.map((clave) => (
              <Seccion key={clave} t={t} clave={clave} />
            ))}

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                {t('legalNotice.section6.title')}
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">{t('legalNotice.section6.intro')}</p>
              <ul className="space-y-3">
                {FUENTES.map(([fuente, url]) => (
                  <li key={fuente} className="text-gray-600 leading-relaxed break-words">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary hover:underline"
                    >
                      {t(`legalNotice.section6.sources.${fuente}.name`)}
                    </a>
                    {' '}
                    <span>{t(`legalNotice.section6.sources.${fuente}.detail`)}</span>
                  </li>
                ))}
              </ul>
            </section>

            {DESPUES_DE_LAS_FUENTES.map((clave) => (
              <Seccion key={clave} t={t} clave={clave} />
            ))}
          </motion.div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default LegalNotice;
