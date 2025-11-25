
import { init } from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing/esm"; // Use ESM version
import { Replay } from "@sentry/replay"; // Import Replay directly

init({
  dsn: "https://5548cda036a3fedd1f50791b66a93354@o4510427294662656.ingest.de.sentry.io/4510427296825424", // <- Asegúrate de que este es tu DSN
  integrations: [
    new BrowserTracing({
      tracePropagationTargets: ["localhost", /^\//],
    }),
    new Replay(), // Use Replay directly
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% of the transactions, adjust in production!
  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then to a lower figure in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when an error occurs.
});
