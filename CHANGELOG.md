# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased] - Sprint 4: Live Scoring System

### Real-Time Scoring System

Allows players to record hole-by-hole scores with cross-validation (player vs marker), view complete scorecard and competition leaderboard. Includes offline support, multi-device session locking and early match finish detection.

### ✨ Added

#### Backend API Contract
- **`docs/SCORING_API_CONTRACT.md`**: Complete contract with 5 endpoints, request/response shapes in snake_case, error codes and business rules (cross marking, dual validation, early finish, concede, Ryder Cup points)

#### Domain Layer
- **`HoleScore`** value object: Range 1-9 + null (ball picked up), validation in constructor with factory method `create()`
- **`IScoringRepository`** interface: 5 methods (getScoringView, submitHoleScore, submitScorecard, getLeaderboard, concedeMatch)

#### Infrastructure Layer
- **`ScoringMapper`**: Anti-corruption layer snake_case API → camelCase DTOs. 3 methods: `toScoringViewDTO()`, `toLeaderboardDTO()`, `toMatchSummaryDTO()`. Try-catch for unknown fields, null-safe timestamps
- **`ApiScoringRepository`**: REST implementation of 5 endpoints using `apiRequest()`

#### Application Layer
- **5 use cases**: `GetScoringViewUseCase`, `SubmitHoleScoreUseCase` (validates with HoleScore VO), `SubmitScorecardUseCase`, `GetLeaderboardUseCase`, `ConcedeMatchUseCase`
- **Composition Root**: `ApiScoringRepository` + 5 use cases injected via DI

#### i18n
- Namespace `scoring` registered in config. Complete EN/ES translations (tabs, input, scorecard, leaderboard, modals, errors, validation)

#### UI Components (14 new in `src/components/scoring/`)
- **`HoleInput`**: [-][+] buttons for own and marked score, range 1-9 + dash, par/SI/net/result/standing
- **`HoleSelector`**: 1-18 grid with per-hole status indicators (completed, pending, mismatch)
- **`ScorecardTable`**: OUT (1-9) + IN (10-18) + Total table, all match players, subtotals
- **`GolfFigure`**: Classic concentric SVG: double-circle eagle, circle birdie, number par, square bogey, double-square double+
- **`ValidationIcon`**: Validation icon only (match/mismatch/pending)
- **`LeaderboardView`**: Ryder Cup points, large head-to-head numbers, "In Progress" / "Completed" sections. Reusable for Sprint 5 (public)
- **`TeamStandingsHeader`**: Large head-to-head team points numbers
- **`PreMatchInfo`**: Pre-match screen "You mark X, Y marks you" + match format
- **`MatchSummaryCard`**: Final result + basic stats post-submit
- **`EarlyEndModal`**: Early finish confirmation (match decided before 18 holes). Wrapper+Content pattern
- **`ConcedeMatchModal`**: Concede confirmation with optional reason. Wrapper+Content pattern
- **`SubmitScorecardModal`**: Scorecard submission confirmation (validated holes / total)
- **`OfflineBanner`**: "No connection" banner with pending queue counter
- **`SessionBlockedModal`**: "Active session on another device" with option to take control

#### Hooks and Utilities
- **`useScoring`** hook: Central scoring state, polling every 10s, auto-save, offline queue, session locking
- **`scoringOfflineQueue`**: localStorage queue (enqueue, dequeue, getByMatch, remove, size, clear)
- **`scoringSessionLock`**: BroadcastChannel lock (acquire, release, refresh, onLockEvent). Pattern reused from `broadcastAuth.js`

#### Pages
- **`ScoringPage`** (`/player/matches/:matchId/scoring`): 3 tabs (Input, Scorecard, Leaderboard), useScoring hook, modals, read-only for spectators
- **`LeaderboardPage`** (`/competitions/:id/leaderboard`): Public page, reuses LeaderboardView, polling 30s

#### Navigation and Integration
- **`App.jsx`**: 2 lazy-loaded routes (protected ScoringPage, public LeaderboardPage)
- **`MatchCard.jsx`**: "Score" button for IN_PROGRESS matches → `/player/matches/{id}/scoring`
- **`SchedulePage.jsx`**: `handleScoreMatch` handler passed to RoundCard → MatchCard
- **`CompetitionDetail.jsx`**: "Leaderboard" button → `/competitions/{id}/leaderboard`

### ✅ Tests
- **236 new tests** (1485 total passing, 1 skipped)
- Domain: 12 tests (HoleScore VO)
- Infrastructure: 28 tests (ScoringMapper 15, ApiScoringRepository 13)
- Application: 40 tests (5 use cases × ~8 tests)
- Hooks + Utils: 40 tests (useScoring 20, offlineQueue 12, sessionLock 8)
- Components: 93 tests (14 components)
- Pages: 23 tests (ScoringPage 15, LeaderboardPage 8)

### 📊 Stats
- **Files created:** 58
- **Files modified:** 9
- **Bundle:** 366.66 KB initial (within 1500 KB max budget)
- **Backend not implemented yet** — frontend will show 404s for API calls (expected)

---

## [Unreleased] - Sprint 3: Invitations System

### Invitations System

Allows creators to invite players by email and players to accept or decline invitations. Accepting creates automatic enrollment (bypassing approval).

### ✨ Added
- **Backend API Contract:** `docs/INVITATIONS_API_CONTRACT.md` with 5 endpoints, request/response shapes, error codes and business rules
- **Domain Layer:** `InvitationStatus` value object (state machine: PENDING → ACCEPTED/DECLINED/EXPIRED), `Invitation` entity (immutable, factory methods, accept/decline commands), `IInvitationRepository` interface (5 methods)
- **Infrastructure Layer:** `InvitationMapper` (snake_case API → domain), `ApiInvitationRepository` (5 REST endpoints with `_apiData` pattern)
- **Application Layer:** `InvitationAssembler` (entity → DTO with computed fields), 5 use cases (`SendInvitation`, `SendInvitationByEmail`, `ListMyInvitations`, `RespondToInvitation`, `ListCompetitionInvitations`)
- **Composition Root:** `ApiInvitationRepository` + 5 use cases injected via DI
- **i18n:** Namespace `invitations` registered in config. Complete EN/ES translations (status, actions, filters, errors, success messages)
- **`InvitationBadge`**: Status badge with colors (PENDING=yellow, ACCEPTED=green, DECLINED=red, EXPIRED=gray)
- **`InvitationCard`**: Dual mode card (player: accept/decline with expiration countdown, creator: read-only with invitee info)
- **`SendInvitationModal`**: Wrapper+Content pattern. Email input with HTML5 validation, personal message textarea (max 500 chars with counter)
- **Creator InvitationsPage** (`/creator/competitions/:id/invitations`): List of sent invitations, filter by status, send by email, per-competition auth via `useUserRoles`
- **Player MyInvitationsPage** (`/player/invitations`): List of received invitations, accept/decline, pending badge, links to accepted competitions
- **Navigation:** "Invitations" button in CompetitionDetail (creators, bg-purple-600), "My Invitations" link in HeaderAuth (desktop + mobile)

### ✅ Tests
- **95 new tests** (1249 total passing, 1 skipped)
- Domain: 40 tests (InvitationStatus 23, Invitation 17)
- Infrastructure: 6 tests (ApiInvitationRepository)
- Application: 18 tests (5 use cases × ~3-4 tests)
- Components: 21 tests (InvitationBadge 4, InvitationCard 9, SendInvitationModal 8)
- Pages: 10 tests (InvitationsPage 5, MyInvitationsPage 5)

### 📊 Stats
- **Files created:** 32
- **Files modified:** 9
- **Bundle:** within budget (1400 KB max)

---

## [2.0.10] - 2026-02-17

### Manual Pairings UI for Match Generation

Allows competition creators to choose between automatic generation and manual pairing of players when creating matches.

### ✨ Added
- **`GenerateMatchesModal`**: New component with Wrapper+Content pattern. Automatic/manual mode with radio toggle, dynamic match list with add/remove, player dropdowns filtered by team
- **SINGLES**: 1 dropdown per team. **FOURBALL/FOURSOMES**: 2 dropdowns per team
- **Validations**: At least 1 match, all slots complete, no duplicate players
- **Visual summary**: Match counter and assigned players out of total available
- **i18n**: 13 new translation keys `matches.pairings.*` in EN and ES

### 🐛 Fixed
- **`reloadSchedule()` silent error**: Now shows error toast to user instead of swallowing error in catch. Root cause of "won't let me generate matches" bug (stale data with status `PENDING_TEAMS`)
- **`updateMatchPlayer` splice bug**: `splice(slotIndex, 1)` shortened and shifted array when clearing selection. Changed to direct assignment `updated[slotIndex] = ''` to preserve positions

### 🔧 Changed
- **`ApiScheduleRepository.generateMatches()`**: camelCase → snake_case transformation of `manualPairings` payload moved to infrastructure layer (was in SchedulePage — Clean Architecture violation)
- **`SchedulePage.jsx`**: "Generate Matches" now opens modal instead of calling API directly. Passes payload in camelCase to use case

### ✅ Tests
- **24 new tests** (1154 total passing, 1 skipped)
- `GenerateMatchesModal.test.jsx`: 22 tests (render, modes, validation, player selection, SINGLES/FOURBALL/FOURSOMES formats, duplicates)
- `GenerateMatchesUseCase.test.js`: +1 test for manual payload
- `ApiScheduleRepository.test.js`: +1 test for snake_case transformation

### 📚 References
- PR #144: `feature/manual-pairings-ui` → develop
- PR #145: `release/v2.0.10` → main

---

## [2.0.9] - 2026-02-17

### Clean Architecture Remediation

Remediation of ~57 Clean Architecture violations across 66 files (+810/-890 lines).

### ✨ Added
- **`CompetitionAssembler`** and **`EnrollmentAssembler`**: Extracted from infrastructure mappers to application layer (13 use cases updated)
- **`LogoutUseCase`**, **`ResendVerificationEmailUseCase`**, **`GetAdjacentCountriesUseCase`**: New use cases to eliminate direct fetch() in UI
- **`ICountryRepository`** + **`ApiCountryRepository`**: New repository for countries
- **CI audit outputs**: Moderate/total counters exposed in pipeline summary

### 🐛 Fixed
- **Removed creator.email PII** from public DTOs
- **Null-safe EnrollmentAssembler**: Safe handling of enrollments without data
- **Stale closure** in CreateCompetition: Values passed as parameters instead of closing over state
- **AbortController** in Register: Cleanup of pending requests on unmount

### 🔧 Changed
- **5 competition state transitions** (activate, start, close, complete, cancel) routed through `ICompetitionRepository` instead of direct `apiRequest`
- **`RequestPasswordResetUseCase`** → Email VO, **`ResetPasswordUseCase`** → Password VO (min 12 chars)
- **`FetchCountriesUseCase`** → `ICountryRepository` + `ApiCountryRepository`
- **Eliminated all direct fetch() in UI**: Profile, Register, Competitions, CreateCompetition, HeaderAuth, EmailVerificationBanner, useLogout

### 📚 References
- PR #142: `refactor/clean-architecture-violations` → develop
- PR #143: `release/v2.0.9` → main

---

## [2.0.6] - 2026-02-08

### Sprint 2: Schedule & Matches - Backend Integration Layer

Complete integration layer with backend's 11 Sprint 2 endpoints for rounds, matches and teams management. Includes breaking change from `handicap_type` to `play_mode`.

### ⚠️ Breaking Changes
- **`play_mode` replaces `handicap_type`/`handicap_percentage`**: Backend now uses a single `play_mode` field (SCRATCH/HANDICAP) instead of `handicap_type` (SCRATCH/PERCENTAGE) + `handicap_percentage` (90/95/100). Percentage is now managed at round level (`allowance_percentage`), not competition.
  - `HandicapSettings` value object: Renamed enum `HandicapType` to `PlayModeType` with values `SCRATCH`/`HANDICAP` (was `SCRATCH`/`PERCENTAGE`). Removed `percentage` field.
  - `CompetitionMapper`: Maps `play_mode` instead of `handicap_type`/`handicap_percentage` (with backward-compatible fallback)
  - `CreateCompetition.jsx`: Updated form with SCRATCH/HANDICAP selector (removed percentage selector)
  - `CompetitionDetail.jsx`: Updated display for `playMode`
  - EN/ES translations: Keys `handicapType`/`handicapPercentage` replaced by `playMode`

### ✨ Added

#### Domain Layer - Value Objects (6 new)
- **`SessionType`**: Enum MORNING/AFTERNOON/EVENING with frozen instances
- **`MatchFormat`**: Enum SINGLES/FOURBALL/FOURSOMES with `playersPerTeam()` (1 or 2)
- **`HandicapMode`**: Enum STROKE_PLAY/MATCH_PLAY
- **`RoundStatus`**: State machine PENDING_TEAMS → PENDING_MATCHES → SCHEDULED → IN_PROGRESS → COMPLETED with `canTransitionTo()`, `isEditable()`
- **`MatchStatus`**: State machine SCHEDULED → IN_PROGRESS → COMPLETED, WALKOVER with `canTransitionTo()`, `isPlayable()`, `isFinal()`
- **`AllowancePercentage`**: Nullable value 50-100 in increments of 5, with `isCustom()`

#### Domain Layer - Entities (3 new)
- **`Round`**: Private fields, `isEditable()`, `hasMatches()`, `matchCount()`, defensive copy of matches
- **`Match`**: Private fields, state methods (`isScheduled()`, `canStart()`, `canComplete()`), defensive copy of players
- **`TeamAssignmentResult`**: `isManual()`, `isAutomatic()`, `getTeamSize()`

#### Domain Layer - Repository Interface
- **`IScheduleRepository`**: Interface with 11 methods mapped to backend endpoints

#### Infrastructure Layer
- **`ScheduleMapper`**: Anti-corruption layer with `toScheduleDTO()`, `toRoundDTO()`, `toMatchDTO()`, `toTeamAssignmentDTO()`. Handles flat player fields (team_a_player_1_id, etc.)
- **`ApiScheduleRepository`**: REST implementation of 11 endpoints using `apiRequest()`

#### Application Layer - Use Cases (11 new)
- **`GetScheduleUseCase`**: GET /competitions/{id}/schedule
- **`ConfigureScheduleUseCase`**: POST /competitions/{id}/schedule/configure
- **`AssignTeamsUseCase`**: POST /competitions/{id}/teams
- **`CreateRoundUseCase`**: POST /competitions/{id}/rounds (with required field validation)
- **`UpdateRoundUseCase`**: PUT /rounds/{id}
- **`DeleteRoundUseCase`**: DELETE /rounds/{id}
- **`GenerateMatchesUseCase`**: POST /rounds/{id}/matches/generate
- **`GetMatchDetailUseCase`**: GET /matches/{id}
- **`UpdateMatchStatusUseCase`**: PUT /matches/{id}/status
- **`DeclareWalkoverUseCase`**: POST /matches/{id}/walkover (with team A/B and reason validation)
- **`ReassignPlayersUseCase`**: PUT /matches/{id}/players (with non-empty array validation)

#### Composition Root
- Registered `ApiScheduleRepository` + 11 use cases in DI container (`src/composition/index.js`)

#### Internationalization
- New namespace `schedule` registered in `i18n/config.js`
- **EN**: `src/i18n/locales/en/schedule.json` - Complete translations (rounds, matches, teams, status, formats, sessions, errors, success)
- **ES**: `src/i18n/locales/es/schedule.json` - Complete Spanish translations

### 🔧 Changed
- **`HandicapSettings.js`**: `PlayModeType` (SCRATCH/HANDICAP) replaces `HandicapType` (SCRATCH/PERCENTAGE). Backward-compatible alias `HandicapType = PlayModeType`
- **`CompetitionMapper.js`**: `toDomain()` reads `play_mode` (fallback to `handicap_type`), `toDTO()` writes `play_mode`, `toSimpleDTO()` writes `playMode`
- **`CreateCompetition.jsx`**: `formData.playMode` replaces `handicapType`/`handicapPercentage`. Payload sends `play_mode`
- **`CompetitionDetail.jsx`**: Shows `playMode` instead of `handicapType`/`handicapPercentage`
- **`competitions.json` (EN/ES)**: Keys `handicapType`/`handicapPercentage` → `playMode`/`handicap`
- **`UpdateCompetitionUseCase.js`**: JSDoc updated for `play_mode`
- **`CreateCompetitionUseCase.test.js`**: Fixture updated `handicap_type` → `play_mode`

### ✅ Tests
- **~238 new tests**: 1087 tests passing, 1 skipped (from 849; backend: 95 + 47 + 8 + 13 + 50 ≈ 213, UI + fixes: ~25)
- 6 test files for Value Objects (~95 tests)
- 3 test files for Entities (~47 tests)
- 1 test file for ScheduleMapper (~8 tests)
- 1 test file for ApiScheduleRepository (~13 tests)
- 11 test files for Use Cases (~50 tests)
- Updated tests: HandicapSettings, Competition entity, CreateCompetitionUseCase

### 📦 Bundle & Performance
- **Bundle size reduced ~311 KB from peak** (1619 KB peak → 1308 KB current, uncompressed build):
  - Replaced `country-flag-icons` library (239 KB of embedded SVGs) with CDN images from [flagcdn.com](https://flagcdn.com)
  - `CountryFlag` now renders `<img>` with `srcSet` for retina instead of SVG components
  - Removed unused `axios` dependency
- **CI bundle budget**: 1400 KB max, 1300 KB warning (after removing 239 KB of SVGs)
- **`useMemo` in `SchedulePage`**: `playerNameMap` wrapped in `useMemo` to avoid unnecessary rebuilds

### 🌐 i18n Fixes
- **Fixed ~30 hardcoded toast messages** causing language mixing (Spanish/English):
  - `useEditProfile.jsx`: 21 hardcoded messages → i18n keys (`toasts.*` in namespace `profile`)
  - `useInactivityLogout.jsx`: 5 hardcoded Spanish messages → i18n keys (`inactivity.*` in namespace `auth`)
  - `deviceRevocationLogout.js`: Manual language detection (localStorage/navigator) → `i18next.t()` with namespace `auth`
  - `useDeviceManagement.js`: 2 hardcoded messages → i18n keys (namespace `devices`)
  - `CreateCompetition.jsx`: Removed redundant `|| 'text'` fallbacks in 2 toasts
- **Legacy plural key migration**: `_plural` → `_one`/`_other` (i18next v4 format) in `schedule` and `competitions` namespaces
- **New EN/ES translations**:
  - `profile.json`: 18 keys in `toasts` section
  - `auth.json`: `errors.sessionExpired`, `errors.sessionEnded`, `inactivity` section (5 keys)
  - `devices.json`: `errors.DEVICE_ID_REQUIRED`, `success.deviceRevoked`

### 📊 Statistics
- **Files created:** ~30
- **Files modified:** ~37
- **Value Objects:** 6 new
- **Entities:** 3 new
- **Use Cases:** 11 new
- **Repository:** 1 interface + 1 implementation + 1 mapper
- **Tests:** ~238 new (1087 passing, 1 skipped, from 849)
- **Translations:** 2 new files + 10 updated files (EN/ES)
- **Bundle:** 1308 KB uncompressed build (-311 KB from peak of 1619 KB)

---

## [2.0.5] - 2026-02-05

### 🐛 Hotfix: Golf Courses UI & Admin Fixes

UI and accessibility fixes for golf course management.

### ✨ Added
- **Translations**: Added "tees" key to `competitions` namespace (EN/ES)
- **Error Reporting**: Sentry integration in `LazyLoadErrorBoundary`
  - Reports errors with user agent, platform and component stack
  - Expandable "Technical details" section for production debugging

### 🐛 Fixed
- **Golf Courses UI**: Responsive layout for courses in competition detail
  - Separate mobile (stacked) and desktop (horizontal) layouts
  - Tee badges, par and course type now visible
- **Admin Edit Button**: Fixed `isAdmin` verification
  - Now checks `user.is_admin` (backend format) in addition to `user.roles`
  - Edit button now visible for administrators in `/admin/golf-courses`

### 📚 References
- PR #120: `hotfix/golf-courses-responsive-ui`

---

## [2.0.4] - 2026-02-04

### 🎯 Sprint 2: Security Enhancements + Infrastructure Migration

Security improvements for OWASP A07:2021 (Authentication Failures) and infrastructure migration to subdomains.

### ✨ Added

#### Security (OWASP A07:2021 Compliance)
- **Proactive Token Refresh**: New `useProactiveTokenRefresh` hook that refreshes tokens before expiring
  - Monitors user activity (keydown, mousemove, click, scroll, touch)
  - Refreshes token ~1 minute before expiring if user is active
  - Prevents "session expired" while user is using the app
  - Maintains 5-minute TTL (OWASP compliant)
- **Separated Session Handling**: Clear separation of revocation vs expiration
  - `isDeviceRevoked()`: Only returns true for EXPLICIT device revocation
  - `isSessionExpired()`: Handles refresh token expiration (separate from revocation)
  - `handleDeviceRevocationLogout()`: Message with 🔒 icon for revocation
  - `handleSessionExpiredLogout()`: Message with ⏱️ icon for expiration
  - Better UX: users understand why they were logged out

#### Infrastructure
- **ADR-011**: Subdomain architecture documentation with Cloudflare Proxy
  - Frontend: `www.rydercupfriends.com`
  - Backend API: `api.rydercupfriends.com`
  - Cookie domain: `.rydercupfriends.com` (cross-subdomain)

#### Features
- **Tee Categories**: Added `CHAMPIONSHIP_FEMALE` category to golf course form
  - Updated `TEE_CATEGORIES` array in `GolfCourseForm.jsx`
  - Added ES/EN translations in `golfCourses` namespace
- **Competition Edit**: Complete competition editing functionality
- **Golf Course Management**: Improvements in golf course management within competitions

### 🔧 Changed
- **vite.config.js**: Updated CSP to include `api.rydercupfriends.com` in `connect-src`
- **.env.example**: Updated documentation for API subdomain migration
- **Proxy Middleware**: Updated to `http-proxy-middleware` v3.0.3 for cookie rewrite support
- **i18n Keys**: Standardization of translation keys to `kebab-case` convention
- **tokenRefreshInterceptor.js**: Now correctly differentiates between revocation and expiration

### 🗑️ Removed
- Reverse proxy service (saves $7/month)
- Hardcoded backend URL in security headers

### 🐛 Fixed
- **Competitions**: Added defensive programming and improvements in date validation
- **Date Validation**: Improvements in invalid date handling
- **Session Messages**: Users no longer see "device revoked" when their session simply expired

### 🚀 Performance
- Latency: -50-100ms (eliminated proxy hop)
- Cost: -$7/month (33% reduction)
- Reliability: Eliminated single point of failure

### 🔐 Security
- OWASP Score: 9.2/10 maintained
- DDoS protection via Cloudflare
- Real IPs via `CF-Connecting-IP` header (fixes device fingerprinting accuracy)
- Proactive token refresh prevents orphaned sessions

### ✅ Tests
- 849 tests passing (100% pass rate)
- New tests for `useProactiveTokenRefresh`
- Updated tests for revocation/expiration separation

### 📚 References
- PR #114: `hotfix/proxy-cookie-domain` - Cookie domain rewrite
- PR #115: `hotfix/proxy-middleware-version` - Upgrade http-proxy-middleware v3.0.3
- PR #116: `hotfix/migrate-to-api-subdomain` - Full subdomain migration
- PR #117: `feature/sprint-2-security-fixes` - Security enhancements

---

## [2.0.0] - 2026-01-31

### 🎯 Sprint 1: Golf Course Management System

Complete golf course management system with Clean Architecture + DDD architecture.

### ✨ Added

#### Domain Layer
- **Value Objects**:
  - `Tee`: Represents tee position with WHS (World Handicap System) validations
    - Categories: CHAMPIONSHIP_MALE/FEMALE, AMATEUR_MALE/FEMALE, SENIOR_MALE/FEMALE, JUNIOR
    - Course Rating: 50.0-90.0
    - Slope Rating: 55-155
    - Gender: MALE/FEMALE
  - `Hole`: Represents golf hole with validations
    - Hole Number: 1-18
    - Par: 3-5
    - Stroke Index: 1-18 (unique)
- **Entities**:
  - `GolfCourse`: Main entity with business methods
    - isClone(), hasPendingUpdate(), isApproved(), isPending(), isRejected()
    - getStatusColor() for UI
    - Support for clone workflow (update proposals)
- **Repository Interfaces**:
  - `IGolfCourseRepository`: Contract with 9 methods (list, getById, create, createAsAdmin, update, approve, reject, approveUpdate, rejectUpdate, listPending)

#### Infrastructure Layer
- **Repositories**:
  - `ApiGolfCourseRepository`: Complete implementation with 10 backend endpoints
    - Domain ↔ API mapping (snake_case/camelCase)
    - Helper `_mapToApiPayload()` for conversion
    - Error handling with context

#### Application Layer (8 Use Cases)
- `ListGolfCoursesUseCase`: List courses with filters (country, status, type)
- `GetGolfCourseUseCase`: Get course by ID
- `CreateGolfCourseAdminUseCase`: Admin creates course directly APPROVED
- `UpdateGolfCourseUseCase`: Smart workflow (admin in-place, creator creates clone)
- `ApproveGolfCourseUseCase`: Approve new request
- `RejectGolfCourseUseCase`: Reject with reason (10-500 chars)
- `ApproveGolfCourseUpdateUseCase`: Approve clone → merge to original
- `RejectGolfCourseUpdateUseCase`: Reject clone → delete

#### Presentation Layer
- **Components**:
  - `GolfCourseForm`: Complex form (400+ lines)
    - 18 holes with par + stroke index
    - 2-6 tees with course/slope rating
    - Country dropdown with flags and translated names
    - Real-time validations (total par 66-76, unique stroke indices)
    - Modes: create/edit with initialData
  - `GolfCourseTable`: Reusable table with role-based actions
    - Columns: name, country, type, par, tees, status, actions
    - Status badges with colors
    - Pending updates indicators
  - `TeeCategoryBadge`: Visual badges for 6 tee categories
- **Admin Pages**:
  - `/admin/golf-courses`: CRUD for approved courses
    - Lists all APPROVED courses
    - Admin creates directly APPROVED
    - Admin edits in-place (no clones)
    - Create/edit modal with GolfCourseForm
  - `/admin/golf-courses/pending`: Approval management
    - Tab "New Requests": New requests (originalGolfCourseId === null)
    - Tab "Update Proposals": Update proposals (clones)
    - Approve/Reject with reason modal
    - Stats: counters by type

#### Navigation & Auth
- Admin links in HeaderAuth (desktop + mobile)
  - Only visible for users with `is_admin=true`
  - "Golf Courses" → `/admin/golf-courses`
  - "Pending Courses" → `/admin/golf-courses/pending`

#### Internationalization
- **Namespace**: `golfCourses` (300+ ES/EN translations)
- **Sections**:
  - `form`: Fields, validations, errors, buttons
  - `table`: Columns, actions, states
  - `pages.admin`: Titles, messages, toasts
  - `pages.pending`: Tabs, confirmations, modals
- **Common**: Added `header.golfCourses` and `header.pendingCourses`

#### Routing & Composition
- Protected routes with `<ProtectedRoute>`:
  - `/admin/golf-courses`
  - `/admin/golf-courses/pending`
- Lazy loading with React.lazy()
- Dependency injection in `composition/index.js`:
  - `apiGolfCourseRepository`
  - 8 exported use cases

###  ✅ Tests (116 tests - 100% passing)

#### Domain Layer (77 tests)
- `Tee.test.js`: 20 tests
  - Range validations (courseRating 50-90, slopeRating 55-155)
  - 6 valid categories
  - Gender validation (MALE/FEMALE)
  - DTO conversions (camelCase ↔ snake_case)
  - Edge cases (whitespace trim, decimals)
- `Hole.test.js`: 24 tests
  - Validations (holeNumber 1-18, par 3-5, strokeIndex 1-18)
  - Complete 18-hole simulation with par 72
  - Edge cases (typical par 3/5 holes)
- `GolfCourse.test.js`: 33 tests
  - Constructor with all fields
  - Business methods (isClone, hasPendingUpdate, isApproved, isPending, isRejected)
  - getStatusColor() with 4 states
  - toDTO() with complete conversion
  - Complete workflows (new request, update proposal, rejection)

#### Application Layer (39 tests)
- `ListGolfCoursesUseCase.test.js`: 9 tests (multiple filters)
- `GetGolfCourseUseCase.test.js`: 7 tests (error handling, not found)
- `CreateGolfCourseAdminUseCase.test.js`: 8 tests
  - TotalPar validations (66-76)
  - Tees range (2-6)
  - Course types (STANDARD_18, EXECUTIVE, PITCH_AND_PUTT)
- `ApproveRejectGolfCourse.test.js`: 15 tests
  - 4 use cases: approve/reject new + approve/reject update
  - Rejection reason validation (10-500 chars)
  - Clone ID validations

### 🏗️ Architecture

- **Pattern**: Clean Architecture + Domain-Driven Design (DDD)
- **Layers**: Domain → Application → Infrastructure → Presentation
- **Dependency Rule**: Outer layers depend on inner layers, never inverse
- **Separation of Concerns**:
  - Domain: Pure business logic (no external dependencies)
  - Application: Use case orchestration
  - Infrastructure: Repository implementation (API)
  - Presentation: UI components + pages
- **Testability**: 116 tests with repository mocks (no direct API)

### 🔄 Workflows

#### New Golf Course Request (Creator)
1. Creator fills GolfCourseForm
2. Frontend → `createGolfCourseUseCase.execute()`
3. Backend creates with status `PENDING_APPROVAL`
4. Admin sees in "New Requests" tab
5. Admin approves → status `APPROVED` (available for competitions)
6. Admin rejects → status `REJECTED` + reason

#### Golf Course Update Proposal (Creator)
1. Creator edits APPROVED course
2. Frontend → `updateGolfCourseUseCase.execute()`
3. Backend creates **clone** with `originalGolfCourseId` set
4. Original marks `isPendingUpdate=true`
5. Admin sees in "Update Proposals" tab
6. Admin approves → merge clone → original, delete clone, `isPendingUpdate=false`
7. Admin rejects → delete clone, `isPendingUpdate=false`

#### Admin Direct Creation
1. Admin fills GolfCourseForm
2. Frontend → `createGolfCourseAdminUseCase.execute()`
3. Backend creates directly with status `APPROVED`
4. Immediately available for competitions

### 🎨 UX Improvements

- **Country Dropdown**: Replaced text input with select including:
  - Complete country list from backend
  - Flags with `CountryFlag` component
  - Translated names with `formatCountryName()`
  - Preview of selected country
- **Real-time Validations**:
  - Total par calculated automatically (must be 66-76)
  - Unique stroke indices (1-18 without repeating)
  - Tee ranges (courseRating, slopeRating) with WHS hints
- **Visual Feedback**:
  - Status badges with colors (green/yellow/red/gray)
  - "Update pending" indicators in table
  - Icons in actions (view, edit, approve, reject)
  - Tabs with counters (New 5, Updates 3)

### 🔐 Security

- Role-based visibility: Admin links only for `user.is_admin=true`
- Protected routes: Only authenticated access  
- Form validations: Multi-layer (HTML → Zod → Backend Pydantic)
- Rejection reasons: Auditable (10-500 chars, stored in DB)

### 📊 Statistics

- **Files Created**: 30+
- **Lines of Code**: ~3,500
- **Translations**: 300+ (ES/EN)
- **Tests**: 116 (100% passing)
- **Use Cases**: 8
- **Components**: 3
- **Pages**: 2
- **Value Objects**: 2
- **Entities**: 1
- **Repository Interfaces**: 1
- **Repository Implementations**: 1

### 🚀 Performance

- Lazy loading of admin pages with React.lazy()
- Potential memoization in GolfCourseTable (pending)
- Bundle impact: ~45 KB (form + table + pages)

### 📝 Documentation

- JSDoc in all use cases
- Comments in complex validations (totalPar, stroke indices)
- README updated with Golf Course Management section
- ROADMAP Sprint 1 marked as COMPLETED

## [1.16.0] - 2026-01-24

### 🚀 Major Dependencies Update

This version updates critical dependencies with breaking changes, modernizing the complete tech stack.

### ⬆️ Updated

#### Sprint 1: React 19 Ecosystem
- **react** & **react-dom**: 18.2.0 → 19.2.3
- **@vitejs/plugin-react**: 4.7.0 → 5.1.2
- **vite**: 6.x → 7.3.1
- Removed **prop-types** (incompatible with React 19)

#### Sprint 2: Monitoring & Routing
- **@sentry/react**: 7.120.4 → 10.34.0 (React 19 support)
- **react-router-dom**: 6.20.0 → 7.12.0
- Fixed Docker build with Sentry 10

#### Sprint 3: Build Tools & Styling
- **tailwindcss**: 3.4.19 → 4.1.18 (CSS-first config)
- **eslint**: 8.55.0 → 9.39.2 (Flat config)
- Complete migration to `@theme` inline syntax
- New `eslint.config.js` configuration

#### Sprint 4: Verification & Fixes
- **@sentry/replay**: → 7.116.0 (peer dependency fix)

### ✨ Added
- Custom toast wrapper with close button (X)
- Pointer cursor on toast close buttons
- `dismiss` method in customToast

### 🐛 Fixed
- Login: Fix undefined toast import (line 83)
- useInactivityLogout: Added toast import
- Tests: Updated 5 files for customToast mocks
- Modal overlay: Reduced opacity from 50% to 30%
- Toast positioning: Moved to bottom-right

### 🎯 Performance
- Build time: 5.83s
- Bundle size: 1318 KB (gzipped ~460 KB)
- Code splitting: 40 chunks
- Gzip compression: ~70% average

### 🔒 Security
- NPM Audit: 0 vulnerabilities
- OWASP Score: 8.75/10
  - A08 (Data Integrity): 9.0/10
  - A07 (Authentication): 8.5/10

### ✅ Tests
- 717 tests passing
- 1 test skipped
- 0 tests failing
- Coverage: ≥85% lines

### 📊 Compatibility
- Node.js: ≥18.x
- NPM: ≥9.x
- React: 19.2.3
- Vite: 7.3.1
- Tailwind CSS: 4.1.18

## [1.15.0] - 2026-01-24

### Added
- **Subresource Integrity (SRI)**: Implemented asset integrity validation system
  - Installed `vite-plugin-sri@0.0.2` with hardcoded SHA-384 algorithm
  - All critical assets (JS/CSS) include integrity hashes
  - `crossorigin` attribute added automatically for CORS
  - Prevents compromised CDN attacks and asset modification
  - Verified build: 5 main assets with integrity hashes
- **CI/CD Commit Signature Verification**: Automatic GPG signature validation in commits
  - New `commit-verification` job in CI/CD workflow
  - Rejects unsigned commits in pipeline (except automatic GitHub merge commits)
  - Imports public keys from `GPG_PUBLIC_KEYS` secret
  - Verifies GPG signature with `git verify-commit`
  - Blocks build if commit is not signed
  - Automatic detection of merge commits by parent count
- **Package-Lock Integrity Validation**: package-lock.json integrity validation
  - New step in `dependency-audit` job
  - Verifies that `package-lock.json` was not modified during `npm ci`
  - Prevents dependency confusion attacks
  - Guarantees build reproducibility

### Changed
- **Dependency Updates**: Updated dependencies to more recent versions
  - `framer-motion`: v12.23.x → v12.27.0 (performance improvements)
  - `vite`: v7.3.0 → v7.3.0 (no changes, verified)
  - `i18next`: v25.7.3 → v25.7.3 (no changes, verified)
  - `react-i18next`: v16.5.0 → v16.5.0 (no changes, verified)
- **GitHub Actions Updates**: Updated security actions
  - `snyk/actions`: updated to v1.0.0
  - `trufflesecurity/trufflehog`: updated to v3.92.5

### Security
- **OWASP A08: Data Integrity**: Improvement from 7.0/10 → **9.0/10** (+2.0)
  - SRI prevents malicious asset modification (+0.8)
  - Commit signing prevents malicious commits (+0.3)
  - Package-lock validation prevents dependency confusion (+0.2)
  - Cumulative improvements in configuration and CI/CD (+0.7)
  - Protection against supply chain attacks
- **Global OWASP Score**: 8.75/10 → **9.2/10** (+0.45)

## [1.14.2] - 2026-01-19

### Fixed
- **Infinite Toast Loop on Logout/Revocation**: Fixed critical bug causing infinite loop of "Your session has ended" toast messages
  - **Problem**: After logout or device revocation, redirecting to `/login` triggered `getUserData()` → 401 → `handleDeviceRevocationLogout()` → redirect loop
  - **Root Cause**: `App.jsx` called `getUserData()` on ALL routes (including public pages like `/login`), causing redundant session checks
  - **Solution**: Added public routes detection in `App.jsx` - no session verification on public pages (`/login`, `/register`, etc.)
  - **Benefit**: Prevents unnecessary API calls on public pages, improves performance, eliminates infinite redirect/toast loops
  - **Files Modified**: `src/App.jsx` (added `PUBLIC_ROUTES` constant, `isPublicRoute` check, early return in `useEffect`)
- **Ugly Refresh on Self-Revocation**: Fixed UX issue where success toast disappeared immediately due to page refresh
  - **Problem 1**: Revoking own device showed toast but page refreshed instantly (monitor detected revocation → duplicate logout)
  - **Problem 2**: After manual logout, backend `/logout` call returned 401 → triggered `handleDeviceRevocationLogout()` → second toast + page refresh
  - **Solution**:
    - Increased logout delay from 500ms to 2500ms (allows reading success toast)
    - **Set** revocation flag before logout (not clear it) → prevents monitor from re-triggering `handleDeviceRevocationLogout()`
    - Skip backend `/logout` call when revoking own device (tokens already invalidated) → added `skipBackendCall` option to `useLogout` hook
    - Flag is cleared automatically on next successful login (see `useAuth.js:74`)
  - **Benefit**: User can read the success toast for 2.5 seconds, then single clean redirect to login without duplicate toasts/refreshes
  - **Files Modified**: `src/pages/DeviceManagement.jsx`, `src/hooks/useLogout.js` (added optional `skipBackendCall` parameter)
- **Blank Page on Expired Session Navigation**: Fixed critical bug causing blank page when navigating with expired session
  - **Root cause**: `useAuth()` hook was using `fetch` directly instead of `fetchWithTokenRefresh` interceptor
  - **Problem**: When access token expired, no automatic refresh attempt → immediate 401 → redirect during navigation → blank page
  - **Solution**: Changed `useAuth.js` and `Profile.jsx` to use `fetchWithTokenRefresh` for all protected endpoints
  - **Flow now**: Access token expires → interceptor attempts refresh → success: retries request | failure: clean redirect to login
  - **Safety timeout**: Added `Promise.race` with 5s timeout fallback in redirects (prevents indefinite hangs)
  - **Impact**: Automatic token refresh on navigation, clean redirect only when refresh fails, no more blank pages
  - **Files modified**: `src/hooks/useAuth.js`, `src/pages/Profile.jsx`, `src/utils/tokenRefreshInterceptor.js`, `ROADMAP.md`

---

## [1.14.1] - 2026-01-17

### Changed
- **Dependency Updates (Safe Patches)**: Updated 7 packages to latest patch/minor versions
  - **Vite**: 7.3.0 → 7.3.1 (bugfixes)
  - **Vitest**: 4.0.16 → 4.0.17 (bugfixes)
  - **@vitest/coverage-v8**: 4.0.16 → 4.0.17 (coverage improvements)
  - **i18next**: 25.7.3 → 25.7.4 (translation engine bugfixes)
  - **react-i18next**: 16.5.0 → 16.5.3 (React integration improvements)
  - **framer-motion**: 12.23.26 → 12.26.2 (animation library updates)
  - **terser**: 5.44.1 → 5.46.0 (minification improvements)
  - No breaking changes, all tests passing (712/712)
  - Zero vulnerabilities found in npm audit

### Security
- **Automatic Patch Updates**: All security patches applied automatically
  - Build time: 4.13s (stable)
  - Bundle size: maintained (~250 KB gzip)
  - Lint: 0 warnings

---

## [1.14.0] - 2026-01-17

### Summary
**Device Fingerprinting Improvements** - Complete overhaul of device management system with critical security fixes, UX enhancements, and code quality improvements. 19 bugs fixed across 3 sprints (Critical, Medium, UX) in 3.5 days.

### Added
- **Immediate Device Revocation Detection (Event-Driven)**: Proactive monitoring system for revoked devices
  - Created `useDeviceRevocationMonitor.js` hook with event-driven architecture
  - **3 triggers**: Navigation changes, tab visibility, 5-minute fallback polling
  - **Latency**: 0-5 seconds (was 0-15 minutes before)
  - **Throttling**: Max 1 check every 5 seconds (prevents spam)
  - **Smart activation**: Only when user is authenticated
  - Integrated in `App.jsx` globally
  - 3 comprehensive tests (100% passing)

- **ConfirmModal React Component**: Modern, accessible modal replacing window.confirm()
  - Full i18n support (ES/EN) for all modal text
  - Accessibility: `aria-labelledby`, `aria-describedby`, `role="dialog"`
  - **ESC key support** for closing
  - **Body scroll lock** when modal is open
  - **Loading state** with spinner during operations
  - **Destructive actions** styling (red buttons)
  - Responsive design (mobile-first)
  - Reusable across entire application

- **Inline Error Display Per Device**: Persistent error messages for failed operations
  - `deviceErrors` Map state in `useDeviceManagement` hook
  - Error boxes appear below each affected device (persistent)
  - Dismissable with close button (X)
  - Complements toast notifications (which disappear after timeout)
  - Better UX for multiple simultaneous operations

- **Skeleton Loader (Non-Blocking)**: Elegant loading state without blocking navigation
  - 3 animated device cards (`animate-pulse`)
  - **HeaderAuth always visible** during load
  - Users can navigate while devices load
  - Matches exact structure of real device cards
  - Replaces full-page blocking spinner

- **Accessibility Improvements (WCAG 2.1 AA)**: Screen reader and assistive technology support
  - `aria-hidden="true"` on 9 decorative SVG icons
  - `aria-label` for close error button (internationalized)
  - Better navigation for screen readers
  - All interactive elements properly labeled

- **Device Entity Validation**: Strict type checking in domain layer
  - Validation for `id`, `device_name`, `ip_address` (strings required)
  - Validation for `last_used_at`, `created_at` (string, null, or undefined)
  - Validation for `is_active` (boolean strict)
  - 23 new validation tests (18 → 41 tests total)

- **Backend-Driven `is_current_device`**: Eliminated complex User-Agent parsing
  - Backend provides `is_current_device` via JWT `device_id`
  - 100% accurate detection (no regex or browser detection needed)
  - Eliminated 19 tests for deprecated User-Agent detection
  - **Code reduction**: -417 lines (82% reduction)
  - Visual UX: Green border for current device

- **Deprecation Warnings (DEV mode)**: Developer-friendly warnings for old methods
  - `console.warn()` for deprecated `getFormattedLastUsed()` and `getFormattedCreatedAt()`
  - Only active in development (removed in production builds)
  - Clear migration path to `formatDateTime()` utility
  - 2 tests verifying warnings appear correctly

### Changed
- **Logout Timeout Optimization**: Reduced timeout from 2000ms to 500ms when revoking current device
  - Backend already invalidates tokens immediately
  - 500ms delay only for user feedback visibility (toast)
  - Improves UX with faster logout response

### Fixed
- **iOS Safari Device Detection (Critical)**: Fixed iPadOS 13+ detection issue
  - **Problem**: iPadOS 13+ identifies as macOS in User-Agent
  - **Solution**: Detection using `navigator.maxTouchPoints > 1` for touch devices
  - **Impact**: Correctly detects iPadOS devices vs macOS Safari
  - Reordered checks: iOS first, then macOS (excludes iOS)
  - 16 comprehensive tests covering all edge cases

- **Page Blank Crash on Device Revocation**: Fixed critical crash when device was revoked
  - **Problem**: Response body consumed error caused white page
  - **Solution**: `await new Promise(() => {})` instead of returning consumed response
  - **Impact**: Graceful logout flow without crashes
  - Integrated with immediate revocation detection system

- **Infinite Promise in Refresh Endpoint**: Fixed check order preventing proper logout
  - **Problem**: Checks after `response.body` was consumed
  - **Solution**: Reordered checks before consuming response body
  - **Impact**: Proper handling of 401 on refresh endpoint

### Security
- **OWASP Score Improvement**: 8.75/10 → 8.87/10 (+0.12)
  - **A01: Access Control**: 8.0/10 → 8.5/10 (+0.5)
    - Immediate device revocation detection (0-5s latency)
    - Backend-driven current device detection (100% accurate)
  - **A07: Authentication Failures**: 8.5/10 → 9.0/10 (+0.5)
    - Event-driven monitoring prevents unauthorized access
    - Faster logout on revocation reduces attack window

### Performance
- **Code Reduction**: -417 lines (82% reduction in device detection logic)
- **Event-Driven Architecture**: ~85-90% reduction in API requests vs polling
  - Requests/hour (active user): 15-20 (vs 120 with 30s polling)
  - Requests/hour (idle user): 12 (5min fallback)
- **Bundle Size**: Maintained stable (~250 KB gzip)

### Testing
- **Test Suite**: 540 → 712 tests (+172 net, -31 deprecated)
- **Coverage**:
  - Device Module: ~85% → ~97% (+12%)
  - Overall: Lines ≥85%, Functions ≥75%, Branches ≥70%
- **New Test Files**:
  - `useDeviceRevocationMonitor.test.jsx` (3 tests)
  - Device entity validation tests (+23 tests)
  - TokenRefresh fix tests
- **Test Quality**: 100% pass rate, 0 flaky tests

### Documentation
- **ROADMAP.md**: Complete v1.14.0 documentation (667 lines)
  - 3 sprints documented with time tracking
  - Breaking changes and solutions detailed
  - Metrics tracking (tests, security score, coverage)
  - v1.15.0 Major Dependencies Update roadmap added
- **Commits**: 23 total (Sprint 1: 4, Sprint 2: 8, Sprint 3: 11)
- **Conventional Commits**: 100% compliance

---

## [1.6.0] - 2025-11-25

### Added
- **Internationalization (i18n)**: Added translations for Device Management page
  - New namespace `devices` with ES/EN translations
  - Updated `i18n/config.js` to include devices namespace
  - Translated all UI strings: titles, buttons, confirmations, alerts, device info
  - Consistent with project's i18n patterns using `useTranslation` hook
- **Internationalization (i18n)**: Full bilingual support for Spanish and English
  - Implemented react-i18next with language persistence in localStorage
  - Language dropdown switcher with flag icons in header/footer
  - Automatic browser language detection on first visit
  - Translated all pages: Landing, Login, Register, ForgotPassword, ResetPassword, Dashboard, Profile, EditProfile, BrowseCompetitions, Competitions, CompetitionDetail, CreateCompetition
  - Translated components: Header, HeaderAuth, Footer, ProfileCard
  - Translation namespaces: common, auth, landing, dashboard, profile, competitions
  - Dynamic country names using formatCountryName() helper (API returns both name_en and name_es)
  - Competition statuses translated: DRAFT/BORRADOR, ACTIVE/ACTIVA, CLOSED/CERRADA, IN PROGRESS/EN PROGRESO, COMPLETED/COMPLETADA, CANCELLED/CANCELADA
  - Enrollment statuses translated: REQUESTED/SOLICITADA, PENDING/PENDIENTE, APPROVED/APROBADA, REJECTED/RECHAZADA
  - All toast messages translated for error and success notifications
  - Search placeholders with dynamic interpolation based on search type
- **Security Features v1.13.0**: Complete integration with backend security hardening
  - **Password History Validation**: Frontend detects and displays user-friendly error when users attempt to reuse any of their last 5 passwords
    - Specific toast notification with 8-second duration and key icon
    - Pattern matching detection for password history errors from backend
    - Integrated in `useEditProfile` hook for profile security updates
    - 4 comprehensive tests covering all scenarios (100% passing)
  - **Device Management (Device Fingerprinting)**: Complete Clean Architecture implementation for managing active user sessions
    - **Domain Layer**: Device entity with business logic, IDeviceRepository interface
    - **Infrastructure Layer**: ApiDeviceRepository with GET/DELETE endpoints, automatic CSRF token integration
    - **Application Layer**: GetActiveDevicesUseCase and RevokeDeviceUseCase with validation
    - **Presentation Layer**: `/profile/devices` route with DeviceManagement page and useDeviceManagement hook
    - Visual features: Current device detection, double confirmation for current device revocation, auto-redirect to login after self-revocation
    - Security alerts and tips in UI, responsive design with Tailwind CSS
    - 42 tests passing (15 entity + 10 repository + 17 use cases) - 100% coverage on new code
  - **CORS Fix**: Added `X-CSRF-Token` to allowed headers in backend for proper CSRF protection (backend commit 1948d33)
    - Resolves 403 Forbidden errors on POST/PUT/PATCH/DELETE requests
    - Enables proper preflight OPTIONS handling for CSRF-protected endpoints
- **Snyk Security Integration**: Automated vulnerability scanning in CI/CD pipeline
  - Added `snyk-security` job for npm dependency scanning (detects CVEs in node_modules)
  - Added `snyk-code` job for static code analysis (detects XSS, injection, insecure APIs)
  - Integrated with GitHub Security tab via SARIF reports
  - Configured severity threshold: fails only on HIGH and CRITICAL vulnerabilities
  - Executes on push to all branches, PRs to main/develop, and weekly schedule
  - Reports retained as downloadable artifacts for 30 days
  - Uses existing `SNYK_TOKEN` GitHub secret for authentication
- **Validation Unit Tests**: Created comprehensive test suite for input validation functions
  - Created `src/utils/validation.test.js` with 38 tests (100% passing)
  - validatePassword() tests: 13 tests (minimum, maximum, complexity, edge cases)
  - validateEmail() tests: 11 tests (format, length, RFC 5321 compliance)
  - validateName() tests: 14 tests (length, special characters, accents support)
  - Tests verify boundary conditions, equivalence partitions, and edge cases
- **Token Refresh Interceptor**: Automatic access token renewal when tokens expire (401 responses)
  - Created `src/utils/tokenRefreshInterceptor.js` with automatic refresh flow
  - When access token expires (401), automatically calls `/auth/refresh-token` endpoint
  - Retries original request transparently with new token (user notices nothing)
  - Request queue prevents multiple simultaneous refresh calls
  - Infinite loop prevention: refresh endpoint itself never retries
  - Graceful logout: redirects to login only if refresh token also expired
  - Created `src/utils/tokenRefreshInterceptor.test.js` with 16 unit tests (100% passing)
  - Updated `src/services/api.js` to use interceptor for all API requests
  - Centralized API: All repositories now use `apiRequest()` with automatic token refresh
    - `src/infrastructure/repositories/ApiAuthRepository.js`
    - `src/infrastructure/repositories/ApiUserRepository.js`
    - `src/infrastructure/repositories/ApiCompetitionRepository.js`
    - `src/infrastructure/repositories/ApiHandicapRepository.js`
    - `src/infrastructure/repositories/ApiEnrollmentRepository.js`
- **Automatic Logout by Inactivity**: Session security with automatic logout after 30 minutes of inactivity
  - Created `src/hooks/useInactivityLogout.jsx` custom hook with comprehensive inactivity detection
  - Detects user activity via 6 event types: mousedown, mousemove, keydown, scroll, touchstart, click
  - Warning system: Shows interactive toast 2 minutes before logout with "Continue session" button
  - Configurable timeout (default: 30 minutes) and warning time (default: 2 minutes)
  - Debouncing (1 second) to optimize performance and prevent excessive timer resets
  - Proper cleanup: Removes all event listeners and timers on component unmount (memory leak prevention)
  - Integrated in `src/App.jsx` globally (only active when user is authenticated)
  - Backend logout call on inactivity: Revokes refresh tokens in database
  - Sentry context cleanup: Clears user context on automatic logout
  - Created `src/hooks/useInactivityLogout.test.js` with 18 unit tests (100% passing):
    - Initialization tests (3): Default params, custom params, enabled/disabled
    - Activity detection tests (3): Event listeners, timer reset, debouncing
    - Warning tests (2): Toast display, activity after warning
    - Logout tests (3): Automatic logout, toast message, cleanup
    - Memory leak prevention tests (3): Event listener cleanup, timer cleanup, toast cleanup
    - Edge case tests (2): undefined callback, enabled state changes
    - Toast integration test (1): Button functionality verification
- **Multi-Tab Logout Synchronization (Broadcast Channel)**: Automatic logout across all browser tabs when user logs out in one tab
  - Created `src/utils/broadcastAuth.js` with Broadcast Channel API implementation (265 lines)
  - Functions: `broadcastLogout()`, `onAuthEvent()`, `broadcastLogin()`, `closeBroadcastChannel()`, `isBroadcastChannelSupported()`
  - Singleton pattern for channel instance (memory efficient, prevents duplicates)
  - Event-driven architecture: Observer pattern for multi-tab communication
  - Browser compatibility: ~96% (Chrome 54+, Firefox 38+, Edge 79+, Safari 15.4+)
  - Graceful degradation: Silent fail in unsupported browsers (no errors, logs warning in development)
  - Integrated in `HeaderAuth.jsx`: Broadcasts logout event when user manually logs out
  - Integrated in `Profile.jsx`: Broadcasts logout event from profile page logout button
  - Integrated in `App.jsx`: Listener receives logout events from other tabs and executes local logout
  - Reuses existing `handleInactivityLogout()` for consistency (DRY principle)
  - All tabs call backend `/api/v1/auth/logout` endpoint (idempotent, robust)
  - Proper cleanup: Event listeners removed on component unmount (memory leak prevention)
  - User experience: Prevents "phantom" logged-in tabs after logout
  - Security: All tabs revoke tokens correctly, no orphaned sessions
  - Development logs: Comprehensive logging for debugging (only in development mode)
- **CI/CD Quality Gates (Pipeline Automation)**: Comprehensive quality enforcement in CI pipeline
  - Created `.github/workflows/ci.yml` with enforced quality gates:
    - **Coverage thresholds**: Lines ≥80%, Statements ≥80%, Functions ≥75%, Branches ≥70%
    - **Bundle size budget**: Maximum 1000 KB (warning at 800 KB)
    - **Prettier format check**: Enforces code formatting consistency
    - Automated build verification on every push
  - Created `.github/workflows/pr-checks.yml` for pull request validation:
    - **PR size check**: Blocks PRs with >1000 changes (warns at >500)
    - **Conventional commits**: Validates PR title format (feat, fix, docs, etc.)
  - Enhanced `.github/workflows/security.yml` with dependency auditing:
    - Weekly npm audit scans
    - Outdated dependencies check (informational only)
    - Secret scanning with TruffleHog
    - License compliance verification
  - Documentation: `docs/architecture/decisions/ADR-007-ci-cd-quality-gates.md`
  - Installed `@vitest/coverage-v8` for coverage reporting
  - Bundle size analysis with detailed breakdown (current: 783 KB, budget: 1000 KB)
- **Security E2E Tests Suite (OWASP Validation)**: Automated security testing with Playwright
  - Created `tests/security.spec.js` with 12 comprehensive E2E security tests (100% passing):
    - **XSS Protection (2 tests)**: React auto-escaping validation, event handler payload prevention
    - **CSRF Protection (1 test)**: SameSite cookies verification
    - **CSP Violations (2 tests)**: Inline script blocking, security headers presence
    - **Authentication Security (3 tests)**: SQL injection rejection, generic error messages, logout cleanup
    - **Input Validation (3 tests)**: Email format validation, password complexity enforcement, length limits
    - **Rate Limiting (1 test)**: Graceful handling of rate limit responses
  - Created `.github/workflows/security-tests.yml` workflow for automated CI execution
  - Added npm script: `npm run test:security` for local execution
  - Documentation: `docs/architecture/decisions/ADR-008-security-testing-strategy.md`
  - Tests validate OWASP Top 10 2021 protections: A03 (Injection), A07 (Authentication)

### Changed
- **CI/CD Workflow Refactor**: Improved GitHub Actions configuration for better reliability and security
  - Renamed `ci-unified.yml` to `ci-cd.yml` for clearer naming convention
  - Pinned all GitHub Actions to specific commit SHAs to prevent supply chain attacks
  - Added explicit permissions declarations (contents: read, security-events: write)
  - Improved dependency installation caching for faster workflow execution
  - Enhanced error handling and reporting in all workflow steps
- **Date Formatting Refactor**: Centralized date formatting logic into reusable utilities
  - Created `src/utils/dateFormatters.js` with three functions: `formatDateTime()`, `formatFullDate()`, `formatShortDate()`
  - Standardized date formatting across Profile.jsx and DeviceManagement.jsx
  - Added comprehensive JSDoc documentation with usage examples
  - Improved error handling with try-catch blocks and fallback text support
  - Enhanced i18n support with browser locale detection in formatDateTime()
  - Reduced code duplication and improved maintainability
- **Input Validation Improvements**: Strengthened validation rules to sync with backend v1.8.0 security requirements (OWASP ASVS V2.1.1)
  - Password validation: Increased minimum length from 8 to 12 characters (mandatory)
  - Password validation: Added maximum length of 128 characters (DoS prevention)
  - Password validation: Complexity requirements now mandatory (uppercase + lowercase + numbers)
  - Email validation: Added maximum length of 254 characters (RFC 5321 compliance)
  - Name validation: Increased maximum length from 50 to 100 characters (multinational name support)
  - Updated `src/utils/validation.js` with stricter validation logic
- **Form Updates**: Updated Register and EditProfile forms with new validation limits
  - Changed password placeholder from "Minimum 8 characters" to "Minimum 12 characters"
  - Added `maxLength` HTML attributes: firstName/lastName (100), email (254), password (128)
  - Updated helper text in EditProfile: "Must be at least 12 characters if changing"
  - HTML validation provides first layer of defense before JavaScript validation
- **Security Workflow Enhancement**: Extended `.github/workflows/security.yml` with Snyk integration (77 new lines)
  - Maintains parallel execution with existing security checks (npm audit, TruffleHog, license check)
  - Non-blocking configuration (`continue-on-error: true`) to prevent development workflow disruption

### Fixed
- **CSRF Token Device Deletion**: Fixed critical bug preventing device revocation due to missing CSRF token in API requests
  - **Problem**: Device deletion (DELETE /api/v1/users/me/devices/{id}) failed with 403 Forbidden
  - **Root Cause**: `getCsrfToken()` returned null due to React context synchronization timing issues
  - **Solution**: Implemented fallback mechanism in `src/contexts/csrfTokenSync.js`
    - Priority 1: Read token from React context (synced via AuthProvider)
    - Priority 2: Fallback to reading `csrf_token` cookie directly from `document.cookie`
  - **Pattern**: Implements "Double-Submit Cookie Pattern" compatible with backend CSRF validation
  - **Backend Compatibility**: Works with backend v1.13.0 CSRF middleware (csrf_config.py + csrf_middleware.py)
  - **Impact**: Device management now fully functional - users can revoke active sessions
  - **Security**: No security reduction - maintains CSRF protection integrity
  - **File Changed**: `src/contexts/csrfTokenSync.js` (+30 lines, fallback function)
- **GitHub Actions Workflow Errors**: Corrected 3 critical failures in CI/CD pipeline
  - **PR Checks - Conventional Commits**: Added 10-second delay for Dependabot PRs to wait for auto-fix workflow completion
    - Prevents race condition where validation runs before title is capitalized
    - Maintains strict Conventional Commits enforcement for all PRs
  - **Security Checks - Snyk SARIF Upload**: Fixed SARIF file generation and upload issues
    - Corrected flag syntax: `--sarif-file-output snyk-security.sarif` → `--sarif-file-output=snyk-security.sarif` (added equals sign)
    - Added conditional file existence checks before upload steps
    - Prevents workflow failure when no vulnerabilities are found (SARIF not generated)
    - Added informative logs: "SARIF file generated successfully" or "SARIF file not generated (no vulnerabilities)"
  - **Security Checks - TruffleHog**: Fixed "BASE and HEAD commits are the same" error
    - Switched to filesystem scan for all PR types and push events (more reliable than git diff)
    - Eliminates "BASE and HEAD are the same" errors in release branches, merges, and Dependabot PRs
    - Maintains full secret scanning coverage across all PR types
    - Consistent behavior regardless of PR source or branch type
  - All workflows now pass successfully for both developer and Dependabot PRs
  - Zero reduction in security coverage or quality gates
- **i18n Loading Text Bug**: Fixed login button showing raw translation key "common.loading" instead of translated text
  - Updated `useTranslation` hook in Login.jsx to support multiple namespaces: `['auth', 'common']`
  - Corrected translation call from `t('common.loading', { ns: 'common' })` to `t('loading', { ns: 'common' })`
  - Now correctly displays "Loading..." (English) or "Cargando..." (Spanish) during authentication
- **Profile Page Crashes**: Fixed critical errors in Profile.jsx that caused ErrorBoundary to trigger
  - Fixed undefined variable error: `isLoading` → `isLoadingUser || isLoadingData`
  - Fixed missing function error: Implemented `handleLogout()` with proper backend call and broadcast
  - Added `broadcastLogout()` integration for multi-tab logout consistency
  - Profile page now loads correctly without errors
- **Backend Logout Request Bug**: Fixed logout endpoint call not sending required body JSON
  - Added `body: JSON.stringify({})` to logout fetch request in `HeaderAuth.jsx`
  - Backend expected `LogoutRequestDTO` body (even with optional fields)
  - Logout now correctly revokes refresh tokens in database
  - Cookies `access_token` and `refresh_token` properly deleted from browser
  - Confirmed working: refresh tokens marked as revoked in database after logout

### Removed
- **Deprecated secureAuth.js**: Removed legacy authentication utility (fully migrated to httpOnly cookies)
  - Deleted `src/utils/secureAuth.js` (setAuthToken, getUserData, setUserData, authenticatedFetch)
  - Updated tests to skip deprecated authentication logic (56 tests marked as skip, to be rewritten)
  - All production code now uses httpOnly cookies via `apiRequest()` centralized service
  - Tests passing: 417 tests (100% pass rate)

### Security
- **OWASP ASVS V2.1.1 Compliance**: Aligned frontend validation with backend security standards
  - Password minimum 12 characters prevents brute-force attacks (OWASP recommendation)
  - Password maximum 128 characters prevents DoS attacks via excessive hashing
  - Email maximum 254 characters follows RFC 5321 internet standard
  - Multi-layer defense: HTML maxLength → JavaScript validation → Backend Pydantic validation
  - Security score improvement: 7.5/10 → 7.9/10 (+0.4)
- **Logout Token Revocation**: Fixed critical security issue where logout was not revoking refresh tokens in database
  - Prevents token reuse after logout (OWASP A01: Broken Access Control)
  - Improves session management security (OWASP A07: Authentication Failures)
- **httpOnly Cookies Migration**: Migrated from localStorage tokens to httpOnly cookies for XSS protection
  - Access tokens and refresh tokens now stored in httpOnly cookies (JavaScript cannot access)
  - Added `credentials: 'include'` to all API requests for automatic cookie sending
  - Protects against XSS attacks (OWASP A03: Injection)
  - Security score improvement: 8.2/10 → 8.5/10 (+0.3)
- **Automatic Token Refresh Flow**: Improved session management with transparent token renewal
  - Access tokens expire every 15 minutes (short-lived for security)
  - Refresh tokens expire after 7 days (long-lived for UX)
  - User only needs to login again after 7 days of inactivity
  - Significantly improves UX: no manual re-login every 15 minutes
  - Security benefits:
    - Short-lived access tokens reduce window of compromise
    - Automatic refresh prevents session fixation attacks
    - Token revocation works correctly (logout invalidates refresh tokens)
  - OWASP Impact:
    - A01: Broken Access Control: 8/10 → 8.5/10 (+0.5)
    - A02: Cryptographic Failures: 9/10 → 9.5/10 (+0.5)
    - A07: Authentication Failures: 8/10 → 8.5/10 (+0.5)
  - Overall Security Score: 8.2/10 → 8.5/10 (+0.3)
- **Automatic Logout by Inactivity**: Prevents unauthorized access to abandoned sessions
  - Complies with OWASP A07 (Identification and Authentication Failures) recommendations
  - 30-minute timeout standard aligns with industry best practices (PCI DSS, HIPAA)
  - Prevents session hijacking attacks on public computers or shared devices
  - User-friendly warning system (2 minutes notice) balances security and UX
  - Proper backend logout integration ensures refresh tokens are revoked in database
  - Memory-safe implementation prevents leaks from event listeners
  - Security score improvement: 8.5/10 → 8.7/10 (+0.2)
  - OWASP Impact:
    - A07: Authentication Failures: 8.5/10 → 9.0/10 (+0.5)
- **CI/CD Quality Gates**: Automated code quality enforcement prevents security regressions
  - Coverage thresholds ensure comprehensive test coverage for security-critical code
  - Bundle size budget prevents bloated bundles that could hide malicious code
  - Conventional commits improve audit trail for security-related changes
  - PR size limits reduce review fatigue and improve security code review quality
  - Security score improvement: 8.9/10 → 9.3/10 (+0.4)
  - OWASP Impact:
    - A06: Vulnerable Components: 8.0/10 → 9.0/10 (+1.0 from npm audit automation)
    - A05: Security Misconfiguration: 8.5/10 → 9.0/10 (+0.5 from automated checks)
- **Security E2E Tests Suite**: Automated OWASP Top 10 validation
  - Validates XSS prevention through React auto-escaping
  - Verifies CSRF protection via SameSite cookies
  - Confirms CSP headers block malicious scripts
  - Tests authentication bypass resistance (SQL injection, etc.)
  - Enforces input validation standards automatically
  - Prevents security regressions through CI automation
  - Security score improvement: 9.3/10 → 9.5/10 (+0.2)
  - OWASP Impact:
    - A03: Injection: 9.0/10 → 9.5/10 (+0.5 from automated XSS/CSRF testing)
    - A07: Authentication Failures: 9.0/10 → 9.5/10 (+0.5 from auth bypass tests)
- **Sentry Security Configuration**: Implemented privacy-first monitoring with sensitive data protection
  - Automatic filtering of sensitive data (passwords, access_token, refresh_token)
  - Automatic removal of sensitive headers (Authorization, Cookie)
  - URL sanitization (tokens replaced with [REDACTED])
  - Browser extension errors ignored to prevent false positives
  - Privacy-first replay configuration with element masking
  - Added automatic user context establishment on app mount
  - Configured environment-specific sample rates (100% dev, 10-5% prod)
  - Added error filtering (browser extensions, timeouts, fast transactions)
  - Configured auto session tracking and stack trace attachment

### Documentation
- Complete Sentry section added to CLAUDE.md (260+ lines)
- Render setup guide with troubleshooting (RENDER_SETUP.md, 300+ lines)
- Implementation summary with KPIs and best practices (SENTRY_IMPLEMENTATION_SUMMARY.md, 800+ lines)
- All helper functions documented with JSDoc comments and usage examples

## [1.5.1] - 2025-11-25

### Changed
- **Code Quality Improvements**: Fixed multiple SonarQube alerts to improve codebase maintainability
  - Replaced `global` with `globalThis` in test files for proper global object access (S7764)
  - Removed unused imports (S1128)
  - Improved condition logic by removing double negation in Competitions component (S7735)
  - Extracted nested ternary operators into helper functions for better readability (S3358)
  - Added suppression comments for false positive warnings (S2999, S1135)
  - All 419 tests passing with no functional changes

## [1.5.0] - 2025-11-25

### Fixed
- **Country Flags Rendering in Chrome/Windows**: Fixed flag display issues where Unicode Regional Indicator emojis rendered as boxes or letters
  - Migrated from Unicode emojis to SVG flags using `country-flag-icons` library
  - Created `CountryFlag` React component with static imports (Vite-compatible)
  - Updated 5 components: Register, Profile, EditProfile, CompetitionDetail, BrowseCompetitions
  - Flags now render consistently across all browsers and operating systems
- **Responsive Design in Competition Detail**: Fixed horizontal overflow in "Pending Requests" section in competition detail view for creator on mobile devices.
- **Responsive Design in Create Competition**: Adjusted width of date fields ("Start Date" and "End Date") in competition creation page to prevent overflow on mobile screens.

### Changed
- **Create Competition UI**:
  - Replaced "Team Assignment" radio buttons with dropdown selector to improve UX.
  - Replaced "Player Handicap" radio buttons with dropdown selector.

### Added
- **Multiple Competition Status Filter**: Backend now accepts multiple `status` values in competition listing endpoint:
  - Modified `status_filter` parameter from `Optional[str]` to `Optional[List[str]]` in `list_competitions()`
  - Updated logic in `_get_user_competitions()` to iterate over multiple statuses
  - Implemented competition deduplication when querying multiple statuses
  - Allows queries like `?status=CLOSED&status=IN_PROGRESS&status=COMPLETED`
- **Pending Enrollments Badge**: Visual indicator in "My Competitions" for creators:
  - Orange badge with counter of pending requests (REQUESTED status)
  - Appears only in competitions where user is creator
  - Includes pulse animation to draw attention
  - Backend calculates `pending_enrollments_count` using `EnrollmentStatus.REQUESTED`
  - Frontend mapper added `pending_enrollments_count` field to DTO
- **Enhanced CompetitionDetail for Creators**: Complete reorganization of enrollments section:
  - **Approved Players Section**: 2-column grid with approved players
    - Shows name, handicap (HCP: X.X) and assigned team
    - Light green background and sorting by team and handicap
  - **Pending Requests Section**: List of requests with actions
    - Orange background to highlight
    - Approve/Reject buttons directly visible
  - **Rejected Enrollments Section**: Collapsible to avoid unnecessary space
- **Smart Competition Filtering for Rejected Enrollments**:
  - Rejected competitions remain in "My Competitions" if they are ACTIVE
  - Automatically hidden if competition is CLOSED, IN_PROGRESS, COMPLETED or CANCELLED
  - Allows user to see rejections while there's still possibility of change
  - Implemented in `_get_user_competitions()` with `EnrollmentStatus.REJECTED` validation
- **Creator Information in Browse Cards**: Complete creator data mapping:
  - Added `creator` field to CompetitionMapper with snake_case → camelCase conversion
  - Shows creator's full name: "Created by: [First Name] [Last Name]"
  - Includes complete data: id, firstName, lastName, email, handicap, countryCode

### Changed
- **Dashboard Tournaments Counter**: Now uses `listUserCompetitionsUseCase` instead of `getCompetitions()`:
  - Guarantees consistency with "My Competitions" page
  - Counts only user competitions (created OR enrolled)
  - Uses same `my_competitions=true` filter from backend

### Testing
- **Test Suite Update**: Fixed `useEditProfile` tests to include `countryCode` field:
  - Updated initial formData state with `countryCode: ''` field
  - Total: **419 tests passing** in **35 files**
  - Complete Domain Layer coverage (Value Objects, Entities)
  - Complete Application Layer coverage (Use Cases)
  - Custom hooks tests (useEditProfile)
  - Utilities tests (countryUtils, validation)

### Fixed
- **IN_PROGRESS Competitions Not Showing**: Fixed multiple status filter in backend:
  - Frontend sent array `['CLOSED', 'IN_PROGRESS', 'COMPLETED']`
  - Backend only accepted single status value
  - Now correctly processes multiple statuses in "Explore Competitions"
- **Creator Name Missing in Browse Cards**: Fixed creator data mapping:
  - Backend sent `creator` with fields in snake_case
  - Frontend wasn't mapping `creator` field in CompetitionMapper
  - Now converts correctly: `first_name` → `firstName`, `last_name` → `lastName`
- **Handicap Display Removed from Browse Cards**: Removed creator HCP for more compact cards

### Added
- **Browse Competitions Feature**: Complete new page to discover and explore public competitions:
  - **Two independent sections**:
    - **"Join a Competition"**: Lists ACTIVE competitions where user can request to join (excludes own competitions)
    - **"Explore Competitions"**: Lists competitions in CLOSED, IN_PROGRESS, or COMPLETED status for viewing (includes own and others)
  - **Domain Layer**: Added `findPublic(filters)` method to `ICompetitionRepository` to get public competitions with filters
  - **Infrastructure Layer**: Complete implementation in `ApiCompetitionRepository.findPublic()` with support for:
    - Filter by status (single or multiple)
    - Search by competition name (`searchName`)
    - Search by creator name/email (`searchCreator`)
    - Exclude own competitions (`excludeMyCompetitions`)
    - Pagination (`limit`, `offset`)
  - **Application Layer**: Two dedicated use cases with single responsibility:
    - `BrowseJoinableCompetitionsUseCase`: Filters ACTIVE + excludes own competitions
    - `BrowseExploreCompetitionsUseCase`: Filters [CLOSED, IN_PROGRESS, COMPLETED] + includes all
  - **Presentation Layer** (`BrowseCompetitions.jsx`):
    - Independent search in each section (client-side filtering)
    - Reusable `CompetitionCard` component with 'joinable' or 'explore' mode
    - "Request to Join" button with optimistic UI (card disappears when requesting)
    - "View Details" button for explorable competitions
    - Skeleton states and error handling
    - Integration with `secureAuth` for authentication
  - **Improved navigation**:
    - Links added in `HeaderAuth` (desktop + mobile) and `Dashboard`
    - Protected `/browse-competitions` route in `App.jsx`
    - Origin detection in `CompetitionDetail`: "Back to Browse" or "Back to Competitions" depending on origin
  - **Complete unit tests (19 tests - 100% pass rate)**:
    - `BrowseJoinableCompetitionsUseCase.test.js`: 9 tests (filters, ACTIVE status, excludeMyCompetitions)
    - `BrowseExploreCompetitionsUseCase.test.js`: 10 tests (filters, multiple statuses, includes all)

### Fixed
- **Email Verification Auto-Login Flow**: Fixed email verification flow to automatically authenticate user:
  - `ApiAuthRepository.verifyEmail()` now returns `{ user, token }` same as login
  - `VerifyEmailUseCase` simplified to return authentication result directly
  - `VerifyEmail.jsx` now uses `setAuthToken()` instead of `localStorage` directly
  - Added `country_code` to `secureAuth.setUserData()` to complete user profile
  - Users are now redirected to dashboard after verifying email (no manual login required)
  - Backend returns JWT token in `/api/v1/auth/verify-email` for automatic authentication

### Added
- **User Nationality System**: Complete implementation of optional nationality system for users:
  - **Domain Layer**: `countryCode` field added to `User` entity (optional, nullable)
  - **Value Object**: Reuse of existing `CountryCode` VO from Competition module
  - **RegisterUseCase**: Updated to accept optional `countryCode` during registration
  - **UpdateRfegHandicapUseCase**: Added validation to allow RFEG only for Spanish users (`country_code === 'ES'`)
  - **Helper `canUseRFEG()`**: New utility function in `countryUtils.js` to verify RFEG eligibility
  - **Register.jsx**: OPTIONAL country selector with search, flags and English names
  - **Profile.jsx**: Nationality display with blue badge showing flag and full country name
  - **EditProfile.jsx**: Conditional logic to show/hide "Update from RFEG" button based on nationality
  - **Data auto-sync**: Profile.jsx now automatically queries backend to keep data updated
- **Updated dependency injection**: `UpdateRfegHandicapUseCase` now receives `userRepository` to validate nationality
- **Exhaustive tests for Nationality System (66 tests - 100% pass rate)**:
  - `UpdateRfegHandicapUseCase.test.js`: 7 tests (Spanish nationality validation)
  - `countryUtils.test.js`: 31 tests (canUseRFEG, getCountryFlag, getCountryInfo, getCountriesInfo)
  - `User.test.js`: 17 tests (constructor, country_code field, toPersistence, business methods)
  - `ApiUserRepository.test.js`: 11 tests (getById with correct endpoint, update, updateSecurity)
- **Auto-sync in useEditProfile hook**: Implemented automatic fetch of fresh data from backend when mounting EditProfile
- **Debug logs**: Added comprehensive logs in UpdateRfegHandicapUseCase, ApiUserRepository, and canUseRFEG for easier debugging

###
- **GetCompetitionDetailUseCase (Application Layer)**: New use case to get competition details:
  - Validates input (competitionId required).
  - Uses `repository.findById()` to get domain entity.
  - Converts entity to simple DTO for UI using `CompetitionMapper.toSimpleDTO()`.
- **findById() in ICompetitionRepository**: New interface method to query competition by ID.
- **Use cases for competition state transitions**:
  - `ActivateCompetitionUseCase`: DRAFT → ACTIVE
  - `CloseEnrollmentsUseCase`: ACTIVE → CLOSED
  - `StartCompetitionUseCase`: CLOSED → IN_PROGRESS
  - `CompleteCompetitionUseCase`: IN_PROGRESS → COMPLETED
  - `CancelCompetitionUseCase`: Any state → CANCELLED
- **Dynamic flags utility** (`countryUtils.js`): Flag emoji generation using Unicode Regional Indicators for any ISO country code.
- **Adjacent countries support with bilingual names**: Competitions now show adjacent countries with visual badges including flags and full names in English/Spanish.
- **Complete unit tests for competition use cases**: 6 new test files with exhaustive coverage:
  - `GetCompetitionDetailUseCase.test.js` (6 test cases)
  - `ActivateCompetitionUseCase.test.js` (7 test cases)
  - `CloseEnrollmentsUseCase.test.js` (6 test cases)
  - `StartCompetitionUseCase.test.js` (7 test cases)
  - `CompleteCompetitionUseCase.test.js` (7 test cases)
  - `CancelCompetitionUseCase.test.js` (9 test cases)
  - Total: 248 tests passing (all modules).

### Changed
- **Profile.jsx improved**:
  - Added "Last Updated" field in main user card
  - Added "Nationality" field with blue badge showing flag and country name in English
  - Removed redundant "Account Information" card
  - Implemented auto-sync with backend to keep data updated on each visit
- **ApiAuthRepository.register()**: Updated to send `country_code` to backend (with `null` value if not specified)
- **composition/index.js**: Updated dependency injection for `UpdateRfegHandicapUseCase` (now includes `userRepository`)
- **ApiUserRepository.getById()**: Changed endpoint from `/api/v1/users/{userId}` to `/api/v1/auth/current-user` (userId obtained from JWT token automatically)
- **useEditProfile hook**: Refactored to do auto-sync with backend on mount, similar to pattern used in Profile.jsx
- **CreateCompetition.jsx payload**: Fixed to match backend API:
  - Removed invalid fields: `team_one_name`, `team_two_name`, `player_handicap`
  - Converted to UPPERCASE: `handicap_type` and `team_assignment`
- **ApiCompetitionRepository.findByCreator()**: Removed `creator_id` parameter (backend filters automatically by authenticated user from JWT)
- **Refactor `CompetitionDetail.jsx`**: Refactored competition detail page to use Clean Architecture:
  - Replaced direct service calls with use cases (`getCompetitionDetailUseCase`, `activateCompetitionUseCase`, etc.).
  - Simplified state handling using only partial updates in transitions.
  - Improved UI with country badges showing dynamic flags and full names.
  - **CompetitionMapper updated**:
  - `toDomain()` method now handles `secondary_country_code` and `tertiary_country_code` fields from backend.
  - `toSimpleDTO()` method generates `countries` array with objects `{code, name, nameEn, nameEs, flag, isMain}` from backend.
  - Fallback support: if API doesn't return names, uses ISO codes.
- **ApiCompetitionRepository.findById()**: Implementation of method to get individual competition:
  - Calls endpoint `GET /api/v1/competitions/{id}`.
  - Maps API response to domain entity using `CompetitionMapper.toDomain()`.
  - Attaches original API data (`_apiData`) for mapper use.

### Fixed
- **Bug in CompetitionMapper**: Fixed error where `teamAssignment.value` was not called as a function, causing function render in React.
- **Race condition in Competitions.jsx**: Separated `useEffect` into two to prevent `loadCompetitions()` from executing before `setUser()` completes.
- **Error 404 in ApiUserRepository.getById()**: Fixed non-existent endpoint `/api/v1/users/{userId}` to `/api/v1/auth/current-user` which exists in the backend
- **Stale data in EditProfile**: Fixed issue where EditProfile displayed stale localStorage data without syncing with backend
- **RFEG not working for Spanish users**: Fixed error where repository tried to get user from non-existent endpoint, preventing nationality validation
- **Error 500 when creating competitions**: Fixed payload sending invalid fields (`team_one_name`, `team_two_name`, `player_handicap`) that backend doesn't accept
- **Error 500 when listing competitions**: Fixed sending `creator_id` parameter that backend doesn't accept (uses JWT automatically)
- **Case sensitivity in enums**: Fixed sending `handicap_type` and `team_assignment` in lowercase when backend expects UPPERCASE
- **Better error 500 handling**: Added detailed logging and clearer messages when backend responds with error 500

### Added
- **E2E Testing with Playwright**: Integrated Playwright framework for End-to-End tests, including configuration, scripts and tests for login flow.
- **Unit Test for `CreateCompetitionUseCase`**: Added unit test for new use case, ensuring its business logic.
- **CompetitionMapper (Infrastructure Layer)**: Nueva clase `CompetitionMapper` implementada como Anti-Corruption Layer:
  - `toDomain()`: Converts API DTOs (snake_case) to domain entities (Competition).
  - `toDTO()`: Converts domain entities to DTOs for persistence.
  - `toSimpleDTO()`: Converts entities to simple DTOs optimized for UI.
  - Protects domain from changes in external API structure.
- **ListUserCompetitionsUseCase (Application Layer)**: New use case to list user competitions:
  - Validates input (userId required).
  - Calls `repository.findByCreator()` to get domain entities.
  - Converts entities to simple DTOs for UI.
  - Includes 5 exhaustive unit tests (validation, filters, errors, empty cases).
- **findByCreator() in ICompetitionRepository**: New interface method to query competitions by creator/user.

### Changed
- **Refactor `CreateCompetition`**: Refactored competition creation page to follow Clean Architecture principles, extracting business logic to `CreateCompetitionUseCase` and `ApiCompetitionRepository`.
- **Error Message Standardization**: Standardized error message for incorrect credentials (401) in `ApiAuthRepository` to always be in English.
- **Clean Architecture & DDD Compliance**: Complete implementation of architectural patterns:
  - **ApiCompetitionRepository**: Now returns domain entities (Competition) instead of plain objects.
  - **CreateCompetitionUseCase**: Transforms domain entities to simple DTOs for UI using `CompetitionMapper.toSimpleDTO()`.
  - **Separation of Concerns**: Clear separation between domain models, API DTOs and UI DTOs.
  - **Repository Pattern**: Repository returns domain entities, complying with the pattern.
  - **DTO Pattern**: UI receives optimized DTOs without depending on complex Value Objects.
  - **Dependency Inversion**: Infrastructure depends on domain, not the other way around.
- **CreateCompetitionUseCase.test.js**: Test updated to mock `CompetitionMapper` and verify that use case returns DTOs instead of entities.
- **Refactor `Competitions.jsx`**: Refactored competition listing page to use Clean Architecture:
  - Replaced direct service call `getCompetitions()` with `listUserCompetitionsUseCase.execute()`.
  - Now receives simple DTOs (camelCase) from use case instead of API data (snake_case).
  - Removed service dependency for data fetching (only used for UI helpers).
- **ApiCompetitionRepository.findByCreator()**: Implementation of method to get user competitions:
  - Builds query params with `creator_id` and optional filters.
  - Maps API responses to domain entities using `CompetitionMapper.toDomain()`.
  - Returns array of `Competition` entities.

### Fixed
- **Vite Test Configuration**: Fixed Vitest configuration to ignore Playwright tests, allowing both test runners to work independently.
- **Bundler Module Resolution**: Solved application startup error by changing `Competition` entity export to default export to resolve conflict with Vite bundler.
- **Syntax Errors**: Fixed multiple syntax and import errors in `composition/index.js` and other files introduced during refactoring.
- **Missing JSX in CreateCompetition**: Restored complete JSX for competition creation form that was accidentally replaced by a comment in a previous commit (854 lines restored).
- **API Response Mapping Error**: Fixed critical error where `ApiCompetitionRepository` tried to create Competition entity directly with snake_case API data, causing "Team 1 name cannot be empty" error.
- **Adjacent Country Filtering**: Fixed adjacent country filter that incorrectly compared `parseInt(countryCode)` instead of directly comparing strings. Now selected country in "Adjacent Country 1" is correctly excluded from "Adjacent Country 2" options.


### Added
- **`Competition` Domain**: Complete implementation of domain layer for competition management, following DDD principles.
  - **Value Objects**: `CompetitionId`, `CompetitionStatus`, `CompetitionName`, `DateRange`, `Location` (composite), `HandicapSettings`, `TeamAssignment` and `CountryCode`.
  - **Entity**: `Competition` as Aggregate Root, encapsulating business logic and immutable state transitions.
  - **Repository**: `ICompetitionRepository` interface to define persistence contract.
- **Unit Tests**: Complete test coverage for all new Value Objects and `Competition` entity to ensure robustness and expected behavior.
- **Dashboard**: "Tournaments" card now dynamically displays total number of competitions obtained from API.
- **Dependency**: Added `uuid` package for unique identifier generation in domain.

### Fixed
- **Create Competition**: Fixed bug where number of players was not saved. Field sent to API is now `max_players` instead of `number_of_players`.
- **Delete Competition**: Fixed critical bug preventing competition deletion. API service now correctly handles `204 No Content` responses from backend.

### Changed
- **Refactor (Form)**: Removed `description` field from competition creation form to align with `Competition` entity domain model.
- **Refactor (Profile):** Extracted logic from `EditProfile.jsx` component to custom hook `useEditProfile.js`. This simplifies component to pure presentation layer and centralizes state management and side effects. Exhaustive unit tests added for new hook.
- **Refactor (DDD):** Introduced `Email` and `Password` Value Objects to improve domain robustness and security.
  - Refactored `User` entity, authentication use cases (`Login`, `Register`, `UpdateUserSecurity`) and repositories to use new Value Objects.
  - Fixed unit tests to align with new use case contracts.
  - Fixed regression in profile security update.

### Added
- Implementation of Clean Architecture for email verification flow, including:
  - Use case `VerifyEmailUseCase`.
  - Method `verifyEmail` in `IAuthRepository` and `ApiAuthRepository`.
- Implementation of unit testing system with Vitest:
  - Configuration of Vitest, `jsdom`, `@testing-library/react`.
  - Creation of `setupTests.js` for global test configuration.
  - Creation of unit tests for `LoginUseCase`, `RegisterUseCase`, `UpdateUserSecurityUseCase`, `UpdateManualHandicapUseCase`, `UpdateRfegHandicapUseCase`, `UpdateUserProfileUseCase` and `VerifyEmailUseCase`.
- Implementation of Clean Architecture for authentication flow (Login/Register), including:
  - Interface `IAuthRepository`.
  - Implementation `ApiAuthRepository`.
  - Use cases `LoginUseCase` and `RegisterUseCase`.
- Implementation of Clean Architecture for user security update functionality (email/password), including:
  - Use case `UpdateUserSecurityUseCase`.
  - Method `updateSecurity` in `IUserRepository` and `ApiUserRepository`.
- Implementation of Clean Architecture for handicap management (manual and RFEG), including:
  - Interface `IHandicapRepository`.
  - Implementation `ApiHandicapRepository`.
  - Use cases `UpdateManualHandicapUseCase` and `UpdateRfegHandicapUseCase`.
- Implementation of Clean Architecture for user profile update functionality. This includes:
  - Definition of `User` entity in domain layer.
  - Definition of `IUserRepository` interface in domain layer.
  - Implementation of `UpdateUserProfileUseCase` use case in application layer.
  - Implementation of `ApiUserRepository` in infrastructure layer for API communication.
  - Configuration of "composition root" in `src/composition/index.js` for dependency injection.

### Changed
- Refactoring of `VerifyEmail.jsx` to use `VerifyEmailUseCase`.
- Refactoring of `Login.jsx` and `Register.jsx` to use `LoginUseCase` and `RegisterUseCase`.
- Improved error handling in `ApiAuthRepository` for API responses (e.g. 422 validation errors).
- Refactoring of `EditProfile.jsx` to use `UpdateUserSecurityUseCase`, `UpdateManualHandicapUseCase` and `UpdateRfegHandicapUseCase`.
- Centralization and improvement of error handling in `ApiUserRepository` and `ApiHandicapRepository` for API responses (e.g. 422 validation errors).
- Refactoring of `EditProfile.jsx` to use `UpdateUserProfileUseCase` and `react-hot-toast` notification system.
- Complete migration of local message system (`message` state and `getMessageClassName`) to `react-hot-toast` for consistent user experience and cleaner code.

### Fixed
- Fixed bug in `UpdateUserProfileUseCase` where input validation was missing (`userId`, `updateData`).
- Fixed bug in registration flow where API response structure was incorrectly assumed, causing a "destructuring" error.
- Fixed bug in user security update where `confirm_password` was not sent to backend, causing a 422 validation error.




## [1.4.0] - 2025-11-17

### Added
- Complete redesign of Login page with Framer Motion animations
- Complete redesign of Register page with Framer Motion animations

### Changed
- **BREAKING**: Updated @vitejs/plugin-react from 4.2.1 to 4.7.0 for Vite 7 compatibility
- Removed deprecated X-XSS-Protection header from vite.config.js (XSS protection now via CSP)
- Removed deprecated X-XSS-Protection header from public/_headers and vercel.json
- Removed HSTS header from vite.config.js (now only in production via Netlify/Vercel)
- Migrated images from Unsplash to local assets in `/public/images/`
  - `golf-background.jpeg` - Hero section background
  - `hero-tournament.jpeg` - Hero main image
  - `golf-friends.jpeg` - Benefits section image

### Fixed
- **CSP Critical Fix**: Updated `connect-src` to allow connections to Render backend
  - Added `https://rydercupam-euzt.onrender.com` to CSP
  - Added `http://localhost:8000` for local development
  - Resolved error: "Refused to connect to backend because it does not appear in connect-src"
- **CSP Compatibility**: Added `'unsafe-inline'` to `script-src` and `style-src` for React and Tailwind
- Fixed security header configuration for local development
- HSTS no longer forces HTTPS in development environment (production only)
- Eliminated dependency on external Unsplash URLs (prevents rate-limiting)

### Security
- **Optimized Headers**: HSTS only in production (Netlify/_headers, vercel.json)
- **XSS Protection**: Deprecated X-XSS-Protection removed, CSP provides protection
- **Updated CSP**: Content Security Policy fixed to allow backend API
- **Local Assets**: Local images eliminate dependency on external services
- **Vite 7 Compatible**: Build tool updated with security improvements
- **Node.js >= 20.19**: Requirement met (v25.1.0 installed)

### Performance
- Local images improve load time (no redirects to external CDN)
- Build optimized with Vite 7.2.2 (2.64s, 0 warnings)

## [1.3.0] - 2025-11-17

### Added
- CSP meta tag (Content Security Policy) in index.html for protection against malicious scripts
- Exhaustive sanitization of all dangerous characters in validations

### Changed
- UI/UX polish on landing page for better user experience
- Updated package.json and NPM dependencies (0 vulnerabilities)
- Improved escape function in `src/utils/validation.js` with more complete sanitization
- Updated `SECURITY_MIGRATION.md` with extended documentation of security improvements

### Security
- **COMPLETE AUDIT**: All NPM dependencies audited and updated
- **0 VULNERABILITIES**: No vulnerabilities detected in dependencies
- **CSP Implemented**: Content Security Policy active to prevent XSS
- **XSS Sanitization**: Complete escape of dangerous characters: `< > " ' & / \ =`
- Improved protection against script injection in user inputs

### Documentation
- Expanded `SECURITY_MIGRATION.md` with details of implemented improvements

## [1.2.0] - 2024-11-16

### Added
- Centralized authentication utilities in `src/utils/secureAuth.js`
- Automatic migration system from localStorage to sessionStorage
- Complete migration documentation to httpOnly cookies in `SECURITY_MIGRATION.md`
- Authentication management functions: `getAuthToken()`, `setAuthToken()`, `getUserData()`, `setUserData()`, `clearAuthData()`
- Token expiration validation with 30-second buffer for clock skew

### Changed
- **BREAKING**: Migrated JWT storage from localStorage to sessionStorage
- Updated all components and pages to use `secureAuth` utilities
- Centralized authentication logic for better maintainability
- Improved token validation with `exp` claim verification

### Security
- **IMPORTANT**: Reduced XSS vulnerability impact through sessionStorage use
- SessionStorage automatically clears when closing tab/window
- Tab-scoped isolated storage for better security
- Tokens no longer persist between browser sessions
- Documented complete migration path to httpOnly cookies for maximum security

### Migration Notes
- Existing users are automatically migrated from localStorage to sessionStorage
- Re-authentication required after update (old localStorage sessions are cleared)
- See `SECURITY_MIGRATION.md` for httpOnly cookies implementation plan

## [1.1.0] - 2024-11-16

### Added
- Toast notification system with react-hot-toast for real-time feedback
- PasswordStrengthIndicator component with visual bar of 4 strength levels
- Reusable PasswordInput component with show/hide password toggle
- Modern SVG icons with Lucide React integrated throughout the application
- Entry animations and transitions with Framer Motion on all key pages
- Badge system in user profile (Verified Email, Active Account, Registered Handicap)
- Statistics cards with gradients in Dashboard (Tournaments, Handicap, Profile Status)
- "Back to Home" link on Login and Register pages
- Real-time visual validation in authentication forms

### Changed
- Complete Dashboard redesign with modern visual cards and subtle gradients
- Improved Profile design with header card, dynamic badges and better visual hierarchy
- Updated Tailwind color system with full 50-900 shades (golf green, gold, navy)
- Improved Login and Register pages with better UX, visual validations and animations
- Translated all interface texts to Spanish in authentication flows
- Optimized action buttons with Lucide icons and smooth hover effects
- Reorganized "Quick Actions" in Dashboard with horizontal layout and better icons
- Aligned all form elements (inputs, buttons, links) for visual consistency
- Improved responsiveness on mobile devices and tablets

### Fixed
- Fixed toast.warning to custom toast with warning icon in Login
- Solved link alignment issue in authentication forms
- Fixed "Create Account" button display to span full form width

### Security
- Added rate limiting with visual feedback in login form (5 attempts per 5 minutes)
- Implemented robust password strength validation with multiple criteria
- Improved centralized validation system with utility functions

## [1.0.0] - 2024-11-12

### Added
- Complete authentication system (Login, Register, Verify Email)
- User dashboard with profile information
- Profile page with display of personal data and handicap
- Handicap management system (manual and from RFEG)
- Full integration with FastAPI backend
- Protected routes system with ProtectedRoute component
- Form validations with error messages
- Reusable ProfileCard component
- EmailVerificationBanner for unverified users
- HTTP security headers in production
- Tailwind CSS configuration with custom theme
- Navigation system with React Router v6

### Security
- Implemented secure JWT token storage in localStorage
- Token validation in protected routes
- Secure logging system (safeLog) that only works in development
- Security headers configuration (X-Content-Type-Options, X-Frame-Options, etc.)
- Automatic removal of console.log in production builds

[Unreleased]: https://github.com/agustinEDev/RyderCupWeb/compare/v2.0.4...HEAD
[2.0.4]: https://github.com/agustinEDev/RyderCupWeb/compare/v2.0.0...v2.0.4
[2.0.0]: https://github.com/agustinEDev/RyderCupWeb/compare/v1.16.0...v2.0.0
[1.16.0]: https://github.com/agustinEDev/RyderCupWeb/compare/v1.15.0...v1.16.0
[1.15.0]: https://github.com/agustinEDev/RyderCupWeb/compare/v1.14.2...v1.15.0
[1.14.2]: https://github.com/agustinEDev/RyderCupWeb/compare/v1.14.1...v1.14.2
[1.14.1]: https://github.com/agustinEDev/RyderCupWeb/compare/v1.14.0...v1.14.1
[1.14.0]: https://github.com/agustinEDev/RyderCupWeb/compare/v1.6.0...v1.14.0
[1.6.0]: https://github.com/agustinEDev/RyderCupWeb/compare/v1.5.1...v1.6.0
[1.5.1]: https://github.com/agustinEDev/RyderCupWeb/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/agustinEDev/RyderCupWeb/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/agustinEDev/RyderCupWeb/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/agustinEDev/RyderCupWeb/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/agustinEDev/RyderCupWeb/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/agustinEDev/RyderCupWeb/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/agustinEDev/RyderCupWeb/releases/tag/v1.0.0