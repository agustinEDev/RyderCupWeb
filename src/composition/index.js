export { default as UserEntity } from '../domain/entities/User';
import ApiUserRepository from '../infrastructure/repositories/ApiUserRepository';
// User Use Cases
import UpdateUserProfileUseCase from '../application/use_cases/user/UpdateUserProfileUseCase';
import UpdateUserSecurityUseCase from '../application/use_cases/user/UpdateUserSecurityUseCase';
import GetUserRolesUseCase from '../application/use_cases/user/GetUserRolesUseCase';
import ApiAuthRepository from '../infrastructure/repositories/ApiAuthRepository';
import LoginUseCase from '../application/use_cases/user/LoginUseCase';
import RegisterUseCase from '../application/use_cases/user/RegisterUseCase';
import VerifyEmailUseCase from '../application/use_cases/user/VerifyEmailUseCase';
import RequestPasswordResetUseCase from '../application/use_cases/user/RequestPasswordResetUseCase';
import ValidateResetTokenUseCase from '../application/use_cases/user/ValidateResetTokenUseCase';
import ResetPasswordUseCase from '../application/use_cases/user/ResetPasswordUseCase';
import GoogleLoginUseCase from '../application/use_cases/user/GoogleLoginUseCase';
import LinkGoogleAccountUseCase from '../application/use_cases/user/LinkGoogleAccountUseCase';
import UnlinkGoogleAccountUseCase from '../application/use_cases/user/UnlinkGoogleAccountUseCase';
import LogoutUseCase from '../application/use_cases/user/LogoutUseCase';
import ResendVerificationEmailUseCase from '../application/use_cases/user/ResendVerificationEmailUseCase';

// Handicap Use Cases
import ApiHandicapRepository from '../infrastructure/repositories/ApiHandicapRepository';
import UpdateManualHandicapUseCase from '../application/use_cases/handicap/UpdateManualHandicapUseCase';
import UpdateRfegHandicapUseCase from '../application/use_cases/handicap/UpdateRfegHandicapUseCase';

// Country Use Cases
import ApiCountryRepository from '../infrastructure/repositories/ApiCountryRepository';
import FetchCountriesUseCase from '../application/use_cases/country/FetchCountriesUseCase';
import GetAdjacentCountriesUseCase from '../application/use_cases/country/GetAdjacentCountriesUseCase';

// Golf Course Use Cases (v2.1.0 - Sprint 1)
import ApiGolfCourseRepository from '../infrastructure/repositories/ApiGolfCourseRepository';
import ListGolfCoursesUseCase from '../application/use_cases/golf_course/ListGolfCoursesUseCase';
import GetGolfCourseUseCase from '../application/use_cases/golf_course/GetGolfCourseUseCase';
import CreateGolfCourseAdminUseCase from '../application/use_cases/golf_course/CreateGolfCourseAdminUseCase';
import CreateGolfCourseRequestUseCase from '../application/use_cases/golf_course/CreateGolfCourseRequestUseCase';
import UpdateGolfCourseUseCase from '../application/use_cases/golf_course/UpdateGolfCourseUseCase';
import ApproveGolfCourseUseCase from '../application/use_cases/golf_course/ApproveGolfCourseUseCase';
import RejectGolfCourseUseCase from '../application/use_cases/golf_course/RejectGolfCourseUseCase';
import ApproveGolfCourseUpdateUseCase from '../application/use_cases/golf_course/ApproveGolfCourseUpdateUseCase';
import RejectGolfCourseUpdateUseCase from '../application/use_cases/golf_course/RejectGolfCourseUpdateUseCase';
import ListPendingGolfCoursesUseCase from '../application/use_cases/golf_course/ListPendingGolfCoursesUseCase';

// Device Management Use Cases (v1.13.0)
import ApiDeviceRepository from '../infrastructure/repositories/ApiDeviceRepository';
import GetActiveDevicesUseCase from '../application/use_cases/device/GetActiveDevicesUseCase';
import RevokeDeviceUseCase from '../application/use_cases/device/RevokeDeviceUseCase';

// Competition Use Cases
import ApiCompetitionRepository from '../infrastructure/repositories/ApiCompetitionRepository';
import CreateCompetitionUseCase from '../application/use_cases/competition/CreateCompetitionUseCase';
import UpdateCompetitionUseCase from '../application/use_cases/competition/UpdateCompetitionUseCase';
import ListUserCompetitionsUseCase from '../application/use_cases/competition/ListUserCompetitionsUseCase';
import GetCompetitionDetailUseCase from '../application/use_cases/competition/GetCompetitionDetailUseCase';
import ActivateCompetitionUseCase from '../application/use_cases/competition/ActivateCompetitionUseCase';
import CloseEnrollmentsUseCase from '../application/use_cases/competition/CloseEnrollmentsUseCase';
import StartCompetitionUseCase from '../application/use_cases/competition/StartCompetitionUseCase';
import CompleteCompetitionUseCase from '../application/use_cases/competition/CompleteCompetitionUseCase';
import CancelCompetitionUseCase from '../application/use_cases/competition/CancelCompetitionUseCase';
import BrowseJoinableCompetitionsUseCase from '../application/use_cases/competition/BrowseJoinableCompetitionsUseCase';
import BrowseExploreCompetitionsUseCase from '../application/use_cases/competition/BrowseExploreCompetitionsUseCase';
import AddGolfCourseToCompetitionUseCase from '../application/use_cases/competition/AddGolfCourseToCompetitionUseCase';
import RemoveGolfCourseFromCompetitionUseCase from '../application/use_cases/competition/RemoveGolfCourseFromCompetitionUseCase';
import ReorderGolfCoursesUseCase from '../application/use_cases/competition/ReorderGolfCoursesUseCase';
import GetCompetitionGolfCoursesUseCase from '../application/use_cases/competition/GetCompetitionGolfCoursesUseCase';

// Schedule Use Cases (v2.1.0 - Sprint 2)
import ApiScheduleRepository from '../infrastructure/repositories/ApiScheduleRepository';
import GetScheduleUseCase from '../application/use_cases/schedule/GetScheduleUseCase';
import ConfigureScheduleUseCase from '../application/use_cases/schedule/ConfigureScheduleUseCase';
import AssignTeamsUseCase from '../application/use_cases/schedule/AssignTeamsUseCase';
import CreateRoundUseCase from '../application/use_cases/schedule/CreateRoundUseCase';
import UpdateRoundUseCase from '../application/use_cases/schedule/UpdateRoundUseCase';
import DeleteRoundUseCase from '../application/use_cases/schedule/DeleteRoundUseCase';
import GenerateMatchesUseCase from '../application/use_cases/schedule/GenerateMatchesUseCase';
import GetMatchDetailUseCase from '../application/use_cases/schedule/GetMatchDetailUseCase';
import UpdateMatchStatusUseCase from '../application/use_cases/schedule/UpdateMatchStatusUseCase';
import DeclareWalkoverUseCase from '../application/use_cases/schedule/DeclareWalkoverUseCase';
import ReassignPlayersUseCase from '../application/use_cases/schedule/ReassignPlayersUseCase';

// Support Use Cases
import ApiSupportRepository from '../infrastructure/repositories/ApiSupportRepository';
import SubmitContactFormUseCase from '../application/use_cases/support/SubmitContactFormUseCase';

// Invitation Use Cases (Sprint 3)
import ApiInvitationRepository from '../infrastructure/repositories/ApiInvitationRepository';
import SendInvitationUseCase from '../application/use_cases/invitation/SendInvitationUseCase';
import SendInvitationByEmailUseCase from '../application/use_cases/invitation/SendInvitationByEmailUseCase';
import ListMyInvitationsUseCase from '../application/use_cases/invitation/ListMyInvitationsUseCase';
import RespondToInvitationUseCase from '../application/use_cases/invitation/RespondToInvitationUseCase';
import ListCompetitionInvitationsUseCase from '../application/use_cases/invitation/ListCompetitionInvitationsUseCase';

// Scoring Use Cases (Sprint 4)
import ApiScoringRepository from '../infrastructure/repositories/ApiScoringRepository';
import GetScoringViewUseCase from '../application/use_cases/scoring/GetScoringViewUseCase';
import SubmitHoleScoreUseCase from '../application/use_cases/scoring/SubmitHoleScoreUseCase';
import SubmitScorecardUseCase from '../application/use_cases/scoring/SubmitScorecardUseCase';
import GetLeaderboardUseCase from '../application/use_cases/scoring/GetLeaderboardUseCase';
import ConcedeMatchUseCase from '../application/use_cases/scoring/ConcedeMatchUseCase';

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
const apiGolfCourseRepository = new ApiGolfCourseRepository();
const apiScheduleRepository = new ApiScheduleRepository();
const apiSupportRepository = new ApiSupportRepository();
const apiCountryRepository = new ApiCountryRepository();
const apiInvitationRepository = new ApiInvitationRepository();

// --- Casos de Uso ---
const updateUserProfileUseCase = new UpdateUserProfileUseCase({ userRepository: apiUserRepository });
const updateUserSecurityUseCase = new UpdateUserSecurityUseCase({ userRepository: apiUserRepository });
const getUserRolesUseCase = new GetUserRolesUseCase({ userRepository: apiUserRepository });
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
const googleLoginUseCase = new GoogleLoginUseCase({ authRepository: apiAuthRepository });
const linkGoogleAccountUseCase = new LinkGoogleAccountUseCase({ authRepository: apiAuthRepository });
const unlinkGoogleAccountUseCase = new UnlinkGoogleAccountUseCase({ authRepository: apiAuthRepository });
const logoutUseCase = new LogoutUseCase({ authRepository: apiAuthRepository });
const resendVerificationEmailUseCase = new ResendVerificationEmailUseCase({ authRepository: apiAuthRepository });
const createCompetitionUseCase = new CreateCompetitionUseCase({ competitionRepository: apiCompetitionRepository });
const updateCompetitionUseCase = new UpdateCompetitionUseCase({ competitionRepository: apiCompetitionRepository });
const listUserCompetitionsUseCase = new ListUserCompetitionsUseCase({ competitionRepository: apiCompetitionRepository });
const getCompetitionDetailUseCase = new GetCompetitionDetailUseCase({ competitionRepository: apiCompetitionRepository });
const activateCompetitionUseCase = new ActivateCompetitionUseCase({ competitionRepository: apiCompetitionRepository });
const closeEnrollmentsUseCase = new CloseEnrollmentsUseCase({ competitionRepository: apiCompetitionRepository });
const startCompetitionUseCase = new StartCompetitionUseCase({ competitionRepository: apiCompetitionRepository });
const completeCompetitionUseCase = new CompleteCompetitionUseCase({ competitionRepository: apiCompetitionRepository });
const cancelCompetitionUseCase = new CancelCompetitionUseCase({ competitionRepository: apiCompetitionRepository });
const browseJoinableCompetitionsUseCase = new BrowseJoinableCompetitionsUseCase(apiCompetitionRepository);
const browseExploreCompetitionsUseCase = new BrowseExploreCompetitionsUseCase(apiCompetitionRepository);
const addGolfCourseToCompetitionUseCase = new AddGolfCourseToCompetitionUseCase({ competitionRepository: apiCompetitionRepository });
const removeGolfCourseFromCompetitionUseCase = new RemoveGolfCourseFromCompetitionUseCase({ competitionRepository: apiCompetitionRepository });
const reorderGolfCoursesUseCase = new ReorderGolfCoursesUseCase({ competitionRepository: apiCompetitionRepository });
const getCompetitionGolfCoursesUseCase = new GetCompetitionGolfCoursesUseCase({ competitionRepository: apiCompetitionRepository });
const fetchCountriesUseCase = new FetchCountriesUseCase({ countryRepository: apiCountryRepository });
const getAdjacentCountriesUseCase = new GetAdjacentCountriesUseCase({ countryRepository: apiCountryRepository });

// Schedule Use Cases (v2.1.0 - Sprint 2)
const getScheduleUseCase = new GetScheduleUseCase({ scheduleRepository: apiScheduleRepository });
const configureScheduleUseCase = new ConfigureScheduleUseCase({ scheduleRepository: apiScheduleRepository });
const assignTeamsUseCase = new AssignTeamsUseCase({ scheduleRepository: apiScheduleRepository });
const createRoundUseCase = new CreateRoundUseCase({ scheduleRepository: apiScheduleRepository });
const updateRoundUseCase = new UpdateRoundUseCase({ scheduleRepository: apiScheduleRepository });
const deleteRoundUseCase = new DeleteRoundUseCase({ scheduleRepository: apiScheduleRepository });
const generateMatchesUseCase = new GenerateMatchesUseCase({ scheduleRepository: apiScheduleRepository });
const getMatchDetailUseCase = new GetMatchDetailUseCase({ scheduleRepository: apiScheduleRepository });
const updateMatchStatusUseCase = new UpdateMatchStatusUseCase({ scheduleRepository: apiScheduleRepository });
const declareWalkoverUseCase = new DeclareWalkoverUseCase({ scheduleRepository: apiScheduleRepository });
const reassignPlayersUseCase = new ReassignPlayersUseCase({ scheduleRepository: apiScheduleRepository });

// Support Use Cases
const submitContactFormUseCase = new SubmitContactFormUseCase({ supportRepository: apiSupportRepository });

// Invitation Use Cases (Sprint 3)
const sendInvitationUseCase = new SendInvitationUseCase({ invitationRepository: apiInvitationRepository });
const sendInvitationByEmailUseCase = new SendInvitationByEmailUseCase({ invitationRepository: apiInvitationRepository });
const listMyInvitationsUseCase = new ListMyInvitationsUseCase({ invitationRepository: apiInvitationRepository });
const respondToInvitationUseCase = new RespondToInvitationUseCase({ invitationRepository: apiInvitationRepository });
const listCompetitionInvitationsUseCase = new ListCompetitionInvitationsUseCase({ invitationRepository: apiInvitationRepository });

// Scoring Use Cases (Sprint 4)
const apiScoringRepository = new ApiScoringRepository();
const getScoringViewUseCase = new GetScoringViewUseCase({ scoringRepository: apiScoringRepository });
const submitHoleScoreUseCase = new SubmitHoleScoreUseCase({ scoringRepository: apiScoringRepository });
const submitScorecardUseCase = new SubmitScorecardUseCase({ scoringRepository: apiScoringRepository });
const getLeaderboardUseCase = new GetLeaderboardUseCase({ scoringRepository: apiScoringRepository });
const concedeMatchUseCase = new ConcedeMatchUseCase({ scoringRepository: apiScoringRepository });

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

// Golf Course Use Cases (v2.1.0 - Sprint 1)
const listGolfCoursesUseCase = new ListGolfCoursesUseCase({ golfCourseRepository: apiGolfCourseRepository });
const getGolfCourseUseCase = new GetGolfCourseUseCase({ golfCourseRepository: apiGolfCourseRepository });
const createGolfCourseAdminUseCase = new CreateGolfCourseAdminUseCase({ golfCourseRepository: apiGolfCourseRepository });
const createGolfCourseRequestUseCase = new CreateGolfCourseRequestUseCase({ golfCourseRepository: apiGolfCourseRepository });
const updateGolfCourseUseCase = new UpdateGolfCourseUseCase({ golfCourseRepository: apiGolfCourseRepository });
const approveGolfCourseUseCase = new ApproveGolfCourseUseCase({ golfCourseRepository: apiGolfCourseRepository });
const rejectGolfCourseUseCase = new RejectGolfCourseUseCase({ golfCourseRepository: apiGolfCourseRepository });
const approveGolfCourseUpdateUseCase = new ApproveGolfCourseUpdateUseCase({ golfCourseRepository: apiGolfCourseRepository });
const rejectGolfCourseUpdateUseCase = new RejectGolfCourseUpdateUseCase({ golfCourseRepository: apiGolfCourseRepository });
const listPendingGolfCoursesUseCase = new ListPendingGolfCoursesUseCase({ golfCourseRepository: apiGolfCourseRepository });

// Exportar los casos de uso y otros servicios que la capa de presentación necesite
export {
  updateUserProfileUseCase,
  updateUserSecurityUseCase,
  getUserRolesUseCase,
  updateManualHandicapUseCase,
  updateRfegHandicapUseCase,
  loginUseCase,
  registerUseCase,
  verifyEmailUseCase,
  requestPasswordResetUseCase,
  validateResetTokenUseCase,
  resetPasswordUseCase,
  googleLoginUseCase,
  linkGoogleAccountUseCase,
  unlinkGoogleAccountUseCase,
  logoutUseCase,
  resendVerificationEmailUseCase,
  createCompetitionUseCase,
  updateCompetitionUseCase,
  listUserCompetitionsUseCase,
  getCompetitionDetailUseCase,
  activateCompetitionUseCase,
  closeEnrollmentsUseCase,
  startCompetitionUseCase,
  completeCompetitionUseCase,
  cancelCompetitionUseCase,
  browseJoinableCompetitionsUseCase,
  browseExploreCompetitionsUseCase,
  addGolfCourseToCompetitionUseCase,
  removeGolfCourseFromCompetitionUseCase,
  reorderGolfCoursesUseCase,
  getCompetitionGolfCoursesUseCase,
  // Country Use Cases
  fetchCountriesUseCase,
  getAdjacentCountriesUseCase,
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
  // Golf Course Use Cases (v2.1.0 - Sprint 1)
  listGolfCoursesUseCase,
  getGolfCourseUseCase,
  createGolfCourseAdminUseCase,
  createGolfCourseRequestUseCase,
  updateGolfCourseUseCase,
  approveGolfCourseUseCase,
  rejectGolfCourseUseCase,
  approveGolfCourseUpdateUseCase,
  rejectGolfCourseUpdateUseCase,
  listPendingGolfCoursesUseCase,
  // Support Use Cases
  submitContactFormUseCase,
  // Schedule Use Cases (v2.1.0 - Sprint 2)
  getScheduleUseCase,
  configureScheduleUseCase,
  assignTeamsUseCase,
  createRoundUseCase,
  updateRoundUseCase,
  deleteRoundUseCase,
  generateMatchesUseCase,
  getMatchDetailUseCase,
  updateMatchStatusUseCase,
  declareWalkoverUseCase,
  reassignPlayersUseCase,
  // Invitation Use Cases (Sprint 3)
  sendInvitationUseCase,
  sendInvitationByEmailUseCase,
  listMyInvitationsUseCase,
  respondToInvitationUseCase,
  listCompetitionInvitationsUseCase,
  // Scoring Use Cases (Sprint 4)
  getScoringViewUseCase,
  submitHoleScoreUseCase,
  submitScorecardUseCase,
  getLeaderboardUseCase,
  concedeMatchUseCase,
};
