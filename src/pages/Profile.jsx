import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import {
  Mail, Shield, Calendar, TrendingUp, Award,
  CheckCircle, AlertCircle, Edit, LogOut, ArrowLeft, Globe, Clock, Smartphone,
  FileText, Lock, Cookie, Users
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import HeaderAuth from '../components/layout/HeaderAuth';
import Avatar from '../components/ui/Avatar';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import { SettingsGroup, SettingsRow, SettingsControlRow } from '../components/profile/SettingsList';
import ActivitySharingToggle from '../components/profile/ActivitySharingToggle';
import { useAuth } from '../hooks/useAuth';
import { useStandalone } from '../hooks/useStandalone';
import { CountryFlag } from '../utils/countryUtils';
import { broadcastLogout } from '../utils/broadcastAuth';
import { formatFullDate } from '../utils/dateFormatters';
import { fetchCountriesUseCase, listUserCompetitionsUseCase, logoutUseCase } from '../composition';

const Profile = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('profile');
  const { t: tCommon } = useTranslation('common');
  const { user, loading: isLoadingUser } = useAuth();
  const isStandalone = useStandalone();
  const [countryName, setCountryName] = useState(null);
  const [competitionsCount, setCompetitionsCount] = useState(0);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setIsLoadingData(false);
        return;
      }

      try {
        // Fetch country name if user has country_code
        if (user.country_code) {
          try {
            const countries = await fetchCountriesUseCase.execute();
            const country = countries.find(c => c.code === user.country_code);
            if (country) {
              setCountryName(country.name_en || country.name);
            }
          } catch (error) {
            console.error('Error fetching country name:', error);
          }
        }

        // Fetch user's competitions count
        try {
          const competitionsData = await listUserCompetitionsUseCase.execute(user.id);

          // Handle different response formats: array or object with results array
          let list = [];
          if (Array.isArray(competitionsData)) {
            list = competitionsData;
          } else if (competitionsData && Array.isArray(competitionsData.results)) {
            list = competitionsData.results;
          }

          setCompetitionsCount(list.length);
        } catch (error) {
          console.error('Error fetching competitions count:', error);
          setCompetitionsCount(0);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handleEditProfile = () => {
    navigate('/profile/edit');
  };

  const handleLogout = async () => {
    broadcastLogout();

    try {
      await logoutUseCase.execute();
    } catch {
      // Continue with logout anyway to clear frontend state
    }

    // Force full page reload to clear all state
    window.location.href = '/';
  };


  if (isLoadingUser || isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const fullName = `${user.first_name} ${user.last_name}`;
  const email = user.email || 'No email';
  const handicap = user.handicap !== null && user.handicap !== undefined
    ? user.handicap
    : 'Not set';
  const handicapUpdated = user.handicap_updated_at
    ? formatFullDate(user.handicap_updated_at)
    : 'Never';
  const memberSince = formatFullDate(user.created_at);

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white">
      <div className="layout-container flex h-full grow flex-col">
        <HeaderAuth user={user} />

        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            {/* Page Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-wrap justify-between gap-3 p-4"
            >
              <div>
                <p className="hidden md:block text-gray-900 tracking-tight text-3xl md:text-[32px] font-bold leading-tight">
                  {t('title')}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  {t('subtitle')}
                </p>
              </div>
            </motion.div>

            {/* Profile Header Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-4"
            >
              <div className="relative overflow-hidden bg-primary-50 rounded-xl border border-primary-200 p-6 shadow-md">
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 opacity-10">
                  <Award className="w-48 h-48 text-primary-700" />
                </div>

                {/* Content */}
                <div className="relative z-10">
                  {/* Avatar */}
                  <div className="mb-4">
                    <Avatar userId={user.id} size="xl" version={user.updated_at} />
                  </div>

                  {/* Name and Badges */}
                  <div className="mb-4">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">{fullName}</h2>

                    {/* Badges Row */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {user.email_verified ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          <CheckCircle className="w-3 h-3" />
                          {t('emailVerified')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                          <AlertCircle className="w-3 h-3" />
                          {t('emailPending')}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-semibold">
                        <Shield className="w-3 h-3" />
                        {t('activeAccount')}
                      </span>

                      {handicap !== 'Not set' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-accent-100 text-accent-700 rounded-full text-xs font-semibold">
                          <Award className="w-3 h-3" />
                          {t('handicapRegistered')}
                        </span>
                      )}
                    </div>

                    {/* Email. Mismo caso que en el perfil de otro jugador: una
                        direccion larga no puede partirse sola y desborda */}
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <Mail className="w-4 h-4 shrink-0" />
                      <span className="min-w-0 break-all text-sm">{email}</span>
                    </div>

                    {/* Member Since */}
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">{t('memberSince', { date: memberSince })}</span>
                    </div>

                    {/* Last Updated */}
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{t('lastUpdated', { date: formatFullDate(user.updated_at) })}</span>
                    </div>

                    {/* Nationality */}
                    <div className="flex items-center gap-2 text-gray-600">
                      <Globe className="w-4 h-4" />
                      {user.country_code ? (
                        <span className="text-sm flex items-center gap-2">
                          <span>{t('nationality')}</span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-200">
                            <CountryFlag countryCode={user.country_code} className="w-4 h-4" />
                            <span>{countryName || user.country_code}</span>
                          </span>
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">
                          {t('nationalityNotSpecified')}
                        </span>
                      )}
                    </div>

                    {/* Gender */}
                    {user.gender && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Shield className="w-4 h-4" />
                        <span className="text-sm">{t('edit.personalInfo.gender')}: {t(`edit.personalInfo.genderOptions.${user.gender}`)}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-primary-200">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-5 h-5 text-accent-600" />
                        <span className="text-xs text-gray-500 font-medium">{t('handicapLabel')}</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{handicap}</p>
                      {handicap !== 'Not set' && (
                        <p className="text-xs text-gray-500 mt-1">{t('updatedOn', { date: handicapUpdated })}</p>
                      )}
                    </div>

                    <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-primary-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Award className="w-5 h-5 text-primary-600" />
                        <span className="text-xs text-gray-500 font-medium">{t('tournamentsLabel')}</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{competitionsCount}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {competitionsCount === 0 ? t('notEnrolledYet') :
                         competitionsCount === 1 ? t('competition') : t('competitions')}
                      </p>
                    </div>
                  </div>

                  {/* El perfil enseña dos cifras; el resto vive en su propia
                      página desde FE #306 fase 2 */}
                  <button
                    type="button"
                    onClick={() => navigate('/stats')}
                    data-testid="profile-view-stats"
                    className="mt-3 text-sm font-semibold text-primary-700 hover:text-primary-900 hover:underline"
                  >
                    {t('viewStats')}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="p-4"
            >
              {/* Móvil: lista de ajustes (FE #324). La botonera de cuatro
                  colores no establecía jerarquía y se escalonaba al envolver;
                  aquí manda el orden de la lista, no el color. "Volver al
                  panel" no aparece: la navegación inferior ya tiene Inicio */}
              <div className="md:hidden">
                <SettingsGroup title={t('sections.account')}>
                  <SettingsRow icon={Edit} label={t('actions.editProfile')} to="/profile/edit" />
                  <SettingsRow
                    icon={Smartphone}
                    label={t('actions.manageDevices')}
                    to="/profile/devices"
                  />
                  {user?.is_admin && (
                    <SettingsRow
                      icon={Shield}
                      label={tCommon('header.adminPanel')}
                      to="/admin"
                    />
                  )}
                </SettingsGroup>

                {/* El selector de idioma cayó aquí al retirarse el menú
                    hamburguesa en móvil (FE #306) */}
                <SettingsGroup title={t('sections.preferences')}>
                  <SettingsControlRow icon={Globe} label={t('sections.language')}>
                    <LanguageSwitcher />
                  </SettingsControlRow>
                </SettingsGroup>
              </div>

              {/* Privacidad va fuera del `md:hidden`: la lista de ajustes es
                  solo de móvil, y en escritorio manda una botonera que no
                  admite un interruptor. Dejarlo dentro haría inalcanzable desde
                  escritorio la única forma de dejar de publicar */}
              <SettingsGroup title={t('sections.privacy')}>
                <SettingsControlRow
                  icon={Users}
                  label={t('privacy.shareActivity')}
                  description={t('privacy.shareActivityHint')}
                >
                  <ActivitySharingToggle initialValue={user?.share_activity} />
                </SettingsControlRow>
              </SettingsGroup>

              {/* Los legales viven aquí porque instalada no se pinta el pie
                  (FE #309). En escritorio con el pie visible serían un duplicado,
                  pero una aplicación instalada en escritorio tampoco lo tiene:
                  ahí este es el único acceso que queda */}
              <div className={isStandalone ? '' : 'md:hidden'}>
                <SettingsGroup title={t('sections.legal')}>
                  <SettingsRow icon={FileText} label={t('legal.terms')} to="/terms" />
                  <SettingsRow icon={Lock} label={t('legal.privacy')} to="/privacy" />
                  <SettingsRow icon={Cookie} label={t('legal.cookies')} to="/cookies" />
                </SettingsGroup>
              </div>

              <div className="md:hidden">
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <SettingsRow icon={LogOut} label={t('actions.logOut')} onClick={handleLogout} tone="danger" />
                </div>
              </div>

              {/* Escritorio: se mantiene la botonera, con una sola acción
                  principal y el cierre de sesión como texto, no como bloque
                  rojo al mismo nivel que editar el perfil (FE #324) */}
              <div className="hidden md:flex flex-wrap items-center gap-3 justify-end">
                <motion.button
                  onClick={() => navigate('/dashboard')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-5 py-2.5 text-gray-600 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t('actions.backToDashboard')}</span>
                </motion.button>

                <motion.button
                  onClick={() => navigate('/profile/devices')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>{t('actions.manageDevices')}</span>
                </motion.button>

                <motion.button
                  onClick={handleEditProfile}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors shadow-md"
                >
                  <Edit className="w-4 h-4" />
                  <span>{t('actions.editProfile')}</span>
                </motion.button>

                <motion.button
                  onClick={handleLogout}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-5 py-2.5 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('actions.logOut')}</span>
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
