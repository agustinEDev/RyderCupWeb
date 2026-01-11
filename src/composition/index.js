export { default as UserEntity } from '../domain/entities/User';
import ApiUserRepository from '../infrastructure/repositories/ApiUserRepository';
// User Use Cases
import UpdateUserProfileUseCase from '../application/use_cases/user/UpdateUserProfileUseCase';
import UpdateUserSecurityUseCase from '../application/use_cases/user/UpdateUserSecurityUseCase';
import ApiAuthRepository from '../infrastructure/repositories/ApiAuthRepository';
import LoginUseCase from '../application/use_cases/user/LoginUseCase';
import RegisterUseCase from '../application/use_cases/user/RegisterUseCase';
import VerifyEmailUseCase from '../application/use_cases/user/VerifyEmailUseCase';
import RequestPasswordResetUseCase from '../application/use_cases/user/RequestPasswordResetUseCase';
import ValidateResetTokenUseCase from '../application/use_cases/user/ValidateResetTokenUseCase';
import ResetPasswordUseCase from '../application/use_cases/user/ResetPasswordUseCase';

// Handicap Use Cases
import ApiHandicapRepository from '../infrastructure/repositories/ApiHandicapRepository';
import UpdateManualHandicapUseCase from '../application/use_cases/handicap/UpdateManualHandicapUseCase';
import UpdateRfegHandicapUseCase from '../application/use_cases/handicap/UpdateRfegHandicapUseCase';

// Country Use Cases
import FetchCountriesUseCase from '../application/use_cases/country/FetchCountriesUseCase';

// Device Management Use Cases (v1.13.0)
import ApiDeviceRepository from '../infrastructure/repositories/ApiDeviceRepository';
import GetActiveDevicesUseCase from '../application/use_cases/device/GetActiveDevicesUseCase';
import RevokeDeviceUseCase from '../application/use_cases/device/RevokeDeviceUseCase';

// Competition Use Cases
import ApiCompetitionRepository from '../infrastructure/repositories/ApiCompetitionRepository';
import CreateCompetitionUseCase from '../application/use_cases/competition/CreateCompetitionUseCase';
import ListUserCompetitionsUseCase from '../application/use_cases/competition/ListUserCompetitionsUseCase';
import GetCompetitionDetailUseCase from '../application/use_cases/competition/GetCompetitionDetailUseCase';
import ActivateCompetitionUseCase from '../application/use_cases/competition/ActivateCompetitionUseCase';
import CloseEnrollmentsUseCase from '../application/use_cases/competition/CloseEnrollmentsUseCase';
import StartCompetitionUseCase from '../application/use_cases/competition/StartCompetitionUseCase';
import CompleteCompetitionUseCase from '../application/use_cases/competition/CompleteCompetitionUseCase';
import CancelCompetitionUseCase from '../application/use_cases/competition/CancelCompetitionUseCase';
import BrowseJoinableCompetitionsUseCase from '../application/use_cases/competition/BrowseJoinableCompetitionsUseCase';
import BrowseExploreCompetitionsUseCase from '../application/use_cases/competition/BrowseExploreCompetitionsUseCase';

// Enrollment Use Cases
import ApiEnrollmentRepository from '../infrastructure/repositories/ApiEnrollmentRepository';
import RequestEnrollmentUseCase from '../application/use_cases/enrollment/RequestEnrollmentUseCase';
import ListEnrollmentsUseCase from '../application/use_cases/enrollment/ListEnrollmentsUseCase';
import ApproveEnrollmentUseCase from '../application/use_cases/enrollment/ApproveEnrollmentUseCase';
import RejectEnrollmentUseCase from '../application/use_cases/enrollment/RejectEnrollmentUseCase';
import CancelEnrollmentUseCase from '../application/use_cases/enrollment/CancelEnrollmentUseCase';
import WithdrawEnrollmentUseCase from '../application/use_cases/enrollment/WithdrawEnrollmentUseCase';
import SetCustomHandicapUseCase from '../application/use_cases/enrollment/SetCustomHandicapUseCase';
import DirectEnrollUseCase from '../application/use_cases/enrollment/DirectEnrollUseCase';


// --- Repositorios (implementaciones concretas) ---
// Con httpOnly cookies ya no necesitamos authTokenProvider
const apiUserRepository = new ApiUserRepository();
const apiHandicapRepository = new ApiHandicapRepository();
const apiAuthRepository = new ApiAuthRepository();
const apiCompetitionRepository = new ApiCompetitionRepository();
const apiEnrollmentRepository = new ApiEnrollmentRepository();
const apiDeviceRepository = new ApiDeviceRepository();

// --- Casos de Uso ---
const updateUserProfileUseCase = new UpdateUserProfileUseCase({ userRepository: apiUserRepository });
const updateUserSecurityUseCase = new UpdateUserSecurityUseCase({ userRepository: apiUserRepository });
const updateManualHandicapUseCase = new UpdateManualHandicapUseCase({ handicapRepository: apiHandicapRepository });
const updateRfegHandicapUseCase = new UpdateRfegHandicapUseCase({
  handicapRepository: apiHandicapRepository,
  userRepository: apiUserRepository
});
const loginUseCase = new LoginUseCase({ authRepository: apiAuthRepository });
const registerUseCase = new RegisterUseCase({ authRepository: apiAuthRepository });
const verifyEmailUseCase = new VerifyEmailUseCase({ authRepository: apiAuthRepository });
const requestPasswordResetUseCase = new RequestPasswordResetUseCase({ authRepository: apiAuthRepository });
const validateResetTokenUseCase = new ValidateResetTokenUseCase({ authRepository: apiAuthRepository });
const resetPasswordUseCase = new ResetPasswordUseCase({ authRepository: apiAuthRepository });
const createCompetitionUseCase = new CreateCompetitionUseCase({ competitionRepository: apiCompetitionRepository });
const listUserCompetitionsUseCase = new ListUserCompetitionsUseCase({ competitionRepository: apiCompetitionRepository });
const getCompetitionDetailUseCase = new GetCompetitionDetailUseCase({ competitionRepository: apiCompetitionRepository });
const activateCompetitionUseCase = new ActivateCompetitionUseCase();
const closeEnrollmentsUseCase = new CloseEnrollmentsUseCase();
const startCompetitionUseCase = new StartCompetitionUseCase();
const completeCompetitionUseCase = new CompleteCompetitionUseCase();
const cancelCompetitionUseCase = new CancelCompetitionUseCase();
const browseJoinableCompetitionsUseCase = new BrowseJoinableCompetitionsUseCase(apiCompetitionRepository);
const browseExploreCompetitionsUseCase = new BrowseExploreCompetitionsUseCase(apiCompetitionRepository);
const fetchCountriesUseCase = new FetchCountriesUseCase();

// Enrollment Use Cases
const requestEnrollmentUseCase = new RequestEnrollmentUseCase(apiEnrollmentRepository);
const listEnrollmentsUseCase = new ListEnrollmentsUseCase(apiEnrollmentRepository);
const approveEnrollmentUseCase = new ApproveEnrollmentUseCase(apiEnrollmentRepository);
const rejectEnrollmentUseCase = new RejectEnrollmentUseCase(apiEnrollmentRepository);
const userCancelEnrollmentUseCase = new CancelEnrollmentUseCase(apiEnrollmentRepository);
const withdrawEnrollmentUseCase = new WithdrawEnrollmentUseCase(apiEnrollmentRepository);
const setCustomHandicapUseCase = new SetCustomHandicapUseCase(apiEnrollmentRepository);
const directEnrollUseCase = new DirectEnrollUseCase(apiEnrollmentRepository);

// Device Management Use Cases (v1.13.0)
const getActiveDevicesUseCase = new GetActiveDevicesUseCase({ deviceRepository: apiDeviceRepository });
const revokeDeviceUseCase = new RevokeDeviceUseCase({ deviceRepository: apiDeviceRepository });


// Exportar los casos de uso y otros servicios que la capa de presentación necesite
export {
  updateUserProfileUseCase,
  updateUserSecurityUseCase,
  updateManualHandicapUseCase,
  updateRfegHandicapUseCase,
  loginUseCase,
  registerUseCase,
  verifyEmailUseCase,
  requestPasswordResetUseCase,
  validateResetTokenUseCase,
  resetPasswordUseCase,
  createCompetitionUseCase,
  listUserCompetitionsUseCase,
  getCompetitionDetailUseCase,
  activateCompetitionUseCase,
  closeEnrollmentsUseCase,
  startCompetitionUseCase,
  completeCompetitionUseCase,
  cancelCompetitionUseCase,
  browseJoinableCompetitionsUseCase,
  browseExploreCompetitionsUseCase,
  // Country Use Cases
  fetchCountriesUseCase,
  // Enrollment Use Cases
  requestEnrollmentUseCase,
  listEnrollmentsUseCase,
  approveEnrollmentUseCase,
  rejectEnrollmentUseCase,
  userCancelEnrollmentUseCase, // Usuario cancela su solicitud (diferente de cancelCompetitionUseCase)
  withdrawEnrollmentUseCase,
  setCustomHandicapUseCase,
  directEnrollUseCase,
  // Device Management Use Cases (v1.13.0)
  getActiveDevicesUseCase,
  revokeDeviceUseCase,
  // También podríamos exportar directamente las entidades si la UI las necesita para displays,
  // aunque la mejor práctica es que la UI reciba DTOs o ViewModels del caso de uso.
};
