# 🏆 Ryder Cup Amateur Manager - Web Frontend

> Modern web application for managing amateur golf tournaments in Ryder Cup format

[![CI/CD Pipeline](https://github.com/agustinEDev/RyderCupWeb/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/agustinEDev/RyderCupWeb/actions/workflows/ci-cd.yml)
[![PR Checks](https://github.com/agustinEDev/RyderCupWeb/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/agustinEDev/RyderCupWeb/actions/workflows/pr-checks.yml)

[![React](https://img.shields.io/badge/React-19+-61DAFB?logo=react)](.)
[![Vite](https://img.shields.io/badge/Vite-7.3.1-646CFF?logo=vite)](.)
[![Tailwind](https://img.shields.io/badge/Tailwind-4+-38B2AC?logo=tailwind-css)](.)

**Version:** v2.0.5 (Sprint 2 Schedule en progreso)
**Stack:** React 19 + Vite 7.3 + Tailwind CSS 4 + ESLint 9

---

## 🚀 Tech Stack

- **Core:** React 19 + Vite 7.3 + Tailwind CSS 4 + ESLint 9
- **State:** Zustand v4 (global) + TanStack Query v5 (server)
- **Routing:** React Router v7
- **Validation:** Zod
- **i18n:** react-i18next (ES/EN)
- **Testing:** Vitest + Playwright
- **Monitoring:** Sentry 10 (Error tracking + Performance)

---

## 🚀 Quick Start

### 1. Installation

```bash
npm install
```

### 2. Environment Variables

```bash
# Copy example file
cp .env.example .env

# Edit .env and configure:
VITE_API_BASE_URL=http://localhost:8000
VITE_SENTRY_DSN=your-sentry-dsn
VITE_SENTRY_ENVIRONMENT=development
```

### 3. Development

```bash
npm run dev
# ➜ Local: http://localhost:5173
```

### 4. Build & Deploy

```bash
npm run build   # Generates dist/ folder
npm run preview # Preview production build
```

**Deploy:** Upload `dist/` to Netlify, Vercel, Cloudflare Pages, etc.

---

## 🔐 CI/CD & Quality Gates

### Continuous Integration Pipeline

| Check | Threshold | Status |
|-------|-----------|--------|
| Coverage (Lines) | ≥80% | ✅ |
| Coverage (Statements) | ≥80% | ✅ |
| Coverage (Functions) | ≥75% | ✅ |
| Coverage (Branches) | ≥70% | ✅ |
| Bundle Size | ≤1000 KB | ✅ |
| PR Size | ≤1000 changes | ✅ |
| Code Format | 100% Prettier | ✅ |
| Commit Format | Conventional | ✅ |
| GPG Signature | Required | ✅ |

**The CI fails automatically if thresholds are not met.**

### Active Workflows

1. **`.github/workflows/ci-cd.yml`** - Main pipeline
   - Lint + Prettier check
   - Unit tests with coverage enforcement
   - Build with bundle budget
   - Type checking
   - GPG commit signature verification

2. **`.github/workflows/security.yml`** - Security
   - npm audit (blocks critical/high)
   - Secret scanning (TruffleHog)
   - License compliance
   - Outdated dependencies check

3. **`.github/workflows/pr-checks.yml`** - PR quality
   - PR size validation
   - Conventional commits validation

### Branch Protection

The `main` branch is protected with:
- ✅ Requires PR and approval before merge
- ✅ All CI checks must pass
- ✅ No force push or deletion allowed

📋 See [`docs/BRANCH_PROTECTION.md`](docs/BRANCH_PROTECTION.md) for details.

---

## 🧪 Testing

### Unit Tests (Vitest)

```bash
npm test                    # Run all tests
npm test -- --coverage      # With coverage report
npm test -- --watch         # Watch mode
```

- **1066 tests** (domain, application, infrastructure layers)
- **Coverage:** ≥80% lines, ≥75% functions, ≥70% branches

### E2E Tests (Playwright)

```bash
npm run test:e2e           # All E2E tests
npm run test:e2e:ui        # Interactive UI mode
npm run test:security      # Security tests only (12 OWASP validations)
```

### Integration Tests

```bash
npm run test:integration   # Requires backend on localhost:8000
```

⚠️ **Test Credentials Configuration:**

```bash
# 1. Copy example file
cp .env.example .env

# 2. Configure test credentials (NOT personal)
TEST_EMAIL=test-user@example.com
TEST_PASSWORD=TestPassword123

# 3. Run tests
npm run test:integration
```

🔒 **Security:** NEVER use personal or production credentials for testing.

📋 See [`docs/INTEGRATION_TESTS.md`](docs/INTEGRATION_TESTS.md) for more details.

---

## 📝 Git Conventional Commits

This project uses [Conventional Commits](https://www.conventionalcommits.org/) with automatic validation.

**Required format:**
```
<type>(<scope>): <Subject starting with UPPERCASE>
```

**Correct examples:**
```bash
✅ fix(auth): Verify httpOnly cookies before redirect
✅ feat(competitions): Add team enrollment feature
✅ docs(readme): Update installation instructions

❌ fix(auth): verify httpOnly cookies  # Lowercase subject (CI fails)
```

**Validation:** `amannn/action-semantic-pull-request@v5` blocks PRs with incorrect format.

**Valid types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`, `revert`

---

## 🔐 Security Best Practices

### Environment Variables

**🚫 NEVER:**
- Hardcode credentials in code
- Commit `.env` files with sensitive data
- Use personal/production credentials for testing
- Share credentials in public channels

**✅ ALWAYS:**
- Use environment variables (`process.env.*`)
- Keep `.env` in `.gitignore`
- Use dedicated credentials per environment
- Rotate credentials regularly
- Validate variable presence with fail-fast

**Correct example:**

```javascript
// ✅ CORRECT: Validation with fail-fast
const getTestCredentials = () => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error('Missing TEST_EMAIL or TEST_PASSWORD');
  }

  return { email, password };
};

// ❌ INCORRECT: Hardcoded credentials
const credentials = {
  email: 'user@example.com',  // DON'T DO THIS!
  password: 'MyPassword123'   // DON'T DO THIS!
};
```

### Secrets Management in CI/CD

GitHub Actions → **Settings → Secrets and variables → Actions:**
- `TEST_EMAIL` - Test credential
- `TEST_PASSWORD` - Test credential

Secrets are automatically injected as environment variables in workflows.

---

## 🏗️ Project Structure

```
src/
├── domain/              # Entities, Value Objects, Repository Interfaces
│   ├── entities/        # Competition, GolfCourse, Round, Match, etc.
│   ├── value_objects/   # CompetitionStatus, MatchFormat, RoundStatus, etc.
│   └── repositories/    # ICompetitionRepository, IScheduleRepository, etc.
├── application/         # Use Cases (Clean Architecture)
│   └── use_cases/       # competition/, schedule/, enrollment/, golf_course/, etc.
├── infrastructure/      # API Repositories, Mappers
│   ├── repositories/    # ApiCompetitionRepository, ApiScheduleRepository, etc.
│   └── mappers/         # CompetitionMapper, ScheduleMapper, etc.
├── composition/         # Dependency Injection container
├── pages/              # Page components (routes)
│   ├── auth/           # Login, Register, VerifyEmail
│   ├── public/         # Landing, BrowseCompetitions
│   └── protected/      # Dashboard, Profile, Competitions
├── components/         # Reusable components
│   ├── layout/         # Header, Footer
│   ├── ui/             # Buttons, Inputs, Modals
│   └── errors/         # Error boundaries
├── hooks/              # Custom hooks
├── store/              # Zustand stores (auth, competition)
├── services/           # Centralized API (apiRequest with token refresh)
├── i18n/               # Internationalization (9 namespaces, EN/ES)
└── utils/              # Validation, Sentry, tokenRefresh
```

### Main Pages

**Public:**
- `/` - Landing
- `/login` - Login
- `/register` - Registration
- `/verify-email` - Email verification
- `/browse-competitions` - Browse public competitions

**Protected:**
- `/dashboard` - Main dashboard
- `/profile` - User profile
- `/profile/edit` - Edit profile
- `/profile/devices` - Device management
- `/competitions` - My competitions list
- `/competitions/create` - Create competition

---

## 🌐 Backend Integration

**Backend Repository:** [RyderCupAm](https://github.com/agustinEDev/RyderCupAm)

**Main Endpoints:**
- `POST /api/v1/auth/login` - Login (httpOnly cookies)
- `POST /api/v1/auth/register` - Registration
- `POST /api/v1/auth/refresh-token` - Token refresh
- `GET /api/v1/competitions` - List competitions
- `POST /api/v1/competitions` - Create competition
- `GET /api/v1/competitions/{id}/schedule` - Get schedule
- `POST /api/v1/competitions/{id}/rounds` - Create round
- `POST /api/v1/rounds/{id}/matches/generate` - Generate matches
- `PUT /api/v1/matches/{id}/status` - Update match status

See [BACKEND_API_SPEC.md](BACKEND_API_SPEC.md) for full API reference.

**API Docs:** http://localhost:8000/docs

---

## 🛡️ Security Features

- ✅ **httpOnly Cookies** - Tokens in secure cookies (XSS protection)
- ✅ **CSRF Protection** - X-CSRF-Token header on mutations
- ✅ **Token Auto-Refresh** - Automatic access token renewal
- ✅ **Account Lockout** - HTTP 423 after 10 failed login attempts
- ✅ **Password History** - Prevents reuse of last 5 passwords
- ✅ **Device Management** - Active session management with remote revocation
- ✅ **Input Validation** - Multi-layer validation (HTML + JS + Backend)
- ✅ **OWASP ASVS V2.1.1** - 12+ character passwords
- ✅ **Sentry Monitoring** - Error tracking and performance monitoring
- ✅ **CSP Headers** - Content Security Policy
- ✅ **SRI** - Subresource Integrity for static assets
- ✅ **Security Tests** - 12 automated OWASP tests

**OWASP Score:** 9.2/10

---

## 🚀 Useful Commands

```bash
npm install              # Install dependencies
npm run dev              # Development server
npm run build            # Production build
npm run preview          # Preview production build
npm test                 # Unit tests
npm run test:e2e         # E2E tests
npm run test:integration # Integration tests
npm run test:security    # Security tests
npm run lint             # ESLint
npm run format           # Prettier format
npm run format:check     # Check formatting
```

---

## 📚 Documentation

- **[ROADMAP.md](ROADMAP.md)** - v2.1.0 Planning (7 weeks, 5 sprints)
- **[CHANGELOG.md](CHANGELOG.md)** - Detailed change history
- **[BACKEND_API_SPEC.md](BACKEND_API_SPEC.md)** - Full API reference (55+ endpoints)
- **[CLAUDE.md](CLAUDE.md)** - Context for Claude AI
- **[docs/architecture/decisions/](docs/architecture/decisions/)** - ADRs (11 decisions)
- **[docs/INTEGRATION_TESTS.md](docs/INTEGRATION_TESTS.md)** - Integration tests guide
- **[docs/BRANCH_PROTECTION.md](docs/BRANCH_PROTECTION.md)** - Branch protection rules

---

## 🔗 Links

- **Backend Repository:** [RyderCupAm](https://github.com/agustinEDev/RyderCupAm)
- **Backend API Docs:** http://localhost:8000/docs
- **Sentry Dashboard:** https://sentry.io/

---

## 👤 Author

**Agustín Estévez**
- GitHub: [@agustinEDev](https://github.com/agustinEDev)

---

⭐ If you find this useful, give it a star on GitHub!

🏌️‍♂️ Happy coding!
