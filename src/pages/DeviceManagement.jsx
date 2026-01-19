import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRef, useEffect, useState } from 'react';
import HeaderAuth from '../components/layout/HeaderAuth';
import ConfirmModal from '../components/modals/ConfirmModal';
import { useDeviceManagement } from '../hooks/useDeviceManagement';
import { useAuth } from '../hooks/useAuth';
import { useLogout } from '../hooks/useLogout';
import { formatDateTime } from '../utils/dateFormatters';

const DeviceManagement = () => {
  const { t } = useTranslation('devices');
  const { user } = useAuth();
  const navigate = useNavigate();
  const timeoutRef = useRef(null);
  const { logout } = useLogout();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deviceToRevoke, setDeviceToRevoke] = useState(null);

  const {
    devices,
    isLoading,
    revokingDeviceIds,
    deviceErrors,
    revokeDevice,
    clearDeviceError,
  } = useDeviceManagement();

  const handleRevokeClick = (device) => {
    setDeviceToRevoke(device);
    setIsModalOpen(true);
  };

  const handleConfirmRevoke = async () => {
    if (!deviceToRevoke) return;

    // Clear any existing logout timer BEFORE starting revoke operation
    // This prevents race conditions when revoking multiple devices
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Backend now tells us if this is the current device (100% accurate via device_id in token)
    const isCurrent = deviceToRevoke.isCurrentDevice;

    const success = await revokeDevice(deviceToRevoke.id);

    // Close modal
    setIsModalOpen(false);
    setDeviceToRevoke(null);

    // If current device was revoked, logout after showing toast
    // Backend already invalidated tokens during revocation, so we skip backend logout call
    // 2500ms delay allows user to read the success toast
    if (success && isCurrent) {
      // Set revocation flag to prevent monitor from triggering handleDeviceRevocationLogout() again
      // This tells handleDeviceRevocationLogout() that we're already handling the logout gracefully
      // Flag will be cleared on next successful login (see useAuth.js line 74)
      localStorage.setItem('device_revocation_handled', 'true');

      timeoutRef.current = setTimeout(() => {
        // Skip backend call because device is already revoked (tokens already invalidated)
        // This prevents 401 response that would trigger handleDeviceRevocationLogout() again
        logout({ skipBackendCall: true });
      }, 2500);
    }
  };

  const handleCancelRevoke = () => {
    setIsModalOpen(false);
    setDeviceToRevoke(null);
  };

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white">
      <div className="layout-container flex h-full grow flex-col">
        <HeaderAuth user={user} />

        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
            {/* Header */}
            <div className="flex flex-wrap justify-between gap-3 p-4 items-center">
              <div>
                <p className="text-gray-900 tracking-tight text-3xl md:text-[32px] font-bold leading-tight">
                  {t('title')}
                </p>
                <p className="text-gray-600 text-sm mt-2">
                  {t('subtitle')}
                </p>
              </div>
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {t('actions.backToProfile')}
              </button>
            </div>

            {/* Info Alert */}
            <div className="mx-4 mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">{t('info.title')}</p>
                  <p>
                    {t('info.description')}
                  </p>
                </div>
              </div>
            </div>

            {/* Devices List */}
            <div className="px-4">
              {isLoading ? (
                // Skeleton Loader (v1.14.0)
                <div className="space-y-4">
                  {[1, 2, 3].map((skeleton) => (
                    <div key={skeleton} className="border border-gray-200 rounded-lg p-4 md:p-5 animate-pulse">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        {/* Device Info Skeleton */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-5 h-5 bg-gray-300 rounded flex-shrink-0"></div>
                            <div className="h-5 bg-gray-300 rounded w-48"></div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-gray-200 rounded flex-shrink-0"></div>
                              <div className="h-4 bg-gray-200 rounded w-32"></div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-gray-200 rounded flex-shrink-0"></div>
                              <div className="h-4 bg-gray-200 rounded w-40"></div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-gray-200 rounded flex-shrink-0"></div>
                              <div className="h-4 bg-gray-200 rounded w-36"></div>
                            </div>
                          </div>
                        </div>
                        {/* Revoke Button Skeleton */}
                        <div className="h-10 bg-gray-200 rounded-lg w-full sm:w-24 flex-shrink-0"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : devices.length === 0 ? (
                <div className="text-center py-12 border border-gray-200 rounded-lg">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-600 font-medium">{t('empty.title')}</p>
                  <p className="text-gray-500 text-sm mt-1">{t('empty.description')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {devices.map((device) => {
                    const isCurrent = device.isCurrentDevice;

                    return (
                      <div
                        key={device.id}
                        className={`border rounded-lg p-4 md:p-5 hover:shadow-md transition-shadow ${
                          isCurrent
                            ? 'border-green-300 bg-green-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          {/* Device Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
                              </svg>
                              <h3 className="text-base font-semibold text-gray-900 break-words">
                                {device.deviceName}
                              </h3>
                              {isCurrent && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap">
                                  {t('device.current')}
                                </span>
                              )}
                            </div>

                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                                <span className="break-all">{t('device.ip')}: {device.ipAddress}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="break-words">{t('device.lastUsed')}: {formatDateTime(device.lastUsedAt, t('device.never'))}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="break-words">{t('device.firstSeen')}: {formatDateTime(device.createdAt, t('device.never'))}</span>
                              </div>
                            </div>
                          </div>

                          {/* Revoke Button */}
                          <button
                            onClick={() => handleRevokeClick(device)}
                            disabled={revokingDeviceIds.has(device.id)}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 w-full sm:w-auto"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            {t('actions.revoke')}
                          </button>
                        </div>

                        {/* Inline Error Display (v1.14.0) */}
                        {deviceErrors.has(device.id) && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                              <div className="flex-1">
                                <p className="text-sm text-red-800 font-medium">
                                  {deviceErrors.get(device.id)}
                                </p>
                              </div>
                              <button
                                onClick={() => clearDeviceError(device.id)}
                                className="text-red-600 hover:text-red-800 transition-colors"
                                aria-label={t('aria.closeErrorMessage')}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Security Note */}
            {devices.length > 0 && (
              <div className="mx-4 mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">{t('security.title')}</p>
                    <p>
                      {t('security.description')}{' '}
                      <button
                        onClick={() => navigate('/profile/edit')}
                        className="underline hover:text-yellow-900 font-medium"
                      >
                        {t('security.profileSettings')}
                      </button>
                      .
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Revoke Modal */}
      <ConfirmModal
        isOpen={isModalOpen}
        title={
          deviceToRevoke?.isCurrentDevice
            ? t('modals.revokeCurrentTitle')
            : t('modals.revokeOtherTitle')
        }
        message={
          deviceToRevoke?.isCurrentDevice
            ? t('confirmations.revokeCurrent')
            : t('confirmations.revokeOther')
        }
        onConfirm={handleConfirmRevoke}
        onCancel={handleCancelRevoke}
        isDestructive={true}
        isLoading={deviceToRevoke ? revokingDeviceIds.has(deviceToRevoke.id) : false}
      />
    </div>
  );
};

export default DeviceManagement;
