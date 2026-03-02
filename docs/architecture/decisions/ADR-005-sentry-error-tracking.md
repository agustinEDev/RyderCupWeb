# ADR-005: Sentry for Error Tracking & Performance Monitoring

**Date:** November 27, 2025
**Status:** Accepted (Implemented in v1.6.0)
**Decision Makers:** Frontend development team

## Context and Problem

Production errors need proactive detection and monitoring. Required:
- Error tracking with stack traces
- Performance monitoring (Web Vitals)
- Session replay for debugging
- Automatic alerts
- Privacy-compliant (no sensitive data)

## Options Considered

1. **Sentry**: Complete platform (error tracking + performance + replay)
2. **LogRocket**: Session replay + analytics
3. **Rollbar**: Basic error tracking
4. **Bugsnag**: Error tracking + stability
5. **Console.log**: Manual reporting (no tooling)

## Decision

**Adopt Sentry** with `@sentry/react` SDK:

**Integrations:**
- React Error Boundary
- React Router V6 Browser Tracing
- Session Replay (masked text/inputs)
- Performance Monitoring

**Configuration:**
```javascript
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_ENVIRONMENT,
  release: `rydercup-web@${import.meta.env.VITE_APP_VERSION}`,
  
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.reactRouterV6BrowserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
      maskAllInputs: true
    })
  ],
  
  tracesSampleRate: 0.1,              // 10% transactions
  replaysSessionSampleRate: 0.1,      // 10% normal sessions
  replaysOnErrorSampleRate: 1.0,      // 100% on errors
  
  ignoreErrors: ['ResizeObserver loop limit exceeded'],
  
  beforeSend(event) {
    if (import.meta.env.DEV) return null;
    delete event.request?.cookies;
    delete event.request?.headers?.['Authorization'];
    return event;
  }
});
```

## Rationale

**Why Sentry:**
- ✅ Official React integration
- ✅ Complete feature set (errors + performance + replay)
- ✅ Free tier: 5K errors/month, 10K performance events
- ✅ Rich ecosystem (React Profiler, Router integration)

**Comparison:**

| Feature | Sentry | LogRocket | Rollbar |
|---------|:------:|:---------:|:-------:|
| Error Tracking | ✅ | ✅ | ✅ |
| Performance | ✅ | ⚠️ | ❌ |
| Session Replay | ✅ | ✅ | ❌ |
| React Integration | ✅ Official | ✅ | ⚠️ Basic |
| Free Tier | ✅ 5K | ⚠️ 1K | ✅ 5K |

## Consequences

**Positive:**
- ✅ Proactive error detection with automatic alerts
- ✅ Session replay enables bug reproduction
- ✅ Performance insights (slow pages, API calls)
- ✅ Rich context (breadcrumbs, device info, URL)
- ✅ Source maps → readable stack traces

**Negative:**
- ❌ Potential cost if traffic grows (may require paid plan)
- ❌ Bundle overhead: +244 KB (separate chunk)
- ❌ Privacy concerns (mitigated: `beforeSend` sanitization)
- ❌ Performance impact: ~1-2% overhead (minimal)

**Bundle Impact:**
```bash
dist/assets/sentry-H0cbkE6T.js  244.11 KB │ gzip: 75.91 KB
```

**Metrics (v1.6.0, first 2 weeks):**
- Errors captured: 12 (all resolved)
- Performance events: 450 transactions
- Session replays: 23 sessions
- Avg page load: 1.2s
- Avg API response: 180ms

## Implementation

**Files:**
- `src/main.jsx` - Sentry initialization
- `src/components/ErrorFallback.jsx` - Error Boundary UI
- `vite.config.js` - Manual chunk for Sentry

**Environment Variables:**
```bash
VITE_SENTRY_DSN=https://xxx@xxx.ingest.us.sentry.io/xxx
VITE_ENVIRONMENT=production
VITE_APP_VERSION=1.6.0
```

**Alerts Configured:**
1. Email on critical production errors
2. Performance degradation (p95 > 3s)
3. High error rate (>10/min)
4. New release issues

## References

- [Sentry React Docs](https://docs.sentry.io/platforms/javascript/guides/react/)
- ADR-006: Code Splitting & Lazy Loading
- [SENTRY_IMPLEMENTATION_SUMMARY.md](../../SENTRY_IMPLEMENTATION_SUMMARY.md)
