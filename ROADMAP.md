# 🗺️ Roadmap - RyderCupFriends Frontend

> **Version:** 1.15.0 → 1.16.0 → 2.0.0 → 2.0.4 → 2.0.5 → 2.0.6 → 2.0.9 → 2.0.10 → 2.0.11 → 2.0.12 (synchronized with backend)
> **Last Update:** Feb 24, 2026
> **Status:** ✅ v2.0.0 Sprint 1 Completed | ✅ v2.0.4 Sprint 2 + Infra Completed | ✅ v2.0.5 Hotfix UI | ✅ v2.0.6 Sprint 2 Schedule COMPLETED | ✅ v2.0.9 Clean Architecture | ✅ v2.0.10 Manual Pairings | ✅ v2.0.11 Sprint 3 Invitations | ✅ v2.0.12 Sprint 4 Live Scoring COMPLETE
> **Stack:** React 19 + Vite 7.3 + Tailwind CSS 4 + ESLint 9
> **Architecture:** Subdomain (www + api) with Cloudflare Proxy (ADR-011)

---

## 🎯 Roadmap v2.0.0 - Frontend & Backend Synchronization

> **Goal:** Transform basic tournament management into a complete planning, scoring and real-time leaderboard system.
> **Duration:** 7 weeks (Jan 27, 2026 - Mar 17, 2026)
> **Status:** 🟢 **100% Synchronized with Backend v2.0.0**
> **Compatible Backend:** FastAPI v2.0.0 (RyderCupAm)

---

### 📝 Backend Synchronization Summary (v2.0.0)

After reviewing the backend prompt, we have updated our plan to reflect total synchronization.

- **Endpoints:** Confirmed **30 endpoints** (26 original + 4 new).
- **Tests:** Accepted backend estimation of **75+ tests**, focused on pragmatic coverage.
- **Sprints:** Adopted **5 sprints** structure with identical dates and sync points.
- **DTOs and Validation:** Pydantic backend schemas will be used as **source of truth**.
- **Domain Logic:** Confirmed 3 `Domain Services` that will drive the UI (Handicaps, Scoring, Leaderboards).
- **RBAC Foundation v2.0.0 (Backend):**
    - ✅ Endpoint `GET /api/v1/users/me/roles/{competition_id}` implemented.
    - ✅ Authorization helpers implemented.
- **Handoff Protocol:** Accepted weekly delivery process.

---

### 🔑 Simplified RBAC Frontend Implementation

With RBAC Foundation v2.0.0 implemented in the backend, frontend work is greatly simplified. It is **no longer necessary** to implement a complex role system, but rather consume the provided endpoint to adapt the UX.

#### 📝 Simplified Frontend Tasks:

1.  **Create `useUserRoles(competitionId)` hook:**
    *   This custom hook will consume the endpoint `GET /api/v1/users/me/roles/{competition_id}`.
    *   Will return role state (`isAdmin`, `isCreator`, `isPlayer`) and `loading` state.
2.  **Implement `<RoleBasedAccess>` component:**
    *   A wrapper component that will use `useUserRoles` to conditionally render its `children` based on required roles.
3.  **Add conditionals in buttons/views:**
    *   Use the `useUserRoles` hook directly in components or `<RoleBasedAccess>` props to control visibility of UI elements (buttons, sections, navigation).

#### 💡 Implementation Example (Frontend):

```javascript
// Hook example (src/hooks/useUserRoles.js)
import { useQuery } from '@tanstack/react-query';
import { fetchUserRoles } from '../infrastructure/repositories/userRepository'; // Assuming a fetch function

export const useUserRoles = (competitionId) => {
  const { data, isLoading, error } = useQuery(
    ['userRoles', competitionId],
    () => fetchUserRoles(competitionId),
    {
      enabled: !!competitionId, // Only execute if we have competitionId
    }
  );

  return {
    isAdmin: data?.is_admin || false,
    isCreator: data?.is_creator || false,
    isPlayer: data?.is_player || false,
    isLoading,
    error,
  };
};

// Component usage example
import { useUserRoles } from '../../hooks/useUserRoles';
import { Button } from '../../components/ui/Button'; // Assuming a Button component

const CompetitionActions = ({ competitionId }) => {
  const { isAdmin, isCreator, isLoading } = useUserRoles(competitionId);

  if (isLoading) {
    return <p>Loading roles...</p>;
  }

  return (
    <div>
      {(isCreator || isAdmin) && (
        <Button onClick={() => console.log('Edit Competition')}>
          Edit Competition
        </Button>
      )}
      {(isCreator || isAdmin) && (
        <Button onClick={() => console.log('Manage Enrollments')}>
          Manage Enrollments
        </Button>
      )}
      {/* ... other buttons with role logic ... */}
    </div>
  );
};
```

#### ⚠️ Important Notes:

*   **DO NOT implement authorization in frontend:** Frontend only handles improving user experience (UX) by showing or hiding elements.
*   **Real authorization is validated in backend:** Every sensitive operation must be validated by backend, which is the only source of truth for permissions.
*   **The endpoint is for UX only:** The `GET /api/v1/users/me/roles/{competition_id}` is used exclusively to adapt the user interface, not to apply security rules.

---

### 📅 Sprint Breakdown (Synchronized with Backend)

> **Dates:** Jan 27, 2026 - Mar 17, 2026
> **Team:** 1 Frontend Dev + 1 Backend Dev (parallel)

| Sprint   | Dates           | BE Effort | Endpoints | Sync Point        | Status        | Version  |
|----------|-----------------|-----------|-----------|-------------------|---------------|---------|
| Sprint 1 | Jan 27 - Feb 6  | 60h       | 10        | ✅ Friday Jan 30 | ✅ COMPLETED | v2.0.0   |
| Sprint 2 | Feb 3 - Feb 17  | 70h       | 11        | ✅ Friday Feb 4  | ✅ COMPLETED  | v2.0.10  |
| Sprint 3 | Feb 18 - Feb 24 | 48h       | 5         | ✅ Friday Feb 20 | ✅ COMPLETED  | v2.0.11  |
| Sprint 4 | Feb 25 - Mar 10 | 92h       | 5         | ✅ Friday Mar 6  | ✅ COMPLETED | v2.0.12  |
| Sprint 5 | Mar 11 - Mar 17 | 60h       | 2         | ✅ Friday Mar 13 | ✅ ABSORBED into Sprint 4  | v2.0.13  |
| **TOTAL**| **7 weeks**     | **330h**  | **31**    |                   |               |          |

---

### 🔄 Sprint Handoff Plan (Frontend/Backend)

| Sprint   | Backend Delivers                                                                                                         | Frontend Consumes                                                                              | Sync Point     | Status |
|----------|-------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|----------------|--------|
| Sprint 1 | ✅ `POST /admin/golf-courses`<br>✅ `PUT /admin/golf-courses/{id}/approve`<br>✅ `PUT /admin/golf-courses/{id}/reject`<br>✅ `GET /admin/golf-courses/pending`<br>✅ `PUT /admin/golf-courses/{id}/approve-update`<br>✅ `PUT /admin/golf-courses/{id}/reject-update`<br>✅ `PUT /golf-courses/{id}` (smart workflow)<br>✅ `GET /golf-courses`<br>✅ `GET /golf-courses/{id}`<br>✅ `POST /golf-courses/request` | ✅ `/admin/golf-courses` page (complete CRUD)<br>✅ `/admin/golf-courses/pending` page (2 tabs)<br>✅ GolfCourseForm component (400+ lines)<br>✅ GolfCourseTable component<br>✅ TeeCategoryBadge component<br>✅ 116 tests (100% passing)<br>✅ i18n EN/ES (300+ translations)<br>✅ Navigation links (admin only) | ✅ Jan 31, 2026 | ✅ **COMPLETED** |

| Sprint 2 | ✅ `GET /competitions/{id}/schedule`<br>✅ `POST /competitions/{id}/schedule/configure`<br>✅ `POST /competitions/{id}/teams`<br>✅ `POST /competitions/{id}/rounds`<br>✅ `PUT /rounds/{id}`<br>✅ `DELETE /rounds/{id}`<br>✅ `POST /rounds/{id}/matches/generate`<br>✅ `GET /matches/{id}`<br>✅ `PUT /matches/{id}/status`<br>✅ `POST /matches/{id}/walkover`<br>✅ `PUT /matches/{id}/players` | ✅ Backend Integration Layer (11 endpoints)<br>✅ Domain Layer (6 VOs + 3 Entities)<br>✅ Infrastructure (Mapper + Repository)<br>✅ 11 Use Cases + Composition Root<br>✅ i18n (EN/ES schedule namespace)<br>✅ UI: Schedule page + Round/Match cards<br>✅ UI: Manual pairings modal<br>✅ UI: Match detail modal<br>✅ UI: Manual status control<br>✅ Clean Architecture remediation | Feb 17, 2026 | ✅ **COMPLETED** |
| Sprint 3 | `POST /competitions/{id}/invitations`<br>`POST /competitions/{id}/invitations/by-email`<br>`GET /invitations/me`<br>`POST /invitations/{id}/respond`<br>`GET /competitions/{id}/invitations` | ✅ Backend API contract (`docs/INVITATIONS_API_CONTRACT.md`)<br>✅ Domain layer (InvitationStatus VO, Invitation entity, IInvitationRepository)<br>✅ Infrastructure (InvitationMapper, ApiInvitationRepository)<br>✅ 5 use cases + InvitationAssembler<br>✅ i18n (EN/ES invitations namespace)<br>✅ UI: InvitationBadge, InvitationCard, SendInvitationModal<br>✅ Creator InvitationsPage + Player MyInvitationsPage<br>✅ Navigation integration (HeaderAuth + CompetitionDetail)<br>✅ 95 new tests (1249 total) | Friday Feb 21 | ✅ Frontend ready, backend pending |
| Sprint 4 | ✅ `GET /matches/{id}/scoring-view`<br>✅ `POST /matches/{id}/scores/holes/{hole_number}`<br>✅ `POST /matches/{id}/scorecard/submit`<br>✅ `GET /competitions/{id}/leaderboard`<br>✅ `PUT /matches/{id}/status` (concede action) | ✅ Backend API contract (`docs/SCORING_API_CONTRACT.md`)<br>✅ Domain layer (HoleScore VO, IScoringRepository, IUserRepository)<br>✅ Infrastructure (ScoringMapper, ApiScoringRepository, ApiUserRepository)<br>✅ 6 use cases + Composition Root DI<br>✅ i18n (EN/ES scoring + dashboard + invitations)<br>✅ UI: 16 scoring/dashboard components<br>✅ ScoringPage (3 tabs) + LeaderboardPage (public)<br>✅ PendingActionsCard + auto-redirect on accept<br>✅ useScoring hook + offline queue + session lock<br>✅ 2 rounds of bugfixes (team names, locking, score format)<br>✅ 301 new tests (1550 total) | Friday Mar 7 | ✅ Frontend + backend complete |
| Sprint 5 | _(leaderboard endpoint already delivered in Sprint 4)_                                                                    | ✅ Public leaderboard (polling 30s)<br>✅ Reverse status transitions<br>✅ UpcomingMatchesPage<br>✅ Walkover in leaderboard<br>✅ Admin links in dropdown | Friday Mar 14 | ✅ **ABSORBED into v2.0.13** |

_⭐ = New endpoints added by backend._

---

### ✅ Sprint 1: Golf Course Management System (COMPLETED)

> **Status:** ✅ Completed on Jan 31, 2026
> **Frontend Effort:** ~50h
> **Tests:** 116 tests (100% passing)

#### 🎯 Achieved Goals

1. **Complete Golf Course Management System**
   - Complete CRUD with Clean Architecture + DDD
   - Approval workflow with clone system
   - 2 admin pages (CRUD + Approvals)
   - 3 reusable components
   - 8 implemented use cases

2. **Architecture**
   - Domain Layer: 2 value objects (Tee, Hole) + 1 entity (GolfCourse)
   - Application Layer: 8 use cases with validations
   - Infrastructure Layer: ApiGolfCourseRepository (10 endpoints)
   - Presentation Layer: Pages + Components + complete i18n

3. **Testing & Quality**
   - 116 unit tests (100% passing)
   - Coverage: Domain (77 tests), Application (39 tests)
   - Complete workflow tests (new request, update proposal, rejection)

4. **UX/UI**
   - Complex form: 18 holes + 2-6 tees
   - WHS validations (World Handicap System)
   - Country dropdown with flags
   - Real-time validations (totalPar 66-76, unique stroke indices)
   - Tabs to separate "New Requests" and "Update Proposals"
   - Rejection modal with auditable reason

5. **Internationalization**
   - 300+ translations (ES/EN)
   - Complete `golfCourses` namespace
   - Translated country names

#### 📊 Sprint Statistics

- **Created files:** 30+
- **Lines of code:** ~3,500
- **Components:** 3
- **Pages:** 2
- **Use Cases:** 8
- **Tests:** 116
- **Translations:** 300+
- **Value Objects:** 2
- **Entities:** 1
- **Repositories:** 1 interface + 1 implementation

#### 🚀 Deliverables

- ✅ `/admin/golf-courses` - List and management of approved courses
- ✅ `/admin/golf-courses/pending` - Approval/rejection of requests
- ✅ `GolfCourseForm` - Complex form with validations
- ✅ `GolfCourseTable` - Reusable table with role-based actions
- ✅ `TeeCategoryBadge` - Visual badges for tee categories
- ✅ Complete Clean Architecture (4 layers)
- ✅ 116 unit tests
- ✅ Complete i18n EN/ES
- ✅ Updated documentation (CHANGELOG.md + ROADMAP.md)

#### 🔗 Backend Integration

- ✅ Integration with 10 endpoints from backend v2.0.0
- ✅ Smart update workflow (admin in-place, creator clone)
- ✅ Domain ↔ API mapping (camelCase ↔ snake_case)
- ✅ Error handling with context
- ✅ Multi-layer validations (HTML → Zod → Backend Pydantic)

#### 🎨 UX Improvements

- Country dropdown with flags (replaces text input)
- Real-time totalPar calculation
- Stroke index uniqueness validation
- Tee category badges with colors
- Status badges (APPROVED/PENDING/REJECTED)
- Update pending indicators
- Role-based navigation links

#### 📝 Next Steps

- Sprint 2: Schedule & Match Management (Feb 7 - Feb 17)
- Implement drag-and-drop for round planning
- Match creation wizard
- Manual match status control

---

### 🏗️ v2.0.4 - Infrastructure + Security (Sprint 2)

> **Status:** ✅ Completed on Feb 3, 2026
> **Type:** Infrastructure hotfix
> **ADR:** ADR-011

#### 🎯 Goal

Migrate from reverse proxy architecture to direct subdomains to improve performance and reduce costs.

#### 🔧 Implemented Changes

| Before | After |
|--------|-------|
| `www.rydercupfriends.com/api/*` → Proxy → Backend | `api.rydercupfriends.com` → Direct backend |
| Latency: +50-100ms (proxy hop) | Latency: Direct |
| Cost: +$7/month (proxy service) | Cost: $0 |
| Cookies: Domain rewrite manual | Cookies: `.rydercupfriends.com` native |

#### ✅ Deliverables

- ✅ PR #114: Cookie domain rewrite fix
- ✅ PR #115: Upgrade http-proxy-middleware v3.0.3
- ✅ PR #116: Full subdomain migration
- ✅ ADR-011: Architecture documentation
- ✅ Cloudflare Page Rules configured
- ✅ Backend CORS updated

#### 📊 Impact

- **Performance:** -50-100ms latency
- **Cost:** -$7/month (33% reduction)
- **Reliability:** Eliminated single point of failure
- **Device Fingerprinting:** Real IPs via `CF-Connecting-IP`

---

### 🔄 v2.0.6 - Schedule & Matches Backend Integration Layer (Sprint 2)

> **Status:** ✅ Completed on Feb 8, 2026
> **Branch:** `feature/sprint-2-schedule-matches`
> **Frontend Effort:** ~50h (backend integration + UI)
> **Tests:** ~214 new tests (1088 total passing, 1 skipped)

#### 🎯 Goals

1. **Complete Backend Integration Layer** (11 endpoints from backend Sprint 2)
2. **Breaking change `play_mode`** (replaces `handicap_type`/`handicap_percentage`)
3. **UI Components** (pending): Schedule panel, Round cards, Match cards

#### ✅ Completed: Backend Integration Layer

1. **Breaking Change: `play_mode`**
   - `HandicapSettings` value object updated (SCRATCH/HANDICAP replaces SCRATCH/PERCENTAGE)
   - `CompetitionMapper` maps `play_mode` (with backwards-compatible fallback)
   - `CreateCompetition.jsx` form updated (removed percentage selector)
   - EN/ES translations updated

2. **Domain Layer (9 new files + tests)**
   - Value Objects: SessionType, MatchFormat, HandicapMode, RoundStatus, MatchStatus, AllowancePercentage
   - Entities: Round, Match, TeamAssignmentResult
   - Repository Interface: IScheduleRepository (11 methods)

3. **Infrastructure Layer (2 new files + tests)**
   - ScheduleMapper: Anti-corruption layer (snake_case API -> camelCase domain)
   - ApiScheduleRepository: REST implementation of 11 endpoints

4. **Application Layer (11 use cases + tests)**
   - GetSchedule, ConfigureSchedule, AssignTeams
   - CreateRound, UpdateRound, DeleteRound
   - GenerateMatches, GetMatchDetail, UpdateMatchStatus
   - DeclareWalkover, ReassignPlayers

5. **Composition Root + i18n**
   - DI container updated with 11 use cases
   - `schedule` namespace registered (EN/ES)

#### ✅ Completed: UI Components (Sprint 2)

- ✅ Complete Schedule page (`/creator/competitions/:id/schedule`)
- ✅ Read-only view for enrolled players (`/competitions/:id/schedule`)
- ✅ Round cards with expand/collapse
- ✅ Match cards with actions (start, complete, walkover, reassign)
- ✅ Match detail modal with formatted result (walkover/completed)
- ✅ Team assignment section
- ✅ Walkover modal with winning team + reason
- ✅ Reassign players modal
- ✅ Enrollment request modal with tee category selector
- ✅ "View Schedule" button for enrolled players in CompetitionDetail

#### ✅ Completed: v2.0.9 Clean Architecture Remediation

- ✅ ~57 violations fixed in 66 files
- ✅ Assemblers extracted to application layer
- ✅ State transitions via ICompetitionRepository
- ✅ Removed all direct fetch() in UI

#### ✅ Completed: v2.0.10 Manual Pairings UI

- ✅ GenerateMatchesModal with automatic/manual mode
- ✅ Bugfix: silent reloadSchedule error
- ✅ 24 new tests (1154 total)

#### 📊 Sprint 2 Statistics

- **Created files:** ~30
- **Modified files:** ~37
- **Value Objects:** 6 new
- **Entities:** 3 new
- **Use Cases:** 11 new
- **UI Components:** 8 new (schedule)
- **Tests:** ~214 new (1088 total passing, 1 skipped)
- **Bundle:** 1308 KB uncompressed build (-311 KB from peak of 1619 KB)

---

### ✅ v2.0.11 - Invitations System (Sprint 3)

> **Status:** ✅ Frontend complete, backend pending
> **Branch:** `feature/sprint-3-invitations`
> **Frontend Effort:** ~20h
> **Tests:** 95 new tests (1249 total passing, 1 skipped)

#### 🎯 Goals

1. **Email invitations system** for creators to invite players
2. **Player invitations page** to accept/reject invitations
3. **Auto-enrollment** when accepting invitation (approval bypass)
4. **API contract** for backend team to implement 5 endpoints

#### ✅ Completed: Frontend

1. **Backend API Contract**
   - `docs/INVITATIONS_API_CONTRACT.md` with 5 complete endpoints
   - Request/response shapes in snake_case
   - Error codes (400-422) and business rules
   - Invitation lifecycle, duplicates, expiration, auto-enrollment

2. **Domain Layer (5 files + tests)**
   - `InvitationStatus` value object: state machine (PENDING → ACCEPTED/DECLINED/EXPIRED)
   - `Invitation` entity: immutable with factory methods and accept/decline commands
   - `IInvitationRepository`: interface with 5 methods

3. **Infrastructure Layer (2 files + tests)**
   - `InvitationMapper`: snake_case API → domain (uses `_apiData` for join fields)
   - `ApiInvitationRepository`: 5 REST endpoints

4. **Application Layer (6 files + tests)**
   - `InvitationAssembler`: entity → DTO with computed fields
   - 5 use cases: SendInvitation, SendInvitationByEmail, ListMyInvitations, RespondToInvitation, ListCompetitionInvitations
   - Composition root updated with DI

5. **i18n + Shared Components**
   - Namespace `invitations` (EN/ES)
   - `InvitationBadge`: status badge with colors
   - `InvitationCard`: dual mode (player/creator) with expiration countdown
   - `SendInvitationModal`: Wrapper+Content pattern, email + personal message

6. **Pages + Navigation**
   - Creator InvitationsPage: `/creator/competitions/:id/invitations`
   - Player MyInvitationsPage: `/player/invitations`
   - "Invitations" button in CompetitionDetail (creators)
   - "My Invitations" link in HeaderAuth (desktop + mobile)

#### 📊 Sprint 3 Statistics

- **Created files:** 32
- **Modified files:** 9
- **Value Objects:** 1 new (InvitationStatus)
- **Entities:** 1 new (Invitation)
- **Use Cases:** 5 new
- **UI Components:** 3 new (InvitationBadge, InvitationCard, SendInvitationModal)
- **Pages:** 2 new (InvitationsPage, MyInvitationsPage)
- **Tests:** 95 new (1249 total passing, 1 skipped)
- **Bundle:** within budget (1400 KB max)

#### 📋 Pending: Backend

Backend team must implement the 5 endpoints defined in `docs/INVITATIONS_API_CONTRACT.md`:
1. `POST /api/v1/competitions/{id}/invitations` — Invite by user ID
2. `POST /api/v1/competitions/{id}/invitations/by-email` — Invite by email
3. `GET /api/v1/invitations/me` — Player's received invitations
4. `POST /api/v1/invitations/{id}/respond` — Accept/Reject
5. `GET /api/v1/competitions/{id}/invitations` — Sent invitations (creator)

---

### 🔄 v2.0.12 - Live Scoring System (Sprint 4)

> **Status:** ✅ Frontend complete, backend complete
> **Branch:** `feature/sprint-4-live-scoring`
> **Frontend Effort:** ~50h
> **Tests:** 301 new tests (1550 total passing, 1 skipped)

#### 🎯 Goals

1. **Real-time scoring system** with player/marker cross-validation
2. **3 scoring tabs** (Input, Scorecard, Leaderboard) in unified view
3. **Complete offline support** with localStorage queue and automatic synchronization
4. **Session lock** multi-device via BroadcastChannel
5. **Public leaderboard** with Ryder Cup points and 30s polling
6. **API contract** for backend team to implement 5 endpoints

#### ✅ Completed: Frontend

1. **Backend API Contract**
   - `docs/SCORING_API_CONTRACT.md` with 5 complete endpoints
   - Request/response shapes in snake_case
   - Business rules: cross-marking, dual validation, early finish, concession, Ryder Cup points

2. **Domain Layer (3 files + tests)**
   - `HoleScore` value object: range 1-9 + null (ball picked up)
   - `IScoringRepository`: interface with 5 methods

3. **Infrastructure Layer (2 files + tests)**
   - `ScoringMapper`: snake_case API → camelCase DTOs (3 methods)
   - `ApiScoringRepository`: 5 REST endpoints

4. **Application Layer (5 files + tests)**
   - 5 use cases: GetScoringView, SubmitHoleScore (validates with HoleScore VO), SubmitScorecard, GetLeaderboard, ConcedeMatch
   - Composition root updated with DI

5. **i18n + Hooks + Utilities**
   - Namespace `scoring` (complete EN/ES)
   - Dashboard `pendingActions` keys (EN/ES) with pluralization
   - Invitation search keys (EN/ES) for user search tabs
   - `useScoring` hook: central state, 10s polling, auto-save, offline queue, user-scoped session lock, independent scorecard submission
   - `scoringOfflineQueue`: localStorage queue for offline mode
   - `scoringSessionLock`: BroadcastChannel for multi-device lock with forceRelease

6. **UI Components (14 scoring + 2 enhancements)**
   - `HoleInput`: minus/plus buttons, own score + marked, visual validation, team names, independent locking
   - `HoleSelector`: 1-18 grid with state indicators
   - `ScorecardTable`: OUT/IN/Total table with all players, team names and color coding
   - `GolfFigure`: classic concentric SVG (eagle/birdie/par/bogey/double+)
   - `ValidationIcon`: validation icon (match/mismatch/pending)
   - `LeaderboardView`: Ryder Cup points, conceded match display, proper golf notation (X&Y)
   - `TeamStandingsHeader`: facing team points
   - `PreMatchInfo`: "You mark X, Y marks you"
   - `MatchSummaryCard`: final result + stats
   - 5 modals: EarlyEnd, ConcedeMatch, SubmitScorecard, OfflineBanner, SessionBlocked
   - `PendingActionsCard` (dashboard): pending invitations, enrollment requests (creators), upcoming matches
   - `SendInvitationModal` enhanced: tabbed interface with user search + email tabs

7. **Pages + Navigation**
   - `ScoringPage` (`/player/matches/:matchId/scoring`): 3 tabs, read-only spectators, team names, auto-submit par defaults
   - `LeaderboardPage` (`/competitions/:id/leaderboard`): public, 30s polling, context-aware back navigation
   - `Dashboard`: integrated PendingActionsCard for actionable items
   - `MyInvitationsPage`: auto-redirect to competition detail after accepting invitation
   - "Score" button in MatchCard for IN_PROGRESS matches
   - "Leaderboard" button in CompetitionDetail (accessible to all users)

8. **Bugfixes (2 rounds)**
   - Team names display instead of letter identifiers (HoleInput, EarlyEndModal, ScorecardTable)
   - Independent scorecard submission with partial locking (own vs marker scores)
   - Session lock orphan prevention with forceRelease + user-scoped locks
   - "AS" abbreviation replaced with "All Square" / "Empate"
   - Match score format corrected to Ryder Cup notation (X&Y instead of XUP)
   - Leaderboard made publicly accessible to all users
   - Conceded match display in leaderboard

#### 📊 Sprint 4 Statistics

- **Created files:** 60
- **Modified files:** 28
- **Value Objects:** 1 new (HoleScore)
- **Use Cases:** 6 new (5 scoring + SearchUsersUseCase)
- **UI Components:** 16 new/enhanced (14 scoring + PendingActionsCard + SendInvitationModal)
- **Pages:** 2 new (ScoringPage, LeaderboardPage) + 2 enhanced (Dashboard, MyInvitationsPage)
- **Hooks:** 1 new (useScoring)
- **Utilities:** 2 new (offlineQueue, sessionLock)
- **Tests:** 301 new (1550 total passing, 1 skipped)
- **Bundle:** 366.66 KB initial (within 1500 KB max budget)

#### ✅ Backend: Complete

All 5 scoring endpoints implemented and tested (2170 backend tests passing):
1. `GET /api/v1/competitions/matches/{id}/scoring-view` — Unified scoring view (3 tabs)
2. `POST /api/v1/competitions/matches/{id}/scores/holes/{hole_number}` — Submit hole score
3. `POST /api/v1/competitions/matches/{id}/scorecard/submit` — Submit final scorecard
4. `GET /api/v1/competitions/{id}/leaderboard` — Competition leaderboard
5. `PUT /api/v1/matches/{id}/status` (action `concede`) — Concede match

---

### ❓ Answers to Backend Team

Here are the confirmations and answers to your questions:

1.  **Additional Endpoints:**
    -   **Confirmation:** ✅ Yes, the **4 new endpoints** (`GET /golf-courses/{id}`, `GET /matches/{id}`, `PUT /matches/{id}/status`, `POST /matches/{id}/walkover`) cover all UX needs we had identified. We don't see need for more endpoints right now.

2.  **Testing Prioritization:**
    -   **Confirmation:** ✅ Agree with **75+ tests** estimation.
    -   **Critical Edge Cases:** We would like to ensure the following cases are covered:
        -   **Token Expiration:** What happens if a user's token expires mid-scoring operation? Does the UI handle it without data loss?
        -   **Entity Deletion:** Can a `match` with scores be deleted? Or a `round` with already played `matches`? We expect backend to prevent this with 409 (Conflict) error.

3.  **Pydantic Validations:**
    -   **Confirmation:** ✅ Validations seem aligned. We will use backend's `ROADMAP.md` DTOs as source of truth for our forms with `Zod`. Any discrepancies will be communicated during _Sync Points_.

4.  **Communication Channel:**
    -   **Preference:** ✅ **Slack**. It's the most agile channel for deployment notifications and `curl` examples.

5.  **WHS Formula:**
    -   **Confirmation:** ✅ The formula `PH = (Handicap Index × Slope Rating / 113) + (Course Rating - Par)` is **correct** according to WHS standard. We have validated it with online calculators and it's what we expect.

---

### ✅ Global Acceptance Criteria (v2.0.0)

1.  **Functionality:**
    -   ✅ Admin manages users and approves golf courses.
    -   ✅ Creator plans tournaments (rounds + matches) with drag & drop.
    -   ✅ Creator invites players by email or user ID.
    -   ✅ Player scores in real-time with dual validation.
    -   ✅ Public leaderboard updates every 30s (only if there are active matches).

2.  **Testing:**
    -   ✅ ≥85% test coverage (lines) in frontend.
    -   ✅ Backend maintains ≥85% test coverage in business logic.
    -   ✅ E2E tests cover complete flow.
    -   ✅ 0 tests failing in pipeline.

3.  **Performance:**
    -   ✅ Bundle size ≤1200 KB.
    -   ✅ Build time ≤6s.
    -   ✅ Polling optimized (only when necessary).

4.  **Security:**
    -   ✅ RoleGuard protects routes by role.
    -   ✅ 0 vulnerabilities (npm audit).
    -   ✅ OWASP Score ≥9.0/10.

5.  **Documentation:**
    -   ✅ ADRs updated (ADR-009, ADR-010).
    -   ✅ CHANGELOG.md with complete v2.0.0.
    -   ✅ `ROADMAP.md` synchronized between frontend and backend.
---

#### 🔄 Handoffs & Dependencies

| Sprint | Frontend Needs | Backend Delivers | Sync Point |
|--------|---------------|------------------|------------|
| Sprint 1 | Roles endpoints | `POST /admin/users/{id}/roles` | Friday week 1 |
| Sprint 2 | Schedule endpoints | `POST /competitions/{id}/rounds` | Friday week 3 |
| Sprint 3 | Invitations endpoints | `POST /invitations/{id}/respond` | Friday week 4 |
| Sprint 4 | Scoring endpoints | `GET /matches/{id}/scoring-view` | Friday week 6 |
| Sprint 5 | Leaderboard endpoints | `GET /competitions/{id}/leaderboard` | Friday week 7 |

**Communication:** Daily standups + cross PR reviews Frontend ↔ Backend

---

## ✅ Implementation History (Completed)

### 🎯 v1.16.0 - Major Dependencies Update (Sprints 1-4)

> **Status:** ✅ Completed (Jan 24, 2026)
> **Goal:** Modernize complete technology stack.

#### ✅ Sprint 4: Final Verification
- `@sentry/replay`: downgrade to **7.116.0** (peer dependency fix)
- Tests: 717 passed, 0 failed ✅
- Security: 0 vulnerabilities ✅
- Performance: Bundle 1318 KB (gzipped ~460 KB)
- UI Fixes: Modal overlay opacity, toast positioning, cursor-pointer

#### ✅ Sprint 3: Build Tools & Styling (Tailwind 4, ESLint 9)
- `tailwindcss`: v3.4.19 → **v4.1.18** (CSS-first)
- `eslint`: v8.55.0 → **v9.39.2** (Flat config)
- Complete configuration migration (`eslint.config.js`, `@theme` CSS)

#### ✅ Sprint 2: Monitoring & Routing (Sentry 10, React Router 7)
- `@sentry/react`: v7.120.4 → **v10.34.0**
- `react-router-dom`: v6.20.0 → **v7.12.0**
- Docker build fix (Sentry 10 supports React 19)

#### ✅ Sprint 1: React 19 Ecosystem
- `react` & `react-dom`: v18.2.0 → **v19.2.3**
- `@vitejs/plugin-react`: v4.7.0 → **v5.1.2**
- `prop-types` removed (incompatible with React 19)

---

### 🎯 v1.15.0 - Data Integrity Improvements (A08)

> **Status:** ✅ Completed (Jan 24, 2026)
> **Goal:** Improve OWASP A08 (Data Integrity) from 7.0/10 to 9.0/10

#### ✅ Implemented Tasks:
- ✅ **SRI (Subresource Integrity):**
  - Implemented `vite-plugin-sri` (SHA-384).
  - Critical assets protected with integrity hashes.
- ✅ **CI/CD Commit Verification:**
  - Job `commit-verification` in GitHub Actions.
  - GPG signature verification on each commit.
- ✅ **Package-Lock Validation:**
  - Integrity check in CI/CD.
  - Prevents dependency confusion attacks.
- ✅ **Dependencies Update:**
  - NPM: `framer-motion` (v12.27.0), `vite` (v7.3.1), `i18next` (v25.7.4), `react-i18next` (v16.5.2).
  - Actions: `snyk/actions/node` (v1.0.0), `trufflesecurity/trufflehog` (v3.92.5).

---

### 🎯 v1.14.0 - Device Fingerprinting Improvements

> **Status:** ✅ Completed (Jan 17, 2026)
> **Goal:** Resolve critical bugs and improve device fingerprinting system robustness

_... (Remains the same as previous version) ..._

---

## 📊 Current Status (v2.0.14 + security hotfixes)

### Key Metrics

- **Tests:** 1589 passing, 1 skipped, 0 failed ✅
- **Coverage:** ≥85% lines, ≥75% functions ✅
- **Bundle:** 1,432 KB total JS ✅ (budget: ≤1500 KB, warning: 1400 KB)
- **Build time:** ~6s ⚡
- **Security:** 0 vulnerabilities ✅
- **OWASP Score:** 9.2/10 ✅

### Completed (v2.x)
- ✅ Golf Course Management System (v2.0.0 - Sprint 1)
- ✅ Infrastructure Migration + Security (v2.0.4)
- ✅ Hotfix Golf Courses UI (v2.0.5)
- ✅ Schedule Backend Integration Layer + UI (v2.0.6 - Sprint 2)
- ✅ Clean Architecture Remediation (v2.0.9)
- ✅ Manual Pairings UI (v2.0.10)
- ✅ Invitations System (v2.0.11 - Sprint 3)
- ✅ Live Scoring + Sprint 5 enhancements (v2.0.13 - Sprint 4+5)
- ✅ Dependency consolidation (v2.0.14)
- ✅ Security hotfixes — Snyk false positives, npm audit, Vite CVE (post-v2.0.14)
- ✅ TeeCategory Value Object — domain refactor, 30 tests (refactor/tee-category-vo)

### Completed (v1.x)
- ✅ Modern Build Stack (v1.16.0)
- ✅ Data Integrity (SRI, Signed Commits) - **v1.15.0**
- ✅ Device Fingerprinting (Clean Arch) - **v1.14.0**
- ✅ Clean Architecture + DDD
- ✅ Authentication (httpOnly cookies, refresh tokens)
- ✅ Competitions CRUD + Enrollments
- ✅ Handicaps (Manual + RFEG)
- ✅ Password Reset Flow
- ✅ i18n (ES/EN, 12 namespaces)
- ✅ Sentry Monitoring
- ✅ CI/CD Pipeline (Quality Gates)
- ✅ Security Scanning (Snyk, TruffleHog)

---

## 🔐 OWASP Top 10 2021 Security

| Category | Score | Status | Priority |
|----------|-------|--------|----------|
| A01: Broken Access Control | 8.5/10 | ✅ Excellent | 🟢 Low |
| A02: Cryptographic Failures | 9.5/10 | ✅ Excellent | 🟢 Low |
| A03: Injection | 9.5/10 | ✅ Excellent | 🟢 Low |
| A04: Insecure Design | 8.5/10 | ✅ Excellent | 🟢 Low |
| A05: Security Misconfiguration | 10.0/10 | ✅ Perfect | 🟢 Low |
| A06: Vulnerable Components | 9.5/10 | ✅ Excellent | 🟢 Low |
| A07: Auth Failures | 9.0/10 | ✅ Excellent | 🟢 Low |
| A08: Data Integrity | 9.0/10 | ✅ Excellent | 🟢 Low |
| A09: Logging & Monitoring | 9.5/10 | ✅ Excellent | 🟢 Low |
| A10: SSRF | 9.0/10 | ✅ N/A | 🟢 Low |
| **TOTAL (Average)** | **9.2/10** | | |

---

## 🔗 Documentation

- **CHANGELOG.md** - Detailed change history
- **CLAUDE.md** - AI context (project instructions)
- **ADRs:** `docs/architecture/decisions/`
- **Backend:** Configure `BACKEND_PATH` variable with local backend repository path
- **API Docs:** `http://localhost:{BACKEND_PORT}/docs` (default port 8000)

---

**Last review:** Apr 7, 2026 (Sprints 4+5 completed — v2.0.14 + security hotfixes)
**Next review:** On next feature sprint definition