import IAvatarRepository from '../../domain/repositories/IAvatarRepository';
import apiRequest from '../../services/api.js';

/**
 * ApiAvatarRepository - REST API implementation
 *
 * Endpoints:
 * - GET    /api/v1/avatar-presets
 * - POST   /api/v1/users/me/avatar/preset
 * - POST   /api/v1/users/me/avatar/upload
 * - GET    /api/v1/users/me/avatar/uploads
 * - POST   /api/v1/users/me/avatar/uploads/{id}/activate
 * - DELETE /api/v1/users/me/avatar
 */
class ApiAvatarRepository extends IAvatarRepository {
  async listPresets() {
    return apiRequest('/api/v1/avatar-presets');
  }

  async setPreset(presetId) {
    return apiRequest('/api/v1/users/me/avatar/preset', {
      method: 'POST',
      body: JSON.stringify({ preset_id: presetId }),
    });
  }

  async upload(file) {
    const formData = new FormData();
    formData.append('file', file);

    return apiRequest('/api/v1/users/me/avatar/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async listMyUploads() {
    return apiRequest('/api/v1/users/me/avatar/uploads');
  }

  async activateUpload(uploadId) {
    return apiRequest(`/api/v1/users/me/avatar/uploads/${uploadId}/activate`, {
      method: 'POST',
    });
  }

  async remove() {
    return apiRequest('/api/v1/users/me/avatar', {
      method: 'DELETE',
    });
  }
}

export default ApiAvatarRepository;
