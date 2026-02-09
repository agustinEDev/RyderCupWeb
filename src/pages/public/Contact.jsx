import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Mail, Clock, Github, CheckCircle } from 'lucide-react';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { submitContactFormUseCase } from '../../composition';
import { customToast } from '../../utils/toast';

const CATEGORIES = ['BUG', 'FEATURE', 'QUESTION', 'OTHER'];

const Contact = () => {
  const { t } = useTranslation('contact');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = t('validation.nameRequired');
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('validation.emailRequired');
    }
    if (!formData.category) {
      newErrors.category = t('validation.categoryRequired');
    }
    if (!formData.subject || formData.subject.trim().length < 3) {
      newErrors.subject = t('validation.subjectRequired');
    }
    if (!formData.message || formData.message.trim().length < 10) {
      newErrors.message = t('validation.messageRequired');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await submitContactFormUseCase.execute(formData);
      setIsSuccess(true);
    } catch (error) {
      if (error.message === 'NETWORK_ERROR') {
        customToast.error(t('error.network'));
      } else {
        customToast.error(t('error.generic'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({ name: '', email: '', category: '', subject: '', message: '' });
    setErrors({});
    setIsSuccess(false);
  };

  const inputClass = (field) =>
    `w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
      errors[field]
        ? 'border-red-300 focus:ring-red-500'
        : 'border-gray-300 focus:ring-primary focus:border-primary'
    }`;

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white">
      <div className="layout-container flex h-full grow flex-col">
        <Header />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {t('title')}
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {t('subtitle')}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-6xl mx-auto">
              {/* Form */}
              <motion.div
                className="lg:col-span-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                {isSuccess ? (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-12 text-center">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {t('success.title')}
                    </h2>
                    <p className="text-gray-600 mb-6">{t('success.message')}</p>
                    <button
                      onClick={handleReset}
                      className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      {t('success.another')}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Name */}
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                          {t('form.name')}
                        </label>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder={t('form.namePlaceholder')}
                          className={inputClass('name')}
                          maxLength={100}
                        />
                        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                      </div>

                      {/* Email */}
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                          {t('form.email')}
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder={t('form.emailPlaceholder')}
                          className={inputClass('email')}
                          maxLength={254}
                        />
                        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Category */}
                      <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                          {t('form.category')}
                        </label>
                        <select
                          id="category"
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          className={inputClass('category')}
                        >
                          <option value="">{t('form.categoryPlaceholder')}</option>
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{t(`form.categories.${cat}`)}</option>
                          ))}
                        </select>
                        {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
                      </div>

                      {/* Subject */}
                      <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                          {t('form.subject')}
                        </label>
                        <input
                          id="subject"
                          name="subject"
                          type="text"
                          value={formData.subject}
                          onChange={handleChange}
                          placeholder={t('form.subjectPlaceholder')}
                          className={inputClass('subject')}
                          maxLength={200}
                        />
                        {errors.subject && <p className="mt-1 text-sm text-red-600">{errors.subject}</p>}
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('form.message')}
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder={t('form.messagePlaceholder')}
                        rows={6}
                        className={inputClass('message')}
                        maxLength={5000}
                      />
                      {errors.message && <p className="mt-1 text-sm text-red-600">{errors.message}</p>}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full md:w-auto py-3 px-8 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? t('form.submitting') : t('form.submit')}
                    </button>
                  </form>
                )}
              </motion.div>

              {/* Info Panel */}
              <motion.div
                className="lg:col-span-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="bg-gray-50 rounded-2xl p-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">
                    {t('info.title')}
                  </h3>

                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{t('info.email')}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-600">{t('info.responseTime')}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <Github className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-600">
                          {t('info.github')}{' '}
                          <a
                            href="https://github.com/agustinEDev/RyderCupWeb"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {t('info.githubLink')}
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Contact;
