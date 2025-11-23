import IHandicapRepository from '../../domain/repositories/IHandicapRepository.js';
import IUserRepository from '../../domain/repositories/IUserRepository.js';

class UpdateRfegHandicapUseCase {
  /**
   * @param {Object} dependencies - Objeto de dependencias.
   * @param {IHandicapRepository} dependencies.handicapRepository - El repositorio de hándicaps.
   * @param {IUserRepository} dependencies.userRepository - El repositorio de usuarios.
   */
  constructor({ handicapRepository, userRepository }) {
    this.handicapRepository = handicapRepository;
    this.userRepository = userRepository;
  }

  /**
   * Ejecuta el caso de uso para actualizar el hándicap desde la RFEG.
   * IMPORTANTE: Solo usuarios con nacionalidad española (ES) pueden usar este servicio.
   * @param {Object} params - Parámetros para la actualización.
   * @param {string} params.userId - El ID del usuario.
   * @returns {Promise<import('../../domain/entities/User').default>} El usuario actualizado.
   * @throws {Error} Si el usuario no tiene nacionalidad española o no especificó país.
   */
  async execute({ userId }) {
    console.log('🔍 [UpdateRfegHandicapUseCase] Starting RFEG update for userId:', userId);

    if (!userId) {
      throw new Error('User ID is required');
    }

    // REGLA DE NEGOCIO: Solo usuarios españoles pueden usar RFEG
    // Primero obtenemos los datos del usuario para verificar su nacionalidad
    console.log('🔍 [UpdateRfegHandicapUseCase] Fetching user data from repository...');
    const user = await this.userRepository.getById(userId);

    console.log('🔍 [UpdateRfegHandicapUseCase] User fetched:', {
      userId: user?.id,
      hasUser: !!user,
      hasCountryCode: !!user?.countryCode,
      countryCodeType: user?.countryCode ? typeof user.countryCode : 'undefined',
      countryCodeValue: user?.countryCode?.value ? user.countryCode.value() : 'no value() method',
      rawCountryCode: user?.country_code,
      userKeys: user ? Object.keys(user) : []
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Validar que el usuario tenga nacionalidad española
    if (!user.countryCode) {
      console.error('❌ [UpdateRfegHandicapUseCase] User has no countryCode');
      throw new Error(
        'RFEG handicap updates require Spanish nationality. Please update your nationality in your profile to continue.'
      );
    }

    const countryValue = user.countryCode.value();
    console.log('🔍 [UpdateRfegHandicapUseCase] Country code value:', countryValue);

    if (countryValue !== 'ES') {
      console.error('❌ [UpdateRfegHandicapUseCase] User is not Spanish:', countryValue);
      throw new Error(
        'RFEG handicap updates are only available for Spanish players. Your nationality is set to: ' + countryValue
      );
    }

    // Si llegamos aquí, el usuario es español y puede usar RFEG
    console.log('✅ [UpdateRfegHandicapUseCase] User is Spanish, proceeding with RFEG update...');
    const updatedUser = await this.handicapRepository.updateFromRfeg(userId);

    console.log('✅ [UpdateRfegHandicapUseCase] RFEG update successful');
    return updatedUser;
  }
}

export default UpdateRfegHandicapUseCase;