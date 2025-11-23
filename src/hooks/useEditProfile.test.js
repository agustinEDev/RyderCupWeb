import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEditProfile } from './useEditProfile';
import toast from 'react-hot-toast';

// Mockear (simular) las dependencias externas del hook
vi.mock('../composition', () => ({
  updateUserProfileUseCase: { execute: vi.fn() },
  updateUserSecurityUseCase: { execute: vi.fn() },
  updateManualHandicapUseCase: { execute: vi.fn() },
  updateRfegHandicapUseCase: { execute: vi.fn() },
}));

vi.mock('../utils/secureAuth', () => ({
  getAuthToken: vi.fn(),
  getUserData: vi.fn(),
  setUserData: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mockear 'react-router-dom' para el hook 'useNavigate'
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Importar los mocks para poder controlarlos en los tests
import * as secureAuth from '../utils/secureAuth';
import * as composition from '../composition'; // Importar para acceder a los mocks


describe('useEditProfile Hook', () => {

  beforeEach(() => {
    // Limpiar todos los mocks antes de cada test
    vi.clearAllMocks();
    // Asegurarse de que getUserData por defecto no devuelva un usuario para el test inicial
    secureAuth.getUserData.mockReturnValue(null); 
  });

  it('debería tener un estado de carga inicial y los datos del formulario por defecto', () => {
    // Renderiza el hook en un entorno de test
    const { result } = renderHook(() => useEditProfile());

    // Assertions: verificar el estado inicial
    expect(result.current.isLoading).toBe(false); // Corregido según discusión
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
      handicap: ''
    });
  });

  it('debería cargar los datos del usuario al inicializarse si getUserData devuelve un usuario', async () => {
    // 1. Preparar un usuario de prueba
    const mockUserPlain = {
      id: '123',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      handicap: 15.5,
      handicap_updated_at: new Date().toISOString(),
      is_verified: true,
    };

    // 2. Configurar el mock de getUserData para que devuelva el usuario de prueba
    secureAuth.getUserData.mockReturnValue(mockUserPlain);

    let result;
    // 3. Renderizar el hook dentro de 'act' porque el useEffect produce actualizaciones de estado
    await act(async () => {
      result = renderHook(() => useEditProfile()).result;
    });

    // 4. Verificar que los estados se han actualizado correctamente
    expect(secureAuth.getUserData).toHaveBeenCalledTimes(1); // Se llama una vez al inicializarse
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
    });
  });

  it('debería llamar a updateUserProfileUseCase y actualizar el estado al llamar a handleUpdateProfile', async () => {
    // Importar dinámicamente el módulo User REAL
    // eslint-disable-next-line no-unused-vars
    const { default: User } = await vi.importActual('../domain/entities/User');

    // 1. Arrange: Preparar el escenario del test
    const mockUserPlain = { id: '1', first_name: 'John', last_name: 'Doe', email: 'a@a.com', handicap: 10 };
    const updatedUserEntity = new User({ id: '1', first_name: 'Johnny', last_name: 'Doe', email: 'a@a.com', handicap: 10, email_verified: true });

    // Configurar mocks
    secureAuth.getUserData.mockReturnValue(mockUserPlain);
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

    // 3. Assert: Verificar que todo ocurrió como se esperaba
    expect(composition.updateUserProfileUseCase.execute).toHaveBeenCalledTimes(1);
    expect(composition.updateUserProfileUseCase.execute).toHaveBeenCalledWith(
      mockUserPlain.id,
      { firstName: 'Johnny', lastName: 'Doe' }
    );

    expect(secureAuth.setUserData).toHaveBeenCalledWith(updatedUserEntity.toPersistence());
    expect(result.current.user).toEqual(updatedUserEntity.toPersistence());
    expect(toast.success).toHaveBeenCalledWith('Profile updated successfully!');
    expect(result.current.isSaving).toBe(false); // Asegurarse de que el estado de guardado se resetea
  });

  it('debería llamar a updateUserSecurityUseCase y actualizar el estado (email y password) al llamar a handleUpdateSecurity', async () => {
    // 1. Arrange: Preparar el escenario del test
    const mockUserPlain = { id: '1', first_name: 'John', last_name: 'Doe', email: 'old@example.com', handicap: 10 };
    const newEmail = 'new@example.com';
    const newPassword = 'NewSecurePassword123';
    const currentPassword = 'CurrentPassword123';

    // Importar dinámicamente el módulo User REAL
    // eslint-disable-next-line no-unused-vars
    const { default: User } = await vi.importActual('../domain/entities/User');
    const updatedUserEntity = new User({ 
      id: '1', 
      first_name: 'John', 
      last_name: 'Doe', 
      email: newEmail, // Email actualizado
      handicap: 10, 
      email_verified: false 
    });

    // Configurar mocks
    secureAuth.getUserData.mockReturnValue(mockUserPlain);
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

    expect(secureAuth.setUserData).toHaveBeenCalledWith(updatedUserEntity.toPersistence());
    expect(result.current.user).toEqual(updatedUserEntity.toPersistence());
    expect(toast.success).toHaveBeenCalledWith('Security settings updated successfully!');
    expect(result.current.isSaving).toBe(false); // Asegurarse de que el estado de guardado se resetea

    // Verificar que los campos de contraseña se han limpiado y el email en formData se ha actualizado
    expect(result.current.formData.email).toBe(newEmail);
    expect(result.current.formData.currentPassword).toBe('');
    expect(result.current.formData.newPassword).toBe('');
    expect(result.current.formData.confirmPassword).toBe('');
  });

  it('debería llamar a updateManualHandicapUseCase y actualizar el estado al llamar a handleUpdateHandicapManually', async () => {
    // Arrange
    const mockUserPlain = { id: '1', first_name: 'John', last_name: 'Doe', email: 'a@a.com', handicap: 10 };
    const newHandicap = 12.5;

    // Importar dinámicamente el módulo User REAL
    // eslint-disable-next-line no-unused-vars
    const { default: User } = await vi.importActual('../domain/entities/User');
    const updatedUserEntity = new User({ 
      id: '1', 
      first_name: 'John', 
      last_name: 'Doe', 
      email: 'a@a.com', 
      handicap: newHandicap, 
      email_verified: true 
    });

    secureAuth.getUserData.mockReturnValue(mockUserPlain);
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

    expect(secureAuth.setUserData).toHaveBeenCalledWith(updatedUserEntity.toPersistence());
    expect(result.current.user).toEqual(updatedUserEntity.toPersistence());
    expect(toast.success).toHaveBeenCalledWith('Handicap updated successfully!');
    expect(result.current.isSaving).toBe(false);
    expect(result.current.formData.handicap).toBe(newHandicap.toString());
  });

  it('debería llamar a updateRfegHandicapUseCase y actualizar el estado (incluyendo formData) al llamar a handleUpdateHandicapRFEG', async () => {
    // Arrange
    const mockUserPlain = { id: '1', first_name: 'John', last_name: 'Doe', email: 'a@a.com', handicap: 10 };
    const rfegHandicap = 8.2;

    // Importar dinámicamente el módulo User REAL
    // eslint-disable-next-line no-unused-vars
    const { default: User } = await vi.importActual('../domain/entities/User');
    const updatedUserEntity = new User({ 
      id: '1', 
      first_name: 'John', 
      last_name: 'Doe', 
      email: 'a@a.com', 
      handicap: rfegHandicap, 
      email_verified: true 
    });

    secureAuth.getUserData.mockReturnValue(mockUserPlain);
    composition.updateRfegHandicapUseCase.execute.mockResolvedValue(updatedUserEntity);

    const { result } = renderHook(() => useEditProfile());
    await act(async () => {}); // Esperar a que la carga inicial termine

    // Act
    await act(async () => {
      await result.current.handleUpdateHandicapRFEG();
    });

    // Assert
    expect(composition.updateRfegHandicapUseCase.execute).toHaveBeenCalledTimes(1);
    expect(composition.updateRfegHandicapUseCase.execute).toHaveBeenCalledWith({
      userId: mockUserPlain.id,
    });

    expect(secureAuth.setUserData).toHaveBeenCalledWith(updatedUserEntity.toPersistence());
    expect(result.current.user).toEqual(updatedUserEntity.toPersistence());
    expect(toast.success).toHaveBeenCalledWith('Handicap updated from RFEG successfully!');
    expect(result.current.isUpdatingRFEG).toBe(false); // Asegurarse de que el estado se resetea
    expect(result.current.formData.handicap).toBe(rfegHandicap.toString()); // Verificar que formData se actualizó
  });

  it('debería llamar a la API para refrescar los datos del usuario y actualizar el estado al llamar a handleRefreshUserData', async () => {
    // Arrange
    const initialUserPlain = { id: '1', first_name: 'OldName', last_name: 'OldLastName', email: 'old@example.com', handicap: 10 };
    const refreshedUserPlain = { id: '1', first_name: 'NewName', last_name: 'NewLastName', email: 'new@example.com', handicap: 12, handicap_updated_at: new Date().toISOString() };
    
    // Mockear fetch para simular la llamada a la API
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(refreshedUserPlain),
      })
    );

    secureAuth.getUserData.mockReturnValue(initialUserPlain);
    secureAuth.getAuthToken.mockReturnValue('mock-token');

    const { result } = renderHook(() => useEditProfile());
    await act(async () => {}); // Esperar a que la carga inicial termine

    // Act
    await act(async () => {
      await result.current.handleRefreshUserData();
    });

    // Assert
    expect(secureAuth.getAuthToken).toHaveBeenCalled();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/auth/current-user'), // Verificar la URL parcial
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Authorization': 'Bearer mock-token',
        },
      })
    );
    expect(secureAuth.setUserData).toHaveBeenCalledWith(refreshedUserPlain);
    expect(result.current.user).toEqual(refreshedUserPlain);
    expect(result.current.formData.firstName).toBe(refreshedUserPlain.first_name);
    expect(result.current.isRefreshing).toBe(false);
    expect(toast.success).toHaveBeenCalledWith('Profile data refreshed successfully!');

    // Limpiar el mock de fetch
    vi.restoreAllMocks();
  });

});
