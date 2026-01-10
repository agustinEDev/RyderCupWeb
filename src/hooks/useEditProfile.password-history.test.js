/**
 * Tests for useEditProfile - Password History handling
 * v1.13.0: Password History validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEditProfile } from './useEditProfile';
import * as composition from '../composition';
import * as useAuthHook from './useAuth';
import toast from 'react-hot-toast';

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
      expect(toast.error).toHaveBeenCalledWith(
        'Cannot reuse any of your last 5 passwords. Please choose a different password.',
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

      expect(toast.error).toHaveBeenCalledWith(
        'Cannot reuse any of your last 5 passwords. Please choose a different password.',
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
          target: { name: 'newPassword', value: 'NewValid123' },
        });
        result.current.handleInputChange({
          target: { name: 'confirmPassword', value: 'NewValid123' },
        });
      });

      await act(async () => {
        await result.current.handleUpdateSecurity({ preventDefault: vi.fn() });
      });

      // Should show generic error, not password history error
      expect(toast.error).toHaveBeenCalledWith('Invalid current password');
    });

    it('should successfully update password when not reusing old passwords', async () => {
      const { result } = renderHook(() => useEditProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock successful update
      composition.updateUserSecurityUseCase.execute.mockResolvedValue();

      const refetchMock = vi.fn();
      useAuthHook.useAuth.mockReturnValue({
        user: mockUser,
        refetch: refetchMock,
      });

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

      expect(toast.success).toHaveBeenCalledWith(
        'Security settings updated successfully!'
      );
      expect(toast.error).not.toHaveBeenCalled();
    });
  });
});
