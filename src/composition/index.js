import { getAuthToken } from '../utils/secureAuth';
import { default as UserEntity } from '../domain/entities/User';
import IUserRepository from '../domain/repositories/IUserRepository';
import ApiUserRepository from '../infrastructure/repositories/ApiUserRepository';
import UpdateUserProfileUseCase from '../application/use_cases/UpdateUserProfileUseCase';
import UpdateUserSecurityUseCase from '../application/use_cases/UpdateUserSecurityUseCase';
import IHandicapRepository from '../domain/repositories/IHandicapRepository';
import ApiHandicapRepository from '../infrastructure/repositories/ApiHandicapRepository';
import UpdateManualHandicapUseCase from '../application/use_cases/UpdateManualHandicapUseCase';
import UpdateRfegHandicapUseCase from '../application/use_cases/UpdateRfegHandicapUseCase';
import IAuthRepository from '../domain/repositories/IAuthRepository'; // Nuevo
import ApiAuthRepository from '../infrastructure/repositories/ApiAuthRepository'; // Nuevo
import LoginUseCase from '../application/use_cases/LoginUseCase'; // Nuevo
import RegisterUseCase from '../application/use_cases/RegisterUseCase'; // Nuevo


// --- Providers de Infraestructura ---
const authTokenProvider = {
  getToken: () => getAuthToken(),
};

// --- Repositorios (implementaciones concretas) ---
const apiUserRepository = new ApiUserRepository({ authTokenProvider });
const apiHandicapRepository = new ApiHandicapRepository({ authTokenProvider });
const apiAuthRepository = new ApiAuthRepository(); // Nuevo

// --- Casos de Uso ---
const updateUserProfileUseCase = new UpdateUserProfileUseCase({ userRepository: apiUserRepository });
const updateUserSecurityUseCase = new UpdateUserSecurityUseCase({ userRepository: apiUserRepository });
const updateManualHandicapUseCase = new UpdateManualHandicapUseCase({ handicapRepository: apiHandicapRepository });
const updateRfegHandicapUseCase = new UpdateRfegHandicapUseCase({ handicapRepository: apiHandicapRepository });
const loginUseCase = new LoginUseCase({ authRepository: apiAuthRepository }); // Nuevo
const registerUseCase = new RegisterUseCase({ authRepository: apiAuthRepository }); // Nuevo


// Exportar los casos de uso y otros servicios que la capa de presentación necesite
export {
  updateUserProfileUseCase,
  updateUserSecurityUseCase,
  updateManualHandicapUseCase,
  updateRfegHandicapUseCase,
  loginUseCase,   // Nuevo
  registerUseCase, // Nuevo
  // Otros casos de uso aquí
  // También podríamos exportar directamente las entidades si la UI las necesita para displays,
  // aunque la mejor práctica es que la UI reciba DTOs o ViewModels del caso de uso.
  // Por ahora, para simplificar el mapeo inicial, la UI seguirá trabajando con la estructura de UserEntity
  UserEntity, // Exportamos la entidad User para que la UI pueda crear instancias o manipularla.
};
