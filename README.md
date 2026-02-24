# 🏆 Ryder Cup Amateur Manager - Web Frontend

> Modern web application for managing amateur golf tournaments in Ryder Cup format

<div align="center">

[![Version](https://img.shields.io/badge/version-2.0.12-blue?style=for-the-badge&logo=semver)](.)  
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)](.)  
[![Vite](https://img.shields.io/badge/Vite-7.3-646CFF?style=for-the-badge&logo=vite&logoColor=white)](.)  
[![Tailwind](https://img.shields.io/badge/Tailwind-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](.)  

[![Tests](https://img.shields.io/badge/tests-1550%20passing-00C853?style=for-the-badge&logo=vitest&logoColor=white)](.)
[![Coverage](https://img.shields.io/badge/coverage-85%25+-success?style=for-the-badge&logo=codecov)](.)
[![OWASP](https://img.shields.io/badge/OWASP-9.2%2F10-4CAF50?style=for-the-badge&logo=owasp)](https://owasp.org/www-project-top-ten/)
[![Bundle](https://img.shields.io/badge/bundle-1308%20KB-blueviolet?style=for-the-badge&logo=webpack)](.)

[![Clean Architecture](https://img.shields.io/badge/architecture-Clean%20Architecture-blueviolet?style=for-the-badge)](.)
[![DDD](https://img.shields.io/badge/design-Domain%20Driven-orange?style=for-the-badge)](.)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-passing-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com/agustinEDev/RyderCupWeb/actions)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

</div>

---

## 🌟 Overview

**RyderCupWeb** is the frontend SPA for the Ryder Cup Amateur Manager platform. Built with **Clean Architecture** and **Domain-Driven Design**, it provides a complete tournament management experience: from creating competitions and scheduling rounds, to real-time scoring and live leaderboards.

### 🎯 Key Highlights

- ✅ **71 API integrations** with the backend REST API
- ✅ **1,550 tests** passing (100% success rate)
- ✅ **OWASP Top 10 Score: 9.2/10** - Production-grade security
- ✅ **Clean Architecture** - 4-layer separation with DDD patterns + Composition Root DI
- ✅ **22 Value Objects** enforcing domain invariants
- ✅ **64 Use Cases** covering all business operations
- ✅ **Bilingual** (English + Spanish) with 14 i18n namespaces
- ✅ **Bundle: 1,308 KB** (within 1,400 KB CI budget)
- ✅ **3 CI/CD workflows** - GitHub Actions pipeline

---

## 🌐 Backend API

This is the **web frontend**. For the backend REST API, visit:

👉 **[RyderCupAm Repository](https://github.com/agustinEDev/RyderCupAm)** - FastAPI + PostgreSQL + Clean Architecture (1,282 tests, OWASP 9.4/10)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Local Development

```bash
# Clone repository
git clone https://github.com/agustinEDev/RyderCupWeb.git
cd RyderCupWeb

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev

# Access application
open http://localhost:5173
```

**Environment Variables:**
```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_SENTRY_DSN=your-sentry-dsn
VITE_SENTRY_ENVIRONMENT=development
```

### Production Build

```bash
npm run build     # Production build
npm run preview   # Preview locally
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](CLAUDE.md) | Complete project context for AI development |
| [ROADMAP.md](ROADMAP.md) | Sprint planning (7 weeks, 5 sprints) |
| [CHANGELOG.md](CHANGELOG.md) | Detailed version history |
| [ADRs](docs/architecture/decisions/) | Architecture Decision Records (11 total) |
| [docs/presentation.md](docs/presentation.md) | Academic project presentation |
| [docs/INTEGRATION_TESTS.md](docs/INTEGRATION_TESTS.md) | Integration tests guide |
| [docs/BRANCH_PROTECTION.md](docs/BRANCH_PROTECTION.md) | Branch protection rules |

---

## 🛠️ Tech Stack

<div align="center">

| Category | Technologies |
|----------|-------------|
| **Framework** | React 19 |
| **Build Tool** | Vite 7.3 |
| **Styling** | Tailwind CSS 4 |
| **Routing** | React Router 7 |
| **State (Global)** | Zustand 4 |
| **State (Server)** | Fetch API + custom hooks |
| **Validation** | Zod |
| **Drag & Drop** | @dnd-kit |
| **i18n** | react-i18next 16 (EN + ES) |
| **Monitoring** | Sentry 10 |
| **Testing** | Vitest 4 + Playwright |
| **Linting** | ESLint 9 |

</div>

---

## ✨ Features

### User Management
- ✅ Registration with email verification
- ✅ JWT authentication (httpOnly cookies)
- ✅ Profile management (personal info + security)
- ✅ Handicap system (manual + RFEG integration for Spanish players)
- ✅ Password reset with secure tokens
- ✅ Device fingerprinting with remote revocation
- ✅ Multi-tab logout via Broadcast Channel API

### Role-Based Access Control
- ✅ **RBAC Foundation (v2.0.0)**: Simplified three-tier role system (ADMIN, CREATOR, PLAYER)
- ✅ `RoleGuard` HOC for route protection
- ✅ Per-competition role resolution via `useUserRoles(competitionId)` hook
- ✅ Role badges with color coding (Purple: Admin, Blue: Creator, Green: Player)

### Tournament Management
- ✅ Create and configure competitions with custom team names
- ✅ Enrollment flow with tee category selection (5 categories)
- ✅ Competition state machine: DRAFT → ACTIVE → IN_PROGRESS → COMPLETED
- ✅ **Competition ↔ GolfCourse M2M** (v2.0.2) - Multi-course tournaments

### Schedule & Matches (Sprint 2)
- ✅ Create rounds with configurable formats (Singles, Fourball, Foursomes)
- ✅ Session-based scheduling (MORNING / AFTERNOON / EVENING)
- ✅ Automatic and manual team assignment with drag & drop (@dnd-kit)
- ✅ Match generation with WHS handicap calculations
- ✅ Walkover declaration with reason tracking
- ✅ Player reassignment between matches

### Golf Course Management
- ✅ Full CRUD with admin approval workflow (request → approve/reject)
- ✅ Tee categories: Championship, Amateur, Senior, Forward, Junior
- ✅ 18-hole validation with stroke index and par constraints
- ✅ Clone-based update system for approved courses

### What's New

**v2.0.12 (Sprint 4 - Live Scoring - Feb 2026)**
- ✅ **Live Scoring UI**: Hole-by-hole annotation with 3-tab interface (Input, Scorecard, Leaderboard)
- ✅ **Marker System**: Reciprocal markers (singles) + distributed markers (team formats)
- ✅ **Score Validation**: Visual indicators for match/mismatch/pending states
- ✅ **Independent Scorecard Submission**: Own and marker scores lock independently
- ✅ **Match Concede**: Early end modal with concession tracking
- ✅ **Offline Support**: Queue scores when offline, auto-sync on reconnect
- ✅ **Session Lock**: User-scoped multi-device conflict prevention
- ✅ **Dashboard Pending Actions**: Card showing pending invitations, enrollment requests, upcoming matches
- ✅ **Invitation Auto-redirect**: Navigate to competition after accepting invitation
- ✅ **User Search Invitations**: Search registered users by name/email for invitations

**v2.0.11 (Sprint 3 - Invitations - Feb 2026)**
- ✅ **Invitation System**: Email invitations with secure tokens
- ✅ **Invitation Management**: CRUD operations for creators
- ✅ **Response Flow**: Accept/decline with automated enrollment

**v2.0.6 (Sprint 2 - Schedule & Matches - Feb 8, 2026)**
- ✅ **Schedule Management**: Round CRUD, match generation, team assignment
- ✅ **Enrollment Tee Category**: 5-category tee selection during enrollment
- ✅ **i18n Toast Migration**: All messages use translation keys
- ✅ **Bundle Optimization**: CDN flags replacing 239 KB SVG bundle

**v2.0.4 (Feb 3, 2026)**
- ✅ **Subdomain Architecture**: Cloudflare configuration for `www` + `api` subdomains

---

## 🏗️ Architecture

### Clean Architecture + DDD

```
src/
├── domain/              # Entities, VOs, Repository Interfaces
│   ├── entities/        #   8 domain entities
│   ├── value_objects/   #  22 value objects
│   └── repositories/    #   Repository interfaces (ports)
├── application/         # Use Cases (64 total)
│   └── use_cases/       #   7 domain areas
├── infrastructure/      # API Repos, Mappers (ACL)
│   ├── repositories/    #  12 API repositories (adapters)
│   └── mappers/         #   Anti-corruption layer
├── pages/               # 20 route pages
│   ├── admin/           #   Users, golf course approval
│   ├── creator/         #   Schedule, invitations management
│   └── public/          #   Leaderboard, Pricing, Contact, Terms, Privacy, Cookies
├── components/          # 48 reusable components
├── hooks/               # Custom React hooks
├── store/               # Zustand stores (auth, competition)
├── composition/         # Dependency injection (Composition Root)
├── i18n/                # 14 namespaces × 2 languages
└── utils/               # Sentry, validation, token refresh
```

**Composition Root** (`src/composition/index.js`) wires all dependencies at startup, keeping layers fully decoupled.

### Design Patterns
- **Repository** - Data access abstraction (domain interfaces → infrastructure implementations)
- **Anti-Corruption Layer (ACL)** - Mappers translating snake_case API → camelCase domain
- **Value Objects** - Encapsulated validation logic (21 VOs)
- **Composition Root** - DI container wiring all layers
- **Use Cases** - Single responsibility per business operation
- **Guard Components** - `RoleGuard`, `ProtectedRoute` for access control

### Key Principles
- **SOLID** compliance
- **Dependency Inversion** - Domain never imports Infrastructure
- **Testability** - 85%+ coverage on business logic
- **Immutability** - Value Objects are immutable
- **Separation of Concerns** - 4 strict layers

### Codebase Metrics

| Metric | Value |
|--------|-------|
| Source files | 328 |
| Lines of code | ~50,000 |
| Test files | 130 |
| Domain entities | 8 |
| Value objects | 22 |
| Use cases | 64 |
| API repositories | 12 |
| Components | 48 |
| Pages | 20 |

---

## 🧪 Testing

### Test Statistics (v2.0.12)

| Category | Tests | Status | Coverage |
|----------|-------|--------|----------|
| **Total** | **1,550** | ✅ 100% passing | 85%+ |
| Domain | ~424 | ✅ 100% | Entity invariants, VO validation |
| Application | ~434 | ✅ 100% | Use case orchestration |
| Infrastructure | ~261 | ✅ 100% | Mapper transformations |
| Hooks/Utils | ~196 | ✅ 100% | Custom hooks, utilities |
| Components/Pages | ~235 | ✅ 100% | UI components, integration |

### Quality Gates

| Gate | Threshold | Current |
|------|-----------|---------|
| Tests | 100% pass | 1,550/1,550 |
| Branch coverage | >= 70% | Achieved |
| Bundle size | <= 1,400 KB | 1,308 KB |
| ESLint errors | 0 | 0 |

**Test Types**:
- Unit tests (domain + application logic)
- Infrastructure tests (mapper transformations)
- Hook tests (custom React hooks)
- E2E tests (full user flows with Playwright)

---

## 🔐 Security

### OWASP Top 10 2021 Score: 9.2/10 ⭐

<div align="center">

| Feature | Implementation |
|---------|---------------|
| **Authentication** | httpOnly cookies (access 15min + refresh 7 days) |
| **Token Management** | Automatic refresh with 401 interceptor |
| **Input Validation** | 3-layer: HTML constraints + Zod + Backend Pydantic |
| **Session Security** | Multi-tab logout via Broadcast Channel API |
| **Device Control** | Fingerprinting with remote revocation |
| **Asset Integrity** | SRI (Subresource Integrity) |
| **Monitoring** | Sentry error tracking + session replay |
| **Password Policy** | 12-128 chars, uppercase + lowercase + numbers |

</div>

**Security Features Timeline**:
- **v1.8.0**: httpOnly cookies, session timeout, Broadcast Channel logout
- **v1.11.0**: Password reset system with secure tokens
- **v1.13.0**: Device fingerprinting with remote revocation
- **v2.0.4**: SRI (Subresource Integrity) for production assets

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows

3 workflows executed on every push:

| Workflow | Description |
|----------|-------------|
| **`ci-cd.yml`** | Main pipeline: lint, tests, coverage, build, bundle budget |
| **`security.yml`** | npm audit, TruffleHog, license compliance |
| **`pr-checks.yml`** | PR size validation, conventional commits |

**Branch Protection**:
- All CI checks must pass before merge
- GPG-signed commits required on `main` and `develop`
- Minimum 1 approving review for PRs
- No force push or deletion on `main`

---

## 🌍 Internationalization

**14 namespaces** with full English + Spanish coverage:

`auth` | `common` | `competitions` | `contact` | `dashboard` | `devices` | `golfCourses` | `invitations` | `landing` | `legal` | `pricing` | `profile` | `schedule` | `scoring`

- ✅ Automatic browser language detection
- ✅ localStorage persistence
- ✅ Language switcher with country flags
- ✅ Pluralization support (`_one`/`_other`)
- ✅ Cross-namespace access in modals

**Adding a language:** Create `locales/fr/*.json` + import in `i18n/config.js`

---

## 📡 API Integration

This frontend consumes **71 REST API endpoints** organized across 15 domain areas:

| Domain | Endpoints | Description |
|--------|-----------|-------------|
| Authentication | 11 | Register, login, tokens, password reset, account unlock |
| Users | 5 | Profile, security, role queries, user search |
| Devices | 2 | Fingerprinting, remote revocation |
| Handicaps | 3 | Manual + RFEG integration |
| Competitions | 10 | CRUD + state machine transitions |
| Competition-GolfCourse | 4 | Add/remove/reorder courses in competition |
| Enrollments | 8 | Request, approve, reject, withdraw |
| Golf Courses | 10 | CRUD + admin approval workflow |
| Schedule & Rounds | 4 | Round CRUD, schedule queries |
| Matches | 4 | Status, walkover, player reassignment |
| Teams & Generation | 3 | Team assignment, match generation |
| Invitations | 5 | Send, list, respond to invitations |
| Scoring | 5 | Scoring view, hole scores, scorecard, leaderboard, concede |
| Countries | 2 | Country list, adjacent countries |
| Support | 1 | Public contact form (`POST /api/v1/support/contact`) |

---

## 💻 Development

```bash
npm install              # Install dependencies
npm run dev              # Dev server (http://localhost:5173)
npm run build            # Production build
npm test                 # Unit tests (Vitest)
npm test -- --coverage   # Coverage report
npm run test:e2e         # E2E tests (Playwright)
npm run lint             # ESLint
```

### Conventions

- **Commits**: `<type>(<scope>): <UPPERCASE subject>` ([Conventional Commits](https://www.conventionalcommits.org/))
- **Branches**: GitFlow (`main`, `develop`, `feature/*`, `release/*`, `hotfix/*`)
- **GPG signing**: Required on `main` and `develop`

---

## 📊 Project Roadmap

### Current Version: v2.0.12 (Sprint 4 - Live Scoring)

**Latest Features** (Sprint 4 - Feb 2026):
- **Live Scoring System**: Hole-by-hole annotation with marker validation
- **Score Input UI**: 3-tab interface (Input, Scorecard, Leaderboard)
- **Independent Scorecard Submission**: Partial locking (own vs marker scores)
- **Match Concede Flow**: Early end with concession tracking
- **Offline Support**: Queue scores when offline, auto-sync on reconnect
- **Session Management**: User-scoped multi-device conflict prevention
- **Dashboard Pending Actions**: Actionable items card (invitations, enrollments, matches)
- **User Search Invitations**: Tabbed modal with user search + email invite
- **Total: 1,550 tests** passing - **Bundle: 1,308 KB**

### Sprint History

**Sprint Breakdown**:
1. ✅ **Sprint 1** (Jan 27-31): Golf Courses + RBAC
2. ✅ **Sprint 2** (Feb 3-8): Schedule & Matches + Enrollment
3. ✅ **Sprint 3** (Feb 2026): Invitations System
4. ✅ **Sprint 4** (Feb 2026): Live Scoring (COMPLETE)
5. 🔄 **Sprint 5** (Mar 2026): Public Leaderboards

See [ROADMAP.md](ROADMAP.md) for complete version planning.

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Code Standards
- Follow **Clean Architecture** and **DDD** principles
- Write **tests** for all new features (>85% coverage)
- Use **Zod** for input validation
- Follow **ESLint** rules (enforced in CI)
- All user-facing strings must use **i18n** keys

### Pull Request Process
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes with GPG signature: `git commit -S -m "feat: ADD amazing feature"`
4. Write/update tests: `npm test`
5. Push branch: `git push origin feature/amazing-feature`
6. Open Pull Request with description

---

## 📄 License

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author & Contact

**Agustin Estevez Dominguez**
- GitHub: [@agustinEDev](https://github.com/agustinEDev)
- Repository: [RyderCupWeb](https://github.com/agustinEDev/RyderCupWeb)
- Issues: [Report a bug](https://github.com/agustinEDev/RyderCupWeb/issues)

---

## 🙏 Acknowledgments

- **React** - Modern UI library for building user interfaces
- **Vite** - Next generation frontend build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - Lightweight state management
- **R&A** - Official Rules of Golf
- **USGA** - World Handicap System (WHS)

---

<div align="center">

### ⭐ Star this repository if you find it useful!


</div>
