/**
 * Los límites de Seguridad, con su motivo traducido (RyderCupAm #753, punto 5).
 *
 *   L1 TOO_MANY_SECURITY_CHANGES       | toasts.tooManySecurityChanges
 *   L2 TOO_MANY_EMAIL_CHANGE_REQUESTS  | toasts.tooManyEmailChanges
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

describe('useEditProfile · los límites de Seguridad', () => {
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
    useAuthHook.useAuth.mockReturnValue({ user: mockUser, refetch: vi.fn() });
    composition.fetchCountriesUseCase.execute.mockResolvedValue([{ code: 'ES', name: 'Spain' }]);
  });

  it.each([
    ['L1', 'TOO_MANY_SECURITY_CHANGES', 'toasts.tooManySecurityChanges'],
    ['L2', 'TOO_MANY_EMAIL_CHANGE_REQUESTS', 'toasts.tooManyEmailChanges'],
  ])('%s: %s dice su motivo', async (_caso, codigo, clave) => {
    const { result } = renderHook(() => useEditProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    composition.updateUserSecurityUseCase.execute.mockRejectedValue(
      Object.assign(new Error('Too many'), { status: 429, errorCode: codigo })
    );
    act(() => {
      result.current.handleInputChange({ target: { name: 'currentPassword', value: 'Actual123!' } });
      result.current.handleInputChange({ target: { name: 'email', value: 'nuevo@example.com' } });
    });

    await act(async () => {
      await result.current.handleUpdateSecurity({ preventDefault: vi.fn() });
    });

    expect(customToast.error).toHaveBeenCalledWith(clave);
  });
});
