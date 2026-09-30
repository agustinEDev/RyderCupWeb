import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  // Ignore patterns (equivalent to ignorePatterns in old config)
  {
    ignores: ['dist/**', 'playwright-report/**', 'coverage/**'],
  },

  // Base ESLint recommended rules
  js.configs.recommended,

  // React configuration
  {
    files: ['**/*.{js,jsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        URLSearchParams: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        BroadcastChannel: 'readonly',
        AbortController: 'readonly',
        MouseEvent: 'readonly',
        FormData: 'readonly',
        File: 'readonly',
        // Node globals (for config files and tests)
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        global: 'readonly',
        // Vitest globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
    },
    settings: {
      react: {
        version: '19.2',
      },
    },
    rules: {
      // React recommended rules
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,

      // React Hooks rules
      ...reactHooks.configs.recommended.rules,

      // React Refresh rules
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // Disable prop-types (we removed PropTypes in Sprint 1)
      'react/prop-types': 'off',
    },
  },

  // Toda llamada a la API pasa por apiRequest() (src/services/api.js): lleva el
  // interceptor que refresca el token ante un 401 y reintenta. Un fetch directo
  // se lo salta y provoca deslogueos aparentes (CLAUDE.md). Excepciones, cada una
  // con su motivo en el propio fichero:
  // - tokenRefreshInterceptor.js: ES el interceptor
  // - useRedirectIfAuthenticated.js: sondea la sesión con timeout y SIN
  //   interceptor, para no entrar en un bucle de refresco en la pantalla de acceso
  // - ApiSupportRepository.js: el formulario de contacto es un endpoint público
  {
    files: ['src/**/*.{js,jsx}'],
    ignores: [
      'src/**/*.test.{js,jsx}',
      'src/setupTests.js',
      'src/utils/tokenRefreshInterceptor.js',
      'src/hooks/useRedirectIfAuthenticated.js',
      'src/infrastructure/repositories/ApiSupportRepository.js',
    ],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Usa apiRequest() de src/services/api.js: lleva el refresco del token.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'fetch', message: 'Usa apiRequest() de src/services/api.js.' },
        { object: 'globalThis', property: 'fetch', message: 'Usa apiRequest() de src/services/api.js.' },
      ],
    },
  },
];
