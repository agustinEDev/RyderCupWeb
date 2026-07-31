/**
 * Interface: IAvatarRepository
 *
 * Defines the persistence contract for user avatars (fixed golf-photo presets
 * and uploaded photos).
 *
 * Implementations:
 * - ApiAvatarRepository (REST API)
 */
/* eslint-disable no-unused-vars */

class IAvatarRepository {
  /**
   * List the fixed catalog of preset avatars.
   *
   * @returns {Promise<Array<{id: number, image_url: string}>>}
   */
  async listPresets() {
    throw new Error('Method listPresets() must be implemented');
  }

  /**
   * Activate a preset avatar for the current user.
   *
   * @param {number} presetId
   * @returns {Promise<Object>} Updated user
   */
  async setPreset(presetId) {
    throw new Error('Method setPreset() must be implemented');
  }

  /**
   * Upload a new photo and activate it as avatar.
   *
   * @param {File} file
   * @returns {Promise<Object>} Uploaded photo info { id, created_at, is_active, image_url }
   */
  async upload(file) {
    throw new Error('Method upload() must be implemented');
  }

  /**
   * List the current user's uploaded photo history (max 5).
   *
   * @returns {Promise<Array<Object>>}
   */
  async listMyUploads() {
    throw new Error('Method listMyUploads() must be implemented');
  }

  /**
   * Reactivate a previously uploaded photo without re-uploading.
   *
   * @param {string} uploadId
   * @returns {Promise<Object>} Updated user
   */
  async activateUpload(uploadId) {
    throw new Error('Method activateUpload() must be implemented');
  }

  /**
   * Clear the active avatar (falls back to default placeholder).
   *
   * @returns {Promise<Object>} Updated user
   */
  async remove() {
    throw new Error('Method remove() must be implemented');
  }
}

export default IAvatarRepository;
