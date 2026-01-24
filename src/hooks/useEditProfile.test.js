import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEditProfile } from './useEditProfile';
import toast from 'react-hot-toast';
import customToast from '../utils/toast';

// Importar el hook useEditProfile
// import duplicada eliminada

// Mockear (simular) las dependencias externas del hook
vi.mock('../composition', () => ({
  updateUserProfileUseCase: { execute: vi.fn() },
  updateUserSecurityUseCase: { execute: vi.fn() },
  updateManualHandicapUseCase: { execute: vi.fn() },
  updateRfegHandicapUseCase: { execute: vi.fn() },
}));

// Mock useAuth hook
vi.mock('./useAuth', () => ({
  useAuth: vi.fn()
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
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

// Mockear 'react-router-dom' para el hook 'useNavigate'
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Importar para acceder a los mocks
import * as composition from '../composition';
import { useAuth } from './useAuth';

describe('useEditProfile Hook', () => {

  beforeEach(() => {
    // Limpiar todos los mocks antes de cada test
    vi.clearAllMocks();
  });

  it('debería tener un estado de carga inicial y los datos del formulario por defecto', () => {
    // Mock useAuth to return no user
    useAuth.mockReturnValue({
      user: null,
      loading: false,
      error: null,
      refetch: vi.fn()
    });

    // Renderiza el hook en un entorno de test
    const { result } = renderHook(() => useEditProfile());

    // Assertions: verificar el estado inicial
    expect(result.current.isLoading).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.isSaving).toBe(false);
    expect(result.current.isUpdatingRFEG).toBe(false);
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.formData).toEqual({
      firstName: '',
      lastName: '',
      email: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      handicap: '',
      countryCode: ''
    });
  });

  it('debería cargar los datos del usuario al inicializarse si useAuth devuelve un usuario', async () => {
    // 1. Preparar un usuario de prueba
    const mockUserPlain = {
      id: '123',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      handicap: 15.5,
      handicap_updated_at: new Date().toISOString(),
      email_verified: true,
      country_code: null
    };

    // 2. Mock useAuth to return the user
    useAuth.mockReturnValue({
      user: mockUserPlain,
      loading: false,
      error: null,
      refetch: vi.fn()
    });

    let result;
    // 3. Renderizar el hook dentro de 'act' porque el useEffect produce actualizaciones de estado
    await act(async () => {
      result = renderHook(() => useEditProfile()).result;
    });

    // 4. Verificar que los estados se han actualizado correctamente
    expect(result.current.isLoading).toBe(false); // La carga ha finalizado
    expect(result.current.user).toEqual(mockUserPlain); // El usuario ha sido cargado
    expect(result.current.formData).toEqual({ // El formulario se ha rellenado con los datos del usuario
      firstName: mockUserPlain.first_name,
      lastName: mockUserPlain.last_name,
      email: mockUserPlain.email,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      handicap: mockUserPlain.handicap.toString(), // El hándicap se convierte a string
      countryCode: ''
    });
  });

  it('debería llamar a updateUserProfileUseCase y actualizar el estado al llamar a handleUpdateProfile', async () => {
    // Importar dinámicamente el módulo User REAL
    const { default: User } = await vi.importActual('../domain/entities/User');

    // 1. Arrange: Preparar el escenario del test
    const mockUserPlain = { id: '1', first_name: 'John', last_name: 'Doe', email: 'a@a.com', handicap: 10, country_code: null };
    const updatedUserEntity = new User({ id: '1', first_name: 'Johnny', last_name: 'Doe', email: 'a@a.com', handicap: 10, email_verified: true });

    const mockRefetch = vi.fn();

    // Configurar mocks
    useAuth.mockReturnValue({
      user: mockUserPlain,
      loading: false,
      error: null,
      refetch: mockRefetch
    });
    composition.updateUserProfileUseCase.execute.mockResolvedValue(updatedUserEntity);

    // Renderizar el hook
    const { result } = renderHook(() => useEditProfile());

    // Esperar a que la carga inicial termine
    await act(async () => {});

    // 2. Act: Simular la interacción del usuario

    // Cambiar el valor del formulario
    act(() => {
      result.current.handleInputChange({ target: { name: 'firstName', value: 'Johnny' } });
    });

    // Llamar al manejador del submit del formulario
    await act(async () => {
      await result.current.handleUpdateProfile({ preventDefault: vi.fn() });
    });

    // 3. Assert: Verificar que la prueba ocurrió como se esperaba
    expect(composition.updateUserProfileUseCase.execute).toHaveBeenCalledTimes(1);
    expect(composition.updateUserProfileUseCase.execute).toHaveBeenCalledWith(
      mockUserPlain.id,
      { firstName: 'Johnny', lastName: 'Doe' }
    );

    expect(mockRefetch).toHaveBeenCalled();
    expect(customToast.success).toHaveBeenCalledWith('Profile updated successfully!');
    expect(result.current.isSaving).toBe(false); // Asegurarse de que el estado de guardado se resetea
  });

  it('debería llamar a updateUserSecurityUseCase y actualizar el estado (email y password) al llamar a handleUpdateSecurity', async () => {
    // 1. Arrange: Preparar el escenario del test
    const mockUserPlain = { id: '1', first_name: 'John', last_name: 'Doe', email: 'old@example.com', handicap: 10 };
    const newEmail = 'new@example.com';
    const newPassword = 'NewSecurePassword123';
    const currentPassword = 'CurrentPassword123';

    // Importar dinámicamente el módulo User REAL
    const { default: User } = await vi.importActual('../domain/entities/User');
    const updatedUserEntity = new User({
      id: '1',
      first_name: 'John',
      last_name: 'Doe',
      email: newEmail, // Email actualizado
      handicap: 10,
      email_verified: false
    });

    const mockRefetch = vi.fn();

    // Configurar mocks
    useAuth.mockReturnValue({
      user: mockUserPlain,
      loading: false,
      error: null,
      refetch: mockRefetch
    });
    composition.updateUserSecurityUseCase.execute.mockResolvedValue(updatedUserEntity);

    // Renderizar el hook
    const { result } = renderHook(() => useEditProfile());
    await act(async () => {}); // Esperar a que la carga inicial termine

    // 2. Act: Simular la interacción del usuario
    act(() => {
      result.current.handleInputChange({ target: { name: 'email', value: newEmail } });
      result.current.handleInputChange({ target: { name: 'currentPassword', value: currentPassword } });
      result.current.handleInputChange({ target: { name: 'newPassword', value: newPassword } });
      result.current.handleInputChange({ target: { name: 'confirmPassword', value: newPassword } });
    });

    await act(async () => {
      await result.current.handleUpdateSecurity({ preventDefault: vi.fn() });
    });

    // 3. Assert: Verificar que todo ocurrió como se esperaba
    expect(composition.updateUserSecurityUseCase.execute).toHaveBeenCalledTimes(1);
    expect(composition.updateUserSecurityUseCase.execute).toHaveBeenCalledWith({
      userId: mockUserPlain.id,
      securityData: {
        current_password: currentPassword,
        new_email: newEmail,
        new_password: newPassword,
        confirm_password: newPassword,
      },
    });

    expect(mockRefetch).toHaveBeenCalled();
    expect(customToast.success).toHaveBeenCalledWith('Security settings updated successfully!');
    expect(result.current.isSaving).toBe(false); // Asegurarse de que el estado de guardado se resetea

    // Verificar que los campos de contraseña se han limpiado
    expect(result.current.formData.currentPassword).toBe('');
    expect(result.current.formData.newPassword).toBe('');
    expect(result.current.formData.confirmPassword).toBe('');
  });

  it('debería llamar a updateManualHandicapUseCase y actualizar el estado al llamar a handleUpdateHandicapManually', async () => {
    // Arrange
    const mockUserPlain = { id: '1', first_name: 'John', last_name: 'Doe', email: 'a@a.com', handicap: 10 };
    const newHandicap = 12.5;

    // Importar dinámicamente el módulo User REAL
    const { default: User } = await vi.importActual('../domain/entities/User');
    const updatedUserEntity = new User({
      id: '1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'a@a.com',
      handicap: newHandicap,
      email_verified: true
    });

    const mockRefetch = vi.fn();

    useAuth.mockReturnValue({
      user: mockUserPlain,
      loading: false,
      error: null,
      refetch: mockRefetch
    });
    composition.updateManualHandicapUseCase.execute.mockResolvedValue(updatedUserEntity);

    const { result } = renderHook(() => useEditProfile());
    await act(async () => {}); // Esperar a que la carga inicial termine

    // Act
    act(() => {
      result.current.handleInputChange({ target: { name: 'handicap', value: newHandicap.toString() } });
    });

    await act(async () => {
      await result.current.handleUpdateHandicapManually({ preventDefault: vi.fn() });
    });

    // Assert
    expect(composition.updateManualHandicapUseCase.execute).toHaveBeenCalledTimes(1);
    expect(composition.updateManualHandicapUseCase.execute).toHaveBeenCalledWith({
      userId: mockUserPlain.id,
      handicap: newHandicap.toString(),
    });

    expect(mockRefetch).toHaveBeenCalled();
    expect(customToast.success).toHaveBeenCalledWith('Handicap updated successfully!');
    expect(result.current.isSaving).toBe(false);
  });

  it('debería llamar a updateRfegHandicapUseCase y actualizar el estado (incluyendo formData) al llamar a handleUpdateHandicapRFEG', async () => {
    // Arrange
    const mockUserPlain = { id: '1', first_name: 'John', last_name: 'Doe', email: 'a@a.com', handicap: 10 };
    const rfegHandicap = 8.2;
    const updatedUserPlain = { ...mockUserPlain, handicap: rfegHandicap };

    // Importar dinámicamente el módulo User REAL
    const { default: User } = await vi.importActual('../domain/entities/User');
    const updatedUserEntity = new User({
      id: '1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'a@a.com',
      handicap: rfegHandicap,
      email_verified: true
    });

    // Mock refetch that updates the authUser
    const mockRefetch = vi.fn();

    // Initial mock setup
    useAuth.mockReturnValue({
      user: mockUserPlain,
      loading: false,
      error: null,
      refetch: mockRefetch
    });
    composition.updateRfegHandicapUseCase.execute.mockResolvedValue(updatedUserEntity);

    const { result, rerender } = renderHook(() => useEditProfile());
    await act(async () => {}); // Esperar a que la carga inicial termine

    // Act
    await act(async () => {
      // Update mock to return updated user after refetch
      useAuth.mockReturnValue({
        user: updatedUserPlain,
        loading: false,
        error: null,
        refetch: mockRefetch
      });
      await result.current.handleUpdateHandicapRFEG();
      rerender(); // Trigger re-render to update with new authUser
    });

    // Assert
    expect(composition.updateRfegHandicapUseCase.execute).toHaveBeenCalledTimes(1);
    expect(composition.updateRfegHandicapUseCase.execute).toHaveBeenCalledWith({
      userId: mockUserPlain.id,
    });

    expect(mockRefetch).toHaveBeenCalled();
    expect(customToast.success).toHaveBeenCalledWith('Handicap updated from RFEG successfully!');
    expect(result.current.isUpdatingRFEG).toBe(false); // Asegurarse de que el estado se resetea
    expect(result.current.formData.handicap).toBe(rfegHandicap.toString()); // Verificar que formData se actualizó
  });
});
