# Frontend Security & Architecture Audit — July 2026

**Date**: July 26, 2026
**Scope**: Full frontend codebase (`RyderCupWeb`) — dependency security, authentication/XSS surface, and Clean-Architecture/DDD compliance as adapted for a React SPA.
**Trigger**: Proactive audit, not a response to a known incident. Tracked as GitHub issue #237.
**Author**: AI-assisted audit (Claude), reviewed findings verified against source before filing.

---

## Executive Summary

No Critical or exploitable High-severity vulnerabilities were found. The codebase's headline security claims hold up under review: httpOnly-cookie authentication with CSRF double-submit protection, a strict production CSP with no `unsafe-inline`/`unsafe-eval`, zero `dangerouslySetInnerHTML`/`eval`/`innerHTML` usage, no open-redirect surface, and `snyk test --all-projects` reports **0 vulnerabilities across 35 dependencies**.

The one **High**-severity finding is a live, ongoing privacy issue rather than a classic vulnerability: Sentry Session Replay is configured to record **unmasked on-screen text** for 100% of error sessions and 10% of all sessions, shipping player names, emails, and handicap data to a third-party service well beyond what's needed for debugging.

The architecture pass found no correctness bugs. It did find a meaningful **documentation/reality gap**: CLAUDE.md, README.md, and ROADMAP.md describe a state/validation stack (Zustand, TanStack Query, Zod) that does not exist anywhere in `package.json` or `src/` — the actual patterns (React Context + local state, ad-hoc imperative validation) are reasonable but undocumented, which risks steering future contributors (human or AI) into designing against a fictional architecture. It also found ~420 lines of dead legacy API-calling code left over from the v2.0.9 Clean Architecture remediation, and two maintainability issues in `CreateCompetition.jsx` (inline validation, multi-step orchestration living in the page instead of a use case).

The already-tracked 37 silenced `react-hooks/*` lint warnings (issue #239) are **not** re-reported here; sampled hook dependency arrays outside that tracked set showed no additional issues.

**Totals**: 0 Critical · 1 High · 4 Medium · 3 Low.

---

## Methodology

1. **Dependency scan**: `snyk test --all-projects` against `package-lock.json` (org `agustinedev`).
2. **Static review**: targeted `grep`/manual read of `src/` for XSS sinks (`dangerouslySetInnerHTML`, `eval`, `new Function`, `document.write`, `innerHTML =`), auth/token storage (`localStorage`/`sessionStorage`), redirect targets (`navigate()`, `window.location`), CSRF/OAuth flows, and Sentry PII scrubbing (`beforeSend`/`beforeBreadcrumb`).
3. **Config review**: `vite.config.js` security headers (prod + dev), `nginx.conf`, `public/_headers`, `.snyk` policy.
4. **Architecture review**: component/hook boundaries in representative pages (`CreateCompetition.jsx`, `ScoringPage.jsx`, `SchedulePage.jsx`), state-management pattern consistency against documented architecture, API-layer centralization (grep for `fetch(`/`axios.` outside `src/infrastructure`), and hook dependency arrays outside the set already covered by the tracked #239 debt.
5. **Existing test coverage noted**: `tests/security.spec.js` already exercises XSS escaping, CSRF/SameSite cookies, CSP violation blocking, security headers presence, auth error handling, and input validation via Playwright — this audit did not duplicate that coverage, only reviewed the underlying implementation.

---

## Findings

### High

#### H1 — Sentry Session Replay records unmasked on-screen text in production

- **File**: `src/infrastructure/sentry.ts:83-90`
- **Description**: `replayIntegration({ maskAllText: false, blockAllMedia: false, ... })` is configured unconditionally, with `replaysOnErrorSampleRate: 1.0` (100% of sessions that hit an error) and `replaysSessionSampleRate: 0.1` (10% of all sessions, via `VITE_SENTRY_REPLAYS_*` env vars). The code's own comment reads `// Cambiar a true en producción si hay datos sensibles` ("switch to true in production if there is sensitive data") — acknowledging the risk but shipping the permissive value regardless of environment.
- **Risk scenario**: Any user who hits a JS error (a common, non-adversarial event) gets a full-fidelity DOM-text recording sent to Sentry's infrastructure — player names, emails, handicaps, competition details, anything visible on screen at the time. This is live in production today, not a hypothetical. It also expands the blast radius of a Sentry account/API-token compromise into a trove of session-level PII, and creates a GDPR-relevant data flow (EU personal data to a third-party processor) that isn't scoped to what's needed for error diagnosis.
- **Suggested fix**: Set `maskAllText: true` (or mask specific selectors that aren't sensitive, e.g. static labels) and `blockAllMedia: true` for production builds; only relax masking in Sentry's own PII-safe fields if a specific debugging need arises. Re-evaluate the sample rates once masking is in place.

---

### Medium

#### M1 — Documented architecture (Zustand, TanStack Query, Zod, Axios) does not match implementation

- **Files**: `CLAUDE.md`, `README.md`, `ROADMAP.md` (documentation) vs. `package.json` + `src/` (implementation)
- **Description**: `package.json` contains no `zustand`, `@tanstack/react-query`, `zod`, or `axios` dependency; `src/store/` does not exist; a full-repo grep for `zod`/`z.object` returns zero hits. Yet the docs describe Zustand stores (with code samples for `authStore`, `competitionStore`, etc.), TanStack Query data-fetching, and a "Zod frontend + Pydantic backend" double-validation layer as the current architecture. In reality state is React Context (`src/contexts/AuthContext.jsx`) + local `useState`/custom hooks, and form validation is ad-hoc imperative JS per form (see M2).
- **Risk scenario**: A future contributor — or an AI coding agent reading CLAUDE.md as source of truth — designs a new feature against the documented Zustand/Zod pattern, either introducing an inconsistent one-off dependency or wasting time discovering the pattern doesn't exist. Documentation drift in a repo whose CLAUDE.md is explicitly used to steer AI-assisted development compounds over time.
- **Suggested fix**: Either (a) update CLAUDE.md/README.md to describe the actual Context+hooks / ad-hoc-validation architecture, or (b) if Zod/Zustand adoption is still intended, track it as an explicit backlog item rather than documenting it as already-done.

#### M2 — Form-boundary validation is manual and duplicated instead of a shared schema

- **File**: `src/pages/CreateCompetition.jsx:401-456`
- **Description**: `handleSubmit` runs 7 sequential imperative checks (name, team names, dates, country, per-country golf-course presence, player-count bounds) inline in the component, duplicating validation logic that the backend Pydantic schema almost certainly also enforces, with no shared source of truth between them.
- **Risk scenario**: Not independently exploitable (backend re-validates), but scattered, untestable in isolation, and easy to under-maintain — a future field addition can be validated in the component and silently skipped elsewhere, or vice versa.
- **Suggested fix**: Extract to a pure `validateCompetitionForm(formData)` function (or a Zod schema, if M1's option (b) is chosen) outside the component, unit-testable independent of rendering.

#### M3 — Multi-step create-competition orchestration lives in the page component, not a use case

- **File**: `src/pages/CreateCompetition.jsx:499-537`
- **Description**: On submit, the component calls `createCompetitionUseCase.execute()`, then loops over `formData.golfCourses` calling `addGolfCourseToCompetitionUseCase.execute()` per course, manually accumulating `successCount`/`failedCourses` for partial-failure UI messaging. This is exactly the kind of atomic multi-step, multi-repository operation a use case should own.
- **Risk scenario**: Any other future entry point needing "create competition + attach courses" (e.g. a bulk-import or duplicate-competition feature) has to reimplement the same loop and partial-failure accounting, drifting from this implementation over time.
- **Suggested fix**: Introduce a `CreateCompetitionWithGolfCoursesUseCase` that encapsulates both steps and returns a structured partial-failure result.

#### M4 — ~420 lines of dead legacy API-calling code from the v2.0.9 Clean Architecture remediation

- **Files**: `src/services/competitions.js` (301 lines), `src/services/countries.js` (239 lines)
- **Description**: Both files still export a full set of raw `apiRequest()`-calling functions — `activateCompetition`, `startCompetition`, `completeCompetition`, `cancelCompetition`, `createCompetition`, `updateCompetition`, `deleteCompetition`, `requestEnrollment`, `getEnrollments`, `approveEnrollment`, `rejectEnrollment`, `cancelEnrollment`, `withdrawEnrollment`, `setCustomHandicap`, `getCompetitionById`, `getCountries`, `getAdjacentCountries`, `getCommonAdjacentCountries`, `getAdjacentCountriesFallback`. Verified via grep of every import site in `src/pages` and `src/components`: **none of these mutating functions are imported anywhere** — all current call sites correctly go through `ICompetitionRepository`/`IEnrollmentRepository`/`ICountryRepository` use cases via `src/composition`. Only pure display helpers are actually used: `getStatusColor`, `getEnrollmentStatusColor`, `formatDateRange` (from `competitions.js`, confirmed imported in `Competitions.jsx` and `CompetitionDetail.jsx`) and `formatCountryName` (from `countries.js`, confirmed imported in 7 files).
- **Risk scenario**: The exact Clean Architecture violation the v2.0.9 remediation (PR #142) already fixed is one `grep "activate competition"` away from being reintroduced — a contributor finds the old function, assumes it's the sanctioned way to call the endpoint, and bypasses the repository/use-case layer.
- **Suggested fix**: Delete the dead mutating exports from both files; move the surviving pure formatters (`getStatusColor`, `getEnrollmentStatusColor`, `formatDateRange`, `formatCountryName`) to `src/utils/`, since they are formatters, not API services.

---

### Low (no follow-up issue filed — tracked here only)

#### L1 — Dead code re-implementing a non-httpOnly token pattern

- **File**: `src/utils/auth.js:9-93` (`isTokenExpired`, `validateToken`, `clearAuthData`, `getCurrentUser`, `getAuthToken`, `isAuthenticated`)
- **Description**: Reads/writes `localStorage['access_token']` and `localStorage['user']`, contradicting the documented and actually-implemented httpOnly-cookie auth model (ADR-004). Confirmed unused in production code — only `safeLog` from this file is imported elsewhere.
- **Why Low, not higher**: Not currently exploitable since nothing calls these exports; the real token lives only in an httpOnly cookie the app never touches directly.
- **Suggested fix**: Delete `isTokenExpired`, `validateToken`, `clearAuthData`, `getCurrentUser`, `getAuthToken`, `isAuthenticated` from `auth.js`, keeping only `safeLog`.

#### L2 — Production CSP `connect-src` still allows `http://localhost:8000`

- **Files**: `nginx.conf:53`, `public/_headers:11`, `vite.config.js:17` (the shared prod/preview `securityHeaders` object)
- **Description**: The production Content-Security-Policy's `connect-src` directive includes `http://localhost:8000` — a local-dev backend URL that has no reason to be reachable (or listed) in a production CSP served over the public domain. The dev-only CSP override (`vite.config.js:82`, `configureServer`) is correctly scoped separately, so this is specifically a leftover in the shared production header.
- **Why Low, not higher**: No direct exploit path — an attacker cannot make a victim's browser have something useful listening on `localhost:8000`. It's a least-privilege / CSP-hygiene issue, not an active vulnerability.
- **Suggested fix**: Remove `http://localhost:8000` from the production `connect-src` in `vite.config.js`'s shared `securityHeaders`, `nginx.conf`, and `public/_headers`.

#### L3 — Unguarded `console.log` of user email and business context in production

- **File**: `src/utils/sentryHelpers.js:50,61,120,147,157`
- **Description**: `setUserContext`/`clearUserContext`/module and business-context helpers log unconditionally, e.g. `console.log('✅ Sentry: User context set', user.email)`. This is inconsistent with the codebase's own established pattern of gating diagnostic logs behind `import.meta.env.DEV` (as `safeLog()` in `utils/auth.js` and other call sites do), and Vite does not strip `console.log` calls from production builds by default.
- **Why Low, not higher**: Visible only in the affected user's own browser console — no cross-user or server-side exposure.
- **Suggested fix**: Gate these `console.log` calls behind `import.meta.env.DEV`, matching the existing `safeLog` convention.

---

### Already tracked (not duplicated here)

- **37 silenced `react-hooks/*` lint warnings** across 19 files (React Compiler rule family: `immutability`, `purity`, `refs`, `preserve-manual-memoization`, `set-state-in-effect`), introduced by the `eslint-plugin-react-hooks` 7.0.1 → 7.1.1 bump on 2026-07-24. Documented in `ROADMAP.md` and tracked as **issue #239**. Hook dependency arrays outside this tracked set were sampled during this audit and showed no additional issues.

---

## What was checked and found clean

- **Dependencies**: `snyk test --all-projects` — 0 vulnerabilities, 35 dependencies tested.
- **XSS sinks**: zero hits for `dangerouslySetInnerHTML`, `eval(`, `new Function(`, `document.write`, `innerHTML =` anywhere in `src/`.
- **Open redirects**: all `navigate()` targets are static paths or same-origin `location.state`; the Google OAuth redirect is env-configured and protected by a `crypto.getRandomValues()` CSRF nonce, verified server-side before any action.
- **CSRF**: double-submit cookie pattern is intentional and correctly implemented — the non-httpOnly `csrf_token` cookie must be JS-readable to populate the `X-CSRF-Token` header; this is not a vulnerability.
- **Sentry PII scrubbing**: `beforeSend`/`beforeBreadcrumb` in `sentry.ts` correctly strip `Authorization`/`Cookie` headers and `password`/`access_token`/`refresh_token` from request bodies, and redact `token=` in breadcrumb URLs.
- **Auth token storage**: real auth tokens live only in httpOnly cookies (ADR-004); only non-sensitive profile JSON persists to `localStorage` for reload continuity, consistent with the documented model.
- **Production CSP**: no `unsafe-inline`/`unsafe-eval` in production/preview; the relaxed dev-only CSP is correctly scoped to Vite's `configureServer` hook and does not leak into build output.
- **API layer centralization**: zero direct `fetch(`/`axios.` calls in `src/pages` or `src/components` today — the only `fetch()` calls in `src/` are inside the token-refresh interceptor and `ApiSupportRepository.js` (both correctly in the infrastructure layer). The CHANGELOG v2.0.9 claim of having eliminated direct `fetch()` from the UI still holds.
- **`useScoring.js`** (320 lines) initially looked like a candidate "god hook" (polling + offline queue + session lock + submission), but correctly delegates offline-queue and session-lock concerns to separate `scoringOfflineQueue.js`/`scoringSessionLock.js` modules and only orchestrates them.

---

## Follow-up issues opened

| Finding | Issue | Priority |
|---|---|---|
| H1 — Sentry Replay unmasked PII | [#240](https://github.com/agustinEDev/RyderCupWeb/issues/240) | P1 |
| M1 — Documented vs. actual architecture drift | [#241](https://github.com/agustinEDev/RyderCupWeb/issues/241) | P2 |
| M2 — Ad-hoc form validation | [#242](https://github.com/agustinEDev/RyderCupWeb/issues/242) | P2 |
| M3 — Orchestration logic in page component | [#243](https://github.com/agustinEDev/RyderCupWeb/issues/243) | P2 |
| M4 — Dead legacy service code | [#244](https://github.com/agustinEDev/RyderCupWeb/issues/244) | P2 |

Issue #239 (37 silenced `react-hooks/*` lint warnings) is already tracked and referenced above, not duplicated.
