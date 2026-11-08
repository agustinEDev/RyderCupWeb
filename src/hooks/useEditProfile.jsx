import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { loQueHayQueMandar, queLePasaAlAlias } from '../utils/alias';
import customToast from '../utils/toast';
import { passwordErrorMessage, validatePassword } from '../utils/validation';

import {
  updateUserProfileUseCase,
  updateUserSecurityUseCase,
  cancelEmailChangeUseCase,
  updateManualHandicapUseCase,
  updateRfegHandicapUseCase,
  fetchCountriesUseCase,
  unlinkGoogleAccountUseCase,
  reauthenticateUseCase,
} from '../composition';
import { buildGoogleOAuthUrl } from '../utils/googleOAuth';

import { useAuth } from './useAuth';

// 409 Conflict: el alias pedido ya lo tiene otra persona (BE #239)
const CONFLICTO = 409;

export const useEditProfile = () => {
  const { t } = useTranslation(['profile', 'auth']);
  const { user: authUser, refetch: refetchUser } = useAuth();

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingRFEG, setIsUpdatingRFEG] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUnlinkingGoogle, setIsUnlinkingGoogle] = useState(false);

  const [countries, setCountries] = useState([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);

  // El 409 del alias se pinta JUNTO AL CAMPO, no como toast: un aviso que se
  // va solo no dice cual de los datos del formulario hay que cambiar (FE #435)
  const [aliasError, setAliasError] = useState(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    alias: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    handicap: '',
    countryCode: '',
    gender: '',
  });

  // Cargar datos de usuario en el formulario
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!authUser) {
          setIsLoading(false);
          return;
        }

        setUser(authUser);

        setFormData({
          firstName: authUser.first_name || '',
          lastName: authUser.last_name || '',
          alias: authUser.alias || '',
          email: authUser.email || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          handicap:
            authUser.handicap === null ? '' : authUser.handicap.toString(),
          countryCode: authUser.country_code || '',
          gender: authUser.gender || '',
        });
      } catch (error) {
        console.error('❌ [useEditProfile] Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [authUser]);

  // Cargar países
  useEffect(() => {
    const loadCountries = async () => {
      try {
        setIsLoadingCountries(true);
        const countriesData = await fetchCountriesUseCase.execute();
        setCountries(countriesData || []);
      } catch (error) {
        console.error('❌ [useEditProfile] Error loading countries:', error);
        setCountries([]);
      } finally {
        setIsLoadingCountries(false);
      }
    };

    loadCountries();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Escribir en el alias retira el aviso de «ya esta en uso»: si no, se
    // queda debajo del campo contradiciendo lo que se acaba de teclear
    if (name === 'alias' && aliasError) {
      setAliasError(null);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRefreshUserData = async () => {
    setIsRefreshing(true);
    try {
      await refetchUser();
      // refetchUser actualizará authUser, y por tanto el useEffect
      // recargará user + formData.
    } catch (error) {
      console.error('Error refreshing user data:', error);
      customToast.error(t('toasts.failedToRefreshData'));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUpdateHandicapManually = async (e) => {
    if (e?.preventDefault) e.preventDefault();

    if (!user) {
      customToast.error(t('toasts.userNotLoaded'));
      return;
    }

    // Vacío, el caso de uso lo convertía en 0 y se guardaba hándicap 0 (26 oct)
    if (formData.handicap === '') {
      customToast.error(t('edit.handicap.manualHelp'));
      return;
    }

    setIsSaving(true);
    try {
      await updateManualHandicapUseCase.execute({
        userId: user.id,
        handicap: formData.handicap,
      });

      await refetchUser();
      customToast.success(t('toasts.handicapUpdated'));
    } catch (error) {
      console.error('Error updating handicap:', error);
      customToast.error(error.message || t('toasts.failedToUpdateHandicap'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateHandicapRFEG = async () => {
    if (!user) {
      customToast.error(t('toasts.userNotLoaded'));
      return;
    }

    setIsUpdatingRFEG(true);
    try {
      await updateRfegHandicapUseCase.execute({
        userId: user.id,
      });

      await refetchUser();
      // refetchUser updates authUser, which triggers useEffect to update formData

      customToast.success(t('toasts.handicapUpdatedRFEG'));
    } catch (error) {
      console.error('Error updating handicap from RFEG:', error);
      customToast.error(
        error.message || t('toasts.failedToUpdateHandicapRFEG'),
      );
    } finally {
      setIsUpdatingRFEG(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    if (!user) {
      customToast.error(t('toasts.userNotLoaded'));
      return;
    }

    const trimmedFirstName = formData.firstName.trim();
    const trimmedLastName = formData.lastName.trim();
    const trimmedCountryCode = formData.countryCode.trim();

    const isNameChanged =
      trimmedFirstName !== user.first_name ||
      trimmedLastName !== user.last_name;
    const isCountryChanged =
      trimmedCountryCode !== (user.country_code || '');
    const isGenderChanged =
      formData.gender !== (user.gender || '');
    // `undefined` significa «el alias no viaja»: ni ha cambiado, ni se esta
    // pidiendo borrar uno que nunca existio. La cadena vacia SI viaja, y es
    // lo que le dice al servidor que lo quite
    const aliasAEnviar = loQueHayQueMandar(formData.alias, user.alias);
    const isAliasChanged = aliasAEnviar !== undefined;

    if (!isNameChanged && !isCountryChanged && !isGenderChanged && !isAliasChanged) {
      customToast.info(t('toasts.noProfileChanges'));
      return;
    }

    // Lo que ya se sabe aqui no hace falta preguntarlo al servidor. El aviso
    // va bajo el campo, que es donde esta el problema
    const problemaDelAlias = queLePasaAlAlias(formData.alias);
    if (problemaDelAlias) {
      setAliasError(problemaDelAlias);
      return;
    }
    setAliasError(null);

    if (trimmedFirstName.length < 2) {
      customToast.error(t('toasts.firstNameTooShort'));
      return;
    }

    if (trimmedLastName.length < 2) {
      customToast.error(t('toasts.lastNameTooShort'));
      return;
    }

    setIsSaving(true);
    try {
      const updateData = {
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
      };

      if (isCountryChanged) {
        updateData.countryCode =
          trimmedCountryCode === '' ? null : trimmedCountryCode;
      }

      if (isGenderChanged) {
        updateData.gender =
          formData.gender === '' ? null : formData.gender;
      }

      if (isAliasChanged) {
        updateData.alias = aliasAEnviar;
      }

      await updateUserProfileUseCase.execute(
        user.id,
        updateData,
      );

      await refetchUser();
      // refetchUser updates authUser, which triggers useEffect to update formData

      customToast.success(t('toasts.profileUpdated'));
    } catch (error) {
      console.error('Error updating profile:', error);
      // 409: el alias lo tiene otra persona. Va al campo y NO como toast,
      // conservando lo tecleado para que se pueda retocar en vez de escribirlo
      // otra vez.
      //
      // Solo si el alias iba en la peticion: un 409 por cualquier otra causa
      // colgaba «ese alias ya esta en uso» de un campo que no se habia tocado,
      // y ademas se comia el aviso del error de verdad
      if (isAliasChanged && error.status === CONFLICTO) {
        setAliasError('alias.errors.taken');
        return;
      }
      customToast.error(error.message || t('toasts.failedToUpdateProfile'));
    } finally {
      setIsSaving(false);
    }
  };

  // Google OAuth - derived state (user comes from useAuth raw API response, always snake_case)
  const isGoogleLinked = user?.auth_providers?.includes('google') || false;
  const hasPassword = user?.has_password ?? true;

  // Vincular Google pide la contraseña actual a quien la tiene (RyderCupAm #753): con
  // solo la sesión, una robada podía añadir un Google que sobrevive al restablecimiento
  const [isGooglePasswordOpen, setIsGooglePasswordOpen] = useState(false);
  // Para qué se abrió la ventana: desvincular también pide la contraseña (tabla D, 8 nov
  // 2026); el estado es para pintarla
  const [accionDeGoogle, setAccionDeGoogle] = useState('vincular');
  // La ventana de AHORA: cada apertura y cada cierre cambian `id`. Una comprobación solo
  // actúa si al acabar sigue siendo la de su ventana, abierta, y hace aquello para lo que
  // empezó: una de «Vincular» cancelada no desvincula si luego se abre «Desvincular», ni
  // al revés (code-review)
  const ventana = useRef({ id: 0, abierta: false, para: 'vincular' });
  const abreLaVentanaPara = (para) => {
    ventana.current = { id: ventana.current.id + 1, abierta: true, para };
    setAccionDeGoogle(para);
    setIsGooglePasswordOpen(true);
  };

  const vaAGoogle = () => {
    globalThis.location.href = buildGoogleOAuthUrl('link');
  };

  const handleLinkGoogle = () => {
    if (hasPassword) {
      abreLaVentanaPara('vincular');
      return;
    }
    vaAGoogle();
  };

  const cierraContrasenaParaGoogle = () => {
    ventana.current = { ...ventana.current, id: ventana.current.id + 1, abierta: false };
    setIsGooglePasswordOpen(false);
  };

  /**
   * Desvincula, ya con la contraseña confirmada (D6, D9).
   * @returns {Promise<string|null>} La clave del error que enseñar en la ventana, o null
   */
  const desvincula = async () => {
    setIsUnlinkingGoogle(true);
    try {
      await unlinkGoogleAccountUseCase.execute();
    } catch (error) {
      setIsUnlinkingGoogle(false);
      // La marca caducó o ya se usó: que la confirme otra vez, en la ventana
      if (error?.errorCode === 'REAUTHENTICATION_REQUIRED') return 'edit.linkedAccounts.reauthExpired';
      console.error('Error unlinking Google:', error);
      customToast.error(error.message || t('edit.linkedAccounts.unlinkError'));
      return null;
    }
    // Ya desvinculado: si recargar la sesión falla, el aviso sigue siendo el de éxito
    // (code-review); la próxima carga lo pinta bien
    try {
      await refetchUser();
    } catch (error) {
      console.warn('[useEditProfile] Session refresh after unlinking failed:', error);
    } finally {
      setIsUnlinkingGoogle(false);
    }
    customToast.success(t('edit.linkedAccounts.unlinkSuccess'));
    return null;
  };

  /**
   * Comprueba la contraseña y, si vale, se va a Google (con la marca de 5 minutos) o
   * desvincula, según para qué se abrió la ventana.
   * @returns {Promise<string|null>} La clave del error que enseñar, o null
   */
  const confirmaContrasenaParaGoogle = async (password) => {
    const { id, para } = ventana.current;
    try {
      await reauthenticateUseCase.execute(password);
    } catch (error) {
      if (error?.errorCode === 'CURRENT_PASSWORD_INCORRECT') return 'edit.linkedAccounts.wrongPassword';
      if (error?.errorCode === 'TOO_MANY_SECURITY_CHANGES') return 'toasts.tooManySecurityChanges';
      return 'edit.linkedAccounts.passwordCheckFailed';
    }
    if (ventana.current.id !== id || !ventana.current.abierta) return null;
    if (para === 'desvincular') return desvincula();
    try {
      vaAGoogle();
    } catch (error) {
      // Sin la configuración de Google no hay a dónde ir: que no se quede comprobando
      console.error('Google OAuth URL error:', error);
      return 'auth:google.genericError';
    }
    return null;
  };

  // Desvincular pide antes la contraseña, como vincular: con solo una sesión robada se
  // quitaba el Google del dueño (tabla D, Agustín, 8 nov 2026). El botón solo sale a
  // quien tiene contraseña
  const handleUnlinkGoogle = () => {
    // Sin contraseña no hay nada que confirmar ni se puede desvincular (único método)
    if (!hasPassword) return;
    abreLaVentanaPara('desvincular');
  };

  const handleUpdateSecurity = async (e) => {
    e.preventDefault();

    if (!user) {
      customToast.error(t('toasts.userNotLoaded'));
      return;
    }

    if (!formData.currentPassword) {
      customToast.error(t('toasts.currentPasswordRequired'));
      return;
    }

    const trimmedEmail = formData.email.trim();
    const isEmailChanged =
      trimmedEmail !== '' && trimmedEmail !== user.email;
    const isPasswordChanged = formData.newPassword !== '';

    if (!isEmailChanged && !isPasswordChanged) {
      customToast.info(t('toasts.noSecurityChanges'));
      return;
    }

    if (isPasswordChanged) {
      // La misma política que el registro, el reset y el backend: aquí solo se
      // miraba la longitud, y una contraseña sin símbolo acababa en un 500
      const passwordValidation = validatePassword(formData.newPassword);
      if (!passwordValidation.isValid) {
        customToast.error(
          t(`auth:${passwordValidation.messageKey}`, passwordValidation.messageOptions)
        );
        return;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        customToast.error(t('toasts.passwordsDoNotMatch'));
        return;
      }
    }

    setIsSaving(true);
    try {
      const securityData = {
        current_password: formData.currentPassword,
      };

      if (isEmailChanged) {
        securityData.new_email = trimmedEmail;
      }

      if (isPasswordChanged) {
        securityData.new_password = formData.newPassword;
        securityData.confirm_password = formData.confirmPassword;
      }

      const actualizado = await updateUserSecurityUseCase.execute({
        userId: user.id,
        securityData,
      });

      await refetchUser();
      // refetchUser updates authUser, which triggers useEffect to update formData

      // Clear password fields manually (not part of user object)
      setFormData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));

      if (isEmailChanged && actualizado?.pendingEmail) {
        // El correo nuevo queda pendiente hasta confirmarlo desde su dirección
        // (RyderCupAm #749): la cuenta sigue con el de antes. Con el backend de
        // antes, sin pendiente, se cambia al momento: el aviso de siempre
        const correos = { nuevo: trimmedEmail, actual: user.email };
        customToast.success(t('toasts.emailChangePending', correos), { duration: 8000 });
      } else {
        customToast.success(t('toasts.securityUpdated'));
      }
    } catch (error) {
      console.error('Error updating security:', error);

      const contrasena = passwordErrorMessage(error, t);
      // Los errores de Seguridad con código: los límites (RyderCupAm #753) y los que
      // venían en inglés del backend
      const porCodigo = {
        TOO_MANY_SECURITY_CHANGES: 'toasts.tooManySecurityChanges',
        TOO_MANY_EMAIL_CHANGE_REQUESTS: 'toasts.tooManyEmailChanges',
        // Con su código desde el backend: su texto venía en inglés (probador de la release)
        CURRENT_PASSWORD_INCORRECT: 'edit.linkedAccounts.wrongPassword',
        EMAIL_ALREADY_IN_USE: 'toasts.emailAlreadyInUse',
      }[error.errorCode];
      if (porCodigo) {
        customToast.error(t(porCodigo));
      } else if (error.errorCode === 'PASSWORD_REUSED') {
        // v1.13.0, por su código desde la BE #519: antes se buscaba el texto en
        // inglés del backend, que se rompía en cuanto cambiara una palabra
        customToast.error(
          t('toasts.passwordReused'),
          {
            duration: 8000,
            icon: '🔑',
          }
        );
      } else if (contrasena) {
        // El backend la rechaza con un código (BE #519): en el idioma de la app
        customToast.error(contrasena);
      } else {
        customToast.error(
          error.message || t('toasts.failedToUpdateSecurity'),
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const [isCancellingEmail, setIsCancellingEmail] = useState(false);
  // Uno a la vez: un doble toque no manda dos anulaciones
  const anulando = useRef(false);
  const handleCancelEmailChange = async () => {
    if (anulando.current) return;
    anulando.current = true;
    setIsCancellingEmail(true);
    try {
      await cancelEmailChangeUseCase.execute();
      await refetchUser();
      customToast.success(t('toasts.emailChangeCancelled'));
    } catch (error) {
      console.error('Error cancelling the email change:', error);
      customToast.error(t('toasts.failedToCancelEmailChange'));
    } finally {
      anulando.current = false;
      setIsCancellingEmail(false);
    }
  };

  return {
    handleCancelEmailChange,
    isCancellingEmail,
    // Public state
    user,
    refetchUser,
    formData,
    isLoading,
    isSaving,
    isUpdatingRFEG,
    isRefreshing,
    isUnlinkingGoogle,
    isGoogleLinked,
    hasPassword,
    countries,
    isLoadingCountries,

    // Public handlers
    aliasError,
    handleInputChange,
    handleRefreshUserData,
    handleUpdateHandicapManually,
    handleUpdateHandicapRFEG,
    handleUpdateProfile,
    handleUpdateSecurity,
    handleLinkGoogle,
    isGooglePasswordOpen,
    accionDeGoogle,
    cierraContrasenaParaGoogle,
    confirmaContrasenaParaGoogle,
    handleUnlinkGoogle,
  };
};
