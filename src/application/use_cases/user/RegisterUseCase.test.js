import { describe, it, expect, vi, beforeEach } from 'vitest';
import RegisterUseCase from './RegisterUseCase';
import User from '../../../domain/entities/User';
import Email from '../../../domain/value_objects/Email';
import Password from '../../../domain/value_objects/Password';

describe('RegisterUseCase', () => {
  let authRepository;
  let registerUseCase;

  beforeEach(() => {
    // Resetear todos los mocks antes de cada test
    vi.clearAllMocks();

    // Crear un mock del authRepository
    authRepository = {
      register: vi.fn(),
    };

    // Instanciar RegisterUseCase con el mock
    registerUseCase = new RegisterUseCase({ authRepository });
  });

  it('should successfully register a new user', async () => {
    // Arrange
    const userData = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      password: 'StrongPassword123'
    };
    const mockNewUserEntity = new User({
      id: '456',
      first_name: userData.firstName,
      last_name: userData.lastName,
      email: userData.email,
      email_verified: false
    });

    // Configurar el mock del repositorio para devolver el usuario simulado
    authRepository.register.mockResolvedValue(mockNewUserEntity);

    // Act
    const registeredUser = await registerUseCase.execute(userData);

    // Assert
    // 1. Verificar que el método register del repositorio fue llamado con los datos correctos
    // Comprobar que se pasan instancias de Email y Password con el valor correcto
    const callArg = authRepository.register.mock.calls[0][0];
    expect(callArg.firstName).toBe(userData.firstName);
    expect(callArg.lastName).toBe(userData.lastName);
    expect(callArg.email).toBeInstanceOf(Email);
    expect(callArg.email._value).toBe(userData.email);
    expect(callArg.password).toBeInstanceOf(Password);
    expect(callArg.password._value).toBe(userData.password);
    // countryCode puede ser null o instancia
    expect(callArg.countryCode === null || typeof callArg.countryCode === 'object').toBe(true);

    // 2. Verificar que el caso de uso devuelve la entidad User correcta
    expect(registeredUser).toEqual(mockNewUserEntity);
  });

  it('should throw an error if any required user data field is not provided', async () => {
    // Test case 1: Missing firstName
    await expect(registerUseCase.execute({
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      password: 'StrongPassword123'
    })).rejects.toThrow('All user data fields are required for registration');

    // Test case 2: Missing email
    await expect(registerUseCase.execute({
      firstName: 'Jane',
      lastName: 'Doe',
      password: 'StrongPassword123'
    })).rejects.toThrow('All user data fields are required for registration');

    // Add more test cases for other missing fields as needed
  });

  it('should propagate errors from the auth repository', async () => {
    // Arrange
    const userData = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'existing@example.com',
      password: 'StrongPassword123'
    };
    const mockError = new Error('Email already registered');

    authRepository.register.mockRejectedValue(mockError);

    // Act & Assert
    await expect(registerUseCase.execute(userData)).rejects.toThrow('Email already registered');
    const callArg = authRepository.register.mock.calls[0][0];
    expect(callArg.firstName).toBe(userData.firstName);
    expect(callArg.lastName).toBe(userData.lastName);
    expect(callArg.email).toBeInstanceOf(Email);
    expect(callArg.email._value).toBe(userData.email);
    expect(callArg.password).toBeInstanceOf(Password);
    expect(callArg.password._value).toBe(userData.password);
    expect(callArg.countryCode === null || typeof callArg.countryCode === 'object').toBe(true);
  });
});
