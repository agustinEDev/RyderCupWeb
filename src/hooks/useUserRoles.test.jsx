/**
 * Tests for useUserRoles Hook
 * Sprint 1 v2.1.0: RBAC Frontend Implementation
 *
 * Tests the hook that consumes GET /api/v1/users/me/roles/{competitionId}
 * to provide role-based access control for UI elements.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUserRoles } from './useUserRoles';
import { getUserRolesUseCase } from '../composition';

// Mock the use case
vi.mock('../composition', () => ({
  getUserRolesUseCase: {
    execute: vi.fn(),
  },
}));

describe('useUserRoles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return default roles (all false) and loading state initially', () => {
    getUserRolesUseCase.execute.mockResolvedValue({
      isAdmin: false,
      isCreator: false,
      isPlayer: false,
    });

    const { result } = renderHook(() => useUserRoles('comp-123'));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isCreator).toBe(false);
    expect(result.current.isPlayer).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should fetch and return admin role correctly', async () => {
    getUserRolesUseCase.execute.mockResolvedValue({
      isAdmin: true,
      isCreator: false,
      isPlayer: false,
    });

    const { result } = renderHook(() => useUserRoles('comp-123'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isCreator).toBe(false);
    expect(result.current.isPlayer).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should fetch and return creator role correctly', async () => {
    getUserRolesUseCase.execute.mockResolvedValue({
      isAdmin: false,
      isCreator: true,
      isPlayer: false,
    });

    const { result } = renderHook(() => useUserRoles('comp-123'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isCreator).toBe(true);
    expect(result.current.isPlayer).toBe(false);
  });

  it('should fetch and return player role correctly', async () => {
    getUserRolesUseCase.execute.mockResolvedValue({
      isAdmin: false,
      isCreator: false,
      isPlayer: true,
    });

    const { result } = renderHook(() => useUserRoles('comp-123'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isCreator).toBe(false);
    expect(result.current.isPlayer).toBe(true);
  });

  it('should handle multiple roles correctly', async () => {
    getUserRolesUseCase.execute.mockResolvedValue({
      isAdmin: true,
      isCreator: true,
      isPlayer: true,
    });

    const { result } = renderHook(() => useUserRoles('comp-123'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isCreator).toBe(true);
    expect(result.current.isPlayer).toBe(true);
  });

  it('should not fetch roles if competitionId is not provided', async () => {
    const { result } = renderHook(() => useUserRoles(null));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(getUserRolesUseCase.execute).not.toHaveBeenCalled();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isCreator).toBe(false);
    expect(result.current.isPlayer).toBe(false);
  });

  it('should handle API errors and reset roles to false', async () => {
    const error = new Error('Network error');
    getUserRolesUseCase.execute.mockRejectedValue(error);

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useUserRoles('comp-123'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isCreator).toBe(false);
    expect(result.current.isPlayer).toBe(false);
    expect(result.current.error).toBe(error);

    consoleErrorSpy.mockRestore();
  });

  it('should provide refetch function that re-fetches roles', async () => {
    getUserRolesUseCase.execute
      .mockResolvedValueOnce({
        isAdmin: false,
        isCreator: true,
        isPlayer: false,
      })
      .mockResolvedValueOnce({
        isAdmin: true,
        isCreator: true,
        isPlayer: false,
      });

    const { result } = renderHook(() => useUserRoles('comp-123'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isCreator).toBe(true);
    expect(result.current.isAdmin).toBe(false);

    // Refetch
    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isCreator).toBe(true);
    expect(getUserRolesUseCase.execute).toHaveBeenCalledTimes(2);
  });

  it('should call use case with correct competitionId', async () => {
    getUserRolesUseCase.execute.mockResolvedValue({
      isAdmin: false,
      isCreator: false,
      isPlayer: true,
    });

    renderHook(() => useUserRoles('comp-456'));

    await waitFor(() => {
      expect(getUserRolesUseCase.execute).toHaveBeenCalledWith('comp-456');
    });
  });

  it('should re-fetch roles when competitionId changes', async () => {
    getUserRolesUseCase.execute.mockResolvedValue({
      isAdmin: false,
      isCreator: true,
      isPlayer: false,
    });

    const { rerender } = renderHook(
      ({ compId }) => useUserRoles(compId),
      { initialProps: { compId: 'comp-123' } }
    );

    await waitFor(() => {
      expect(getUserRolesUseCase.execute).toHaveBeenCalledWith('comp-123');
    });

    // Change competitionId
    rerender({ compId: 'comp-456' });

    await waitFor(() => {
      expect(getUserRolesUseCase.execute).toHaveBeenCalledWith('comp-456');
    });

    expect(getUserRolesUseCase.execute).toHaveBeenCalledTimes(2);
  });
});
