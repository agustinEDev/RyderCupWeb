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

  // Toda llamada a la API pasa por apiRequest() (src/infrastructure/http/api.js): lleva el
  // interceptor que refresca el token ante un 401 y reintenta. Un fetch directo
  // se lo salta y provoca deslogueos aparentes. Excepciones, cada una
  // con su motivo en el propio fichero:
  // - tokenRefreshInterceptor.js: ES el interceptor
  // - sondaDeSesion.js: sondea la sesión SIN interceptor, para la pantalla de
  //   acceso (un bucle de refresco) y para «Volver» de los documentos legales
  //   (un `user` rancio acabaría en «tu sesión expiró» al pulsarlo)
  // - ApiSupportRepository.js: el formulario de contacto es un endpoint público
  {
    files: ['src/**/*.{js,jsx}'],
    ignores: [
      'src/**/*.test.{js,jsx}',
      'src/setupTests.js',
      'src/infrastructure/http/tokenRefreshInterceptor.js',
      'src/services/sondaDeSesion.js',
      'src/infrastructure/repositories/ApiSupportRepository.js',
    ],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Usa apiRequest() de src/infrastructure/http/api.js: lleva el refresco del token.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'fetch', message: 'Usa apiRequest() de src/infrastructure/http/api.js.' },
        { object: 'globalThis', property: 'fetch', message: 'Usa apiRequest() de src/infrastructure/http/api.js.' },
      ],
    },
  },

  // La interfaz no llama a la API: pide un caso de uso a src/composition (F2).
  // Las URLs de los avatares llegan por composition/http. También App.jsx y
  // main.jsx, y los import() dinámicos: el del cliente, siempre; de los demás, si se
  // saca `apiRequest` directamente (`const { apiRequest } = await import(…)`,
  // `(await import(…)).apiRequest` o `.then(({ apiRequest }) => …)`). Lo que no ve:
  // guardar el módulo entero en una variable y leer `apiRequest` después
  {
    files: ['src/{pages,components,hooks,contexts}/**/*.{js,jsx,ts,tsx}', 'src/App.jsx', 'src/main.jsx'],
    ignores: ['src/**/*.test.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/infrastructure/http/api', '**/infrastructure/http/api.js'],
              importNames: ['apiRequest', 'default'],
              message: 'La interfaz no llama a la API: usa un caso de uso de src/composition.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        // `apiRequest` por nombre desde la composition root (index o http). Con
        // no-restricted-imports caería también `import * as composicion`, que
        // origenesDeAnotacion usa a propósito para leer cada caso de uso al usarlo
        {
          selector:
            "ImportDeclaration[source.value=/composition(.index|.http)?(\\.js)?$/] > ImportSpecifier[imported.name='apiRequest']",
          message: 'La interfaz no llama a la API: usa un caso de uso de src/composition.',
        },
        {
          selector: 'ImportExpression[source.value=/infrastructure.http.api(\\.js)?$/]',
          message: 'La interfaz no carga el cliente de la API: usa un caso de uso de src/composition.',
        },
        {
          // El mismo, con plantilla: import(`…/infrastructure/http/api`)
          selector: 'ImportExpression > TemplateLiteral > TemplateElement[value.raw=/infrastructure.http.api/]',
          message: 'La interfaz no carga el cliente de la API: usa un caso de uso de src/composition.',
        },
        {
          selector:
            "VariableDeclarator[init.type='AwaitExpression'][init.argument.type='ImportExpression'] > ObjectPattern > Property[key.name='apiRequest']",
          message: 'La interfaz no llama a la API: usa un caso de uso de src/composition.',
        },
        {
          selector:
            "MemberExpression[property.name='apiRequest'][object.type='AwaitExpression'][object.argument.type='ImportExpression']",
          message: 'La interfaz no llama a la API: usa un caso de uso de src/composition.',
        },
        {
          selector:
            "CallExpression[callee.property.name='then'][callee.object.type='ImportExpression'] Property[key.name='apiRequest']",
          message: 'La interfaz no llama a la API: usa un caso de uso de src/composition.',
        },
      ],
    },
  },

  // Las interfaces del dominio (src/domain/repositories) declaran el contrato:
  // sus métodos nombran los parámetros para documentarlo y solo lanzan «no
  // implementado», así que los parámetros sin usar son su forma de ser. Solo
  // los parámetros: una variable o una importación que sobre sigue siendo un
  // error, que es lo que el `eslint-disable` de cada fichero dejaba pasar
  {
    files: ['src/domain/repositories/**/*.js'],
    rules: {
      'no-unused-vars': ['error', { args: 'none' }],
    },
  },
];
