import { getAuthToken } from '../utils/secureAuth'; // Asumiendo que esta función existe y obtiene el token
import { default as UserEntity } from '../domain/entities/User'; // Renombrar para evitar conflicto
import IUserRepository from '../domain/repositories/IUserRepository';
import ApiUserRepository from '../infrastructure/repositories/ApiUserRepository';
import UpdateUserProfileUseCase from '../application/use_cases/UpdateUserProfileUseCase';

// --- Providers de Infraestructura ---
const authTokenProvider = {
  getToken: () => getAuthToken(),
};

// --- Repositorios (implementaciones concretas) ---
const apiUserRepository = new ApiUserRepository({ authTokenProvider });

// --- Casos de Uso ---
const updateUserProfileUseCase = new UpdateUserProfileUseCase({ userRepository: apiUserRepository });

// Exportar los casos de uso y otros servicios que la capa de presentación necesite
export {
  updateUserProfileUseCase,
  // Otros casos de uso aquí
  // También podríamos exportar directamente las entidades si la UI las necesita para displays,
  // aunque la mejor práctica es que la UI reciba DTOs o ViewModels del caso de uso.
  // Por ahora, para simplificar el mapeo inicial, la UI seguirá trabajando con la estructura de UserEntity
  UserEntity, // Exportamos la entidad User para que la UI pueda crear instancias o manipularla.
};
