/**
 * Tests for useEditProfile - Password History handling
 * v1.13.0: Password History validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEditProfile } from './useEditProfile';
import customToast from '../utils/toast';
import * as composition from '../composition';
import * as useAuthHook from './useAuth';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en' }
  })
}));

// Mock dependencies
vi.mock('../composition', () => ({
  updateUserSecurityUseCase: {
    execute: vi.fn(),
  },
  fetchCountriesUseCase: {
    execute: vi.fn(),
  },
}));

vi.mock('./useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    custom: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock('../utils/toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe('useEditProfile - Password History', () => {
  const mockUser = {
    id: 'user-123',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    handicap: 10,
    country_code: 'ES',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useAuth to return a valid user
    useAuthHook.useAuth.mockReturnValue({
      user: mockUser,
      refetch: vi.fn(),
    });

    // Mock fetchCountriesUseCase
    composition.fetchCountriesUseCase.execute.mockResolvedValue([
      { code: 'ES', name: 'Spain' },
    ]);
  });

  describe('handleUpdateSecurity - Password History', () => {
    it('should display password history error when user reuses old password', async () => {
      const { result } = renderHook(() => useEditProfile());

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock password history error from backend
      composition.updateUserSecurityUseCase.execute.mockRejectedValue(
        new Error('Cannot use one of the last 5 passwords')
      );

      // Set form data with password change
      act(() => {
        result.current.handleInputChange({
          target: { name: 'currentPassword', value: 'OldPassword123' },
        });
        result.current.handleInputChange({
          target: { name: 'newPassword', value: 'ReusedPassword123' },
        });
        result.current.handleInputChange({
          target: { name: 'confirmPassword', value: 'ReusedPassword123' },
        });
      });

      // Trigger security update
      await act(async () => {
        await result.current.handleUpdateSecurity({ preventDefault: vi.fn() });
      });

      // Verify error toast was called with specific password history message
      expect(customToast.error).toHaveBeenCalledWith(
        'toasts.passwordReused',
        expect.objectContaining({
          duration: 8000,
          icon: '🔑',
        })
      );
    });

    it('should display password history error with different message format', async () => {
      const { result } = renderHook(() => useEditProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock password history error with different message
      composition.updateUserSecurityUseCase.execute.mockRejectedValue(
        new Error('Password cannot match any of the last 5 passwords')
      );

      act(() => {
        result.current.handleInputChange({
          target: { name: 'currentPassword', value: 'CurrentPassword123' },
        });
        result.current.handleInputChange({
          target: { name: 'newPassword', value: 'OldPassword123' },
        });
        result.current.handleInputChange({
          target: { name: 'confirmPassword', value: 'OldPassword123' },
        });
      });

      await act(async () => {
        await result.current.handleUpdateSecurity({ preventDefault: vi.fn() });
      });

      expect(customToast.error).toHaveBeenCalledWith(
        'toasts.passwordReused',
        expect.objectContaining({
          duration: 8000,
          icon: '🔑',
        })
      );
    });

    it('should display generic error for non-password-history errors', async () => {
      const { result } = renderHook(() => useEditProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock generic error
      composition.updateUserSecurityUseCase.execute.mockRejectedValue(
        new Error('Invalid current password')
      );

      act(() => {
        result.current.handleInputChange({
          target: { name: 'currentPassword', value: 'Wrong123' },
        });
        result.current.handleInputChange({
          target: { name: 'newPassword', value: 'NewValidPass123' },
        });
        result.current.handleInputChange({
          target: { name: 'confirmPassword', value: 'NewValidPass123' },
        });
      });

      await act(async () => {
        await result.current.handleUpdateSecurity({ preventDefault: vi.fn() });
      });

      // Should show generic error, not password history error
      expect(customToast.error).toHaveBeenCalledWith('Invalid current password');
    });

    it('should successfully update password when not reusing old passwords', async () => {
      // Mock refetch before renderHook
      const refetchMock = vi.fn();
      useAuthHook.useAuth.mockReturnValue({
        user: mockUser,
        refetch: refetchMock,
      });

      const { result } = renderHook(() => useEditProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock successful update
      composition.updateUserSecurityUseCase.execute.mockResolvedValue();

      act(() => {
        result.current.handleInputChange({
          target: { name: 'currentPassword', value: 'Current123' },
        });
        result.current.handleInputChange({
          target: { name: 'newPassword', value: 'BrandNewPassword123' },
        });
        result.current.handleInputChange({
          target: { name: 'confirmPassword', value: 'BrandNewPassword123' },
        });
      });

      await act(async () => {
        await result.current.handleUpdateSecurity({ preventDefault: vi.fn() });
      });

      expect(customToast.success).toHaveBeenCalledWith(
        'toasts.securityUpdated'
      );
      expect(customToast.error).not.toHaveBeenCalled();
      expect(refetchMock).toHaveBeenCalled();
    });
  });
});
