import React from 'react';
import * as Sentry from '@sentry/react';

/**
 * Página de prueba para verificar que Sentry está funcionando correctamente
 *
 * Esta página solo debe usarse en desarrollo para testing.
 * Incluye varios botones para probar diferentes aspectos de Sentry.
 */
const SentryTest = () => {
  const testError = () => {
    console.log('🔥 Lanzando error de prueba...');
    throw new Error('Test Error - Sentry funcionando!');
  };

  const testCaptureException = () => {
    console.log('📤 Capturando excepción manualmente...');
    try {
      throw new Error('Manual Exception Test');
    } catch (error) {
      console.log('🔍 Error capturado:', error);
      const eventId = Sentry.captureException(error);
      console.log('✅ Excepción capturada y enviada a Sentry. Event ID:', eventId);
    }
  };

  const testCaptureMessage = () => {
    console.log('📨 Enviando mensaje a Sentry...');
    const eventId = Sentry.captureMessage('Test Message - Verificación de Sentry', 'info');
    console.log('✅ Mensaje enviado a Sentry. Event ID:', eventId);
  };

  const testWithContext = () => {
    console.log('🏷️ Enviando error con contexto...');
    let eventId;
    Sentry.withScope((scope) => {
      scope.setTag('test_type', 'context_test');
      scope.setExtra('test_data', { foo: 'bar', timestamp: Date.now() });
      scope.setLevel('warning');
      eventId = Sentry.captureMessage('Test with Context');
    });
    console.log('✅ Error con contexto enviado a Sentry. Event ID:', eventId);
  };

  const testBreadcrumb = () => {
    console.log('🍞 Agregando breadcrumb y lanzando error...');
    Sentry.addBreadcrumb({
      category: 'test',
      message: 'User clicked test breadcrumb button',
      level: 'info',
    });
    setTimeout(() => {
      throw new Error('Error after breadcrumb');
    }, 100);
  };

  const checkSentryStatus = () => {
    const client = Sentry.getCurrentHub().getClient();
    if (client) {
      const options = client.getOptions();
      console.log('✅ Sentry está inicializado');
      console.log('📍 DSN:', options.dsn ? 'Configurado' : 'NO configurado');
      console.log('🌍 Environment:', options.environment || 'No especificado');
      console.log('🏷️ Release:', options.release || 'No especificado');
      console.log('📊 Traces Sample Rate:', options.tracesSampleRate);
      console.log('🎥 Replays Session Rate:', options.replaysSessionSampleRate);
      console.log('🎥 Replays On Error Rate:', options.replaysOnErrorSampleRate);
      alert('✅ Sentry está inicializado. Revisa la consola para más detalles.');
    } else {
      console.error('❌ Sentry NO está inicializado');
      alert('❌ Sentry NO está inicializado. Revisa la configuración.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🛡️ Sentry Test Page
          </h1>
          <p className="text-gray-600 mb-8">
            Usa esta página para verificar que Sentry está capturando errores correctamente.
          </p>

          {/* Status Check */}
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h2 className="text-xl font-semibold text-blue-900 mb-4">
              📊 Estado de Sentry
            </h2>
            <button
              onClick={checkSentryStatus}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Verificar Estado de Sentry
            </button>
            <p className="text-sm text-blue-700 mt-2">
              Haz clic para verificar si Sentry está inicializado. Revisa la consola del navegador.
            </p>
          </div>

          {/* Test Buttons */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              🧪 Pruebas de Sentry
            </h2>

            {/* Test 1: Throw Error */}
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-900 mb-2">
                1. Error No Capturado (Throw)
              </h3>
              <button
                onClick={testError}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Lanzar Error
              </button>
              <p className="text-sm text-red-700 mt-2">
                Lanza un error no capturado. Debería romper la app y mostrar el ErrorBoundary.
              </p>
            </div>

            {/* Test 2: Capture Exception */}
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h3 className="font-semibold text-orange-900 mb-2">
                2. Excepción Capturada Manualmente
              </h3>
              <button
                onClick={testCaptureException}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Capturar Excepción
              </button>
              <p className="text-sm text-orange-700 mt-2">
                Captura una excepción con try/catch y la envía a Sentry manualmente.
              </p>
            </div>

            {/* Test 3: Capture Message */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-900 mb-2">
                3. Mensaje de Prueba
              </h3>
              <button
                onClick={testCaptureMessage}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Enviar Mensaje
              </button>
              <p className="text-sm text-yellow-700 mt-2">
                Envía un mensaje informativo a Sentry (no es un error).
              </p>
            </div>

            {/* Test 4: With Context */}
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">
                4. Error con Contexto
              </h3>
              <button
                onClick={testWithContext}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Enviar con Contexto
              </button>
              <p className="text-sm text-purple-700 mt-2">
                Envía un mensaje con tags, extras y nivel personalizados.
              </p>
            </div>

            {/* Test 5: Breadcrumb */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">
                5. Error con Breadcrumb
              </h3>
              <button
                onClick={testBreadcrumb}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Test Breadcrumb
              </button>
              <p className="text-sm text-green-700 mt-2">
                Agrega un breadcrumb y luego lanza un error. El breadcrumb debería aparecer en el historial.
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              📋 Instrucciones
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Abre la consola del navegador (F12)</li>
              <li>Haz clic en "Verificar Estado de Sentry" para confirmar que está inicializado</li>
              <li>Prueba cada botón uno por uno</li>
              <li>Ve a Sentry.io → Issues para ver los errores capturados</li>
              <li>Cada prueba debería aparecer en Sentry en ~5-10 segundos</li>
            </ol>
          </div>

          {/* Environment Info */}
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              🌍 Información del Entorno
            </h2>
            <div className="text-sm text-gray-700 space-y-1">
              <p><strong>Node ENV:</strong> {process.env.NODE_ENV}</p>
              <p><strong>Sentry DSN:</strong> {import.meta.env.VITE_SENTRY_DSN ? '✅ Configurado' : '❌ NO configurado'}</p>
              <p><strong>Sentry Environment:</strong> {import.meta.env.VITE_SENTRY_ENVIRONMENT || 'No especificado'}</p>
              <p><strong>Sentry Debug:</strong> {import.meta.env.VITE_SENTRY_DEBUG || 'false'}</p>
            </div>
          </div>

          {/* Back Button */}
          <div className="mt-8">
            <a
              href="/dashboard"
              className="inline-block px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              ← Volver al Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SentryTest;
