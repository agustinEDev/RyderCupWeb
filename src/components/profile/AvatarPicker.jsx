import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X, Check } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { urlDeImagenDeLaApi } from '../../composition/http';
import BlockLoader from '../ui/BlockLoader';

/** La imagen de un avatar si su ruta es de la propia API, o null (FE-11). Pura y barata. */
const imagenDe = (avatar) => urlDeImagenDeLaApi(avatar.image_url);

const AvatarPicker = ({
  user,
  presets,
  uploads,
  isLoadingOptions,
  isSettingPreset,
  isUploading,
  isRemoving,
  onSelectPreset,
  onUpload,
  onActivateUpload,
  onRemove,
}) => {
  const { t } = useTranslation('profile');
  const fileInputRef = useRef(null);

  const isBusy = isSettingPreset || isUploading || isRemoving;
  const hasAvatar = user?.avatar_source && user.avatar_source !== 'NONE';

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
    // Allow re-selecting the same file (e.g. after an error) by resetting the input
    e.target.value = '';
  };

  return (
    <div className="border border-gray-200 rounded-lg p-6">
      <h3 className="text-gray-900 font-bold text-lg mb-1">{t('edit.avatar.title')}</h3>
      <p className="text-sm text-gray-600 mb-4">{t('edit.avatar.subtitle')}</p>

      <div className="flex items-center gap-4 mb-6">
        <Avatar userId={user?.id} size="xl" version={user?.updated_at} />
        {hasAvatar && (
          <button
            type="button"
            onClick={onRemove}
            disabled={isBusy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
            {isRemoving ? t('edit.avatar.removing') : t('edit.avatar.remove')}
          </button>
        )}
      </div>

      {isLoadingOptions ? (
        <BlockLoader silencioso sinRelleno />
      ) : (
        <>
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">{t('edit.avatar.presetsLabel')}</p>
            <div className="grid grid-cols-5 gap-2">
              {presets.map((preset) => {
                const isSelected =
                  user?.avatar_source === 'PRESET' && user?.avatar_preset_id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onSelectPreset(preset.id)}
                    disabled={isBusy}
                    className={`relative aspect-square rounded-full overflow-hidden border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSelected ? 'border-primary ring-2 ring-primary/40' : 'border-gray-200 hover:border-primary/50'
                    }`}
                  >
                    {/* Solo si es una ruta de la propia API (FE-11) */}
                    {imagenDe(preset) && (
                      <img
                        src={imagenDe(preset)}
                        alt={`Preset ${preset.id}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {isSelected && (
                      <span className="absolute inset-0 flex items-center justify-center bg-primary/20">
                        <Check className="w-5 h-5 text-white drop-shadow" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {uploads.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">{t('edit.avatar.historyLabel')}</p>
              <div className="flex flex-wrap gap-2">
                {uploads.map((upload) => (
                  <button
                    key={upload.id}
                    type="button"
                    onClick={() => onActivateUpload(upload.id)}
                    disabled={isBusy}
                    className={`relative w-14 h-14 rounded-full overflow-hidden border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      upload.is_active ? 'border-primary ring-2 ring-primary/40' : 'border-gray-200 hover:border-primary/50'
                    }`}
                  >
                    {/* Solo si es una ruta de la propia API: va con credenciales (FE-11) */}
                    {imagenDe(upload) && (
                      <img
                        src={imagenDe(upload)}
                        alt=""
                        crossOrigin="use-credentials"
                        className="w-full h-full object-cover"
                      />
                    )}
                    {upload.is_active && (
                      <span className="absolute inset-0 flex items-center justify-center bg-primary/20">
                        <Check className="w-4 h-4 text-white drop-shadow" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">{t('edit.avatar.uploadLabel')}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              {isUploading ? t('edit.avatar.uploading') : t('edit.avatar.uploadButton')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AvatarPicker;
