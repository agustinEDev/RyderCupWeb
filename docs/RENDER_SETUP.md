# 🚀 Sentry Setup on Render

> Configure Sentry environment variables on Render.com

## 🔑 Get Sentry DSN

1. Go to [sentry.io](https://sentry.io/) → Settings → Projects → Your Project
2. Navigate to **Client Keys (DSN)**
3. Copy the DSN (format: `https://...@o...ingest.sentry.io/...`)

## 🏛️ Configure Render Variables

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Select your service → **Environment** tab
3. Add these variables:

```bash
VITE_SENTRY_DSN=https://your-dsn@o...ingest.sentry.io/...
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_DEBUG=false
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1              # 10% transactions
VITE_SENTRY_PROFILES_SAMPLE_RATE=0.1            # 10% profiles
VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.05    # 5% normal sessions
VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=1.0    # 100% error sessions
VITE_SENTRY_AUTO_SESSION_TRACKING=true
VITE_SENTRY_ATTACH_STACKTRACE=true
VITE_SENTRY_ENABLE_FEEDBACK=false                # Optional feedback widget
```

4. Click **Manual Deploy** → **Deploy latest commit**

## ✅ Verify Setup

### Browser Console
Open DevTools (F12) → Console. Look for:
```
🚀 Sentry Initialized
Environment: production
Traces Sample: 10%
```

### Sentry Dashboard
1. Go to sentry.io → Your Project → Issues
2. Test: Run `throw new Error('Test Sentry');` in console
3. Error should appear in Sentry within seconds

## 🏛️ Sample Rate Scenarios

**Critical debugging (temporary):**
```bash
VITE_SENTRY_TRACES_SAMPLE_RATE=1.0     # 100%
VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.5  # 50%
```
⚠️ Revert to low values after fixing to avoid high costs.

**High traffic (cost optimization):**
```bash
VITE_SENTRY_TRACES_SAMPLE_RATE=0.05    # 5%
VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.01  # 1%
```

## 🆘 Troubleshooting

**Sentry not initializing:**
- Verify variables in Render Environment tab
- Redeploy after adding variables
- Check DSN is correct

**Variables not applied:**
- Clear build cache: Service → Settings → Clear Build Cache
- Manual Deploy

**Monitor quotas:**
- sentry.io → Settings → Subscription → Usage
- Configure alerts when approaching limit

## 🔐 Security

**Rate Limiting (recommended):**
1. Sentry.io → Settings → Projects → Client Keys
2. Configure → Enable Rate Limiting (e.g., 1000 events/min)

## 📚 Resources

- [Render Environment Variables](https://render.com/docs/environment-variables)
- [Sentry React Docs](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry Sampling Guide](https://docs.sentry.io/platforms/javascript/configuration/sampling/)
