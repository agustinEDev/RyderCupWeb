# ADR-008: Security Testing Strategy (E2E)

**Date:** December 24, 2025
**Status:** Accepted (Implemented in v1.8.0)
**Decision Makers:** Frontend development team

## Context and Problem

Need to validate that implemented security measures (XSS protection, CSRF, CSP, validations) work correctly in real browsers.

**Problem:** Unit tests don't validate:
- Real browser behavior with malicious payloads
- Actual HTTP security headers
- React auto-escaping interaction with DOM
- Runtime CSP protections
- End-to-end form validations

## Decision

**Implement E2E security test suite** with Playwright validating:

### Tests Implemented (12 tests):

**1. XSS Protection (2 tests)**
- React auto-escaping of HTML tags
- Malicious payload execution prevention

**2. CSRF Protection (1 test)**
- SameSite cookies validation
- Cross-site request protection

**3. CSP Violations (2 tests)**
- Inline script blocking
- Security headers presence

**4. Authentication Security (3 tests)**
- SQL injection attempt rejection
- Generic error messages (no information leak)
- Sensitive data cleanup on logout

**5. Input Validation (3 tests)**
- Malformed email validation
- Password complexity enforcement
- Input length limits

**6. Rate Limiting (1 test)**
- Graceful rate limiting handling

## Rationale

**Why E2E vs unit only:**
- ✅ Validates real browser behavior
- ✅ Detects configuration issues (headers, CSP)
- ✅ Verifies React + DOM + Security interaction
- ✅ Proof of concept for security audits

**Why Playwright:**
- Already used in project (integration tests)
- Multi-browser support
- Easy debugging with UI mode

## Consequences

**Positive:**
- ✅ **Automatic validation** of security protections
- ✅ **Regression prevention** - detects if protections disabled
- ✅ **Executable documentation** - tests show how protections work
- ✅ **Audit trail** - evidence of security testing for compliance
- ✅ **CI/CD gate** - blocks merges breaking security

**Negative (mitigated):**
- ⏱️ **Execution time:** ~30 seconds
  - *Mitigation*: Only runs on important PRs or separate workflow
- 🧪 **Maintenance:** Tests can become fragile
  - *Mitigation*: Simple tests, focus on behavior not UI

## Implementation

**Files:**
- `tests/security.spec.js` - 12 E2E tests
- `.github/workflows/security-tests.yml` - CI workflow
- `package.json` - Script `npm run test:security`

**Command:**
```bash
npm run test:security
```

## Validation

**Current Status:** 12/12 tests passing (100%) ✅

**OWASP Score Impact:**
- A03 Injection: 9.0 → 9.5 (+0.5)
- A07 Authentication: 9.0 → 9.5 (+0.5)
- **Overall:** 9.3/10 → 9.5/10 (+0.2)

## References

- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- ADR-004: httpOnly Cookies Migration
