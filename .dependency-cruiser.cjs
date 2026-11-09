/**
 * Contratos de arquitectura del frontend (dependency-cruiser).
 *
 * Se comprueban en el CI (job "Architecture") y en local con:
 *   npm run lint:architecture
 *
 * Describen la arquitectura que el código YA sigue (medido el 28 sep 2026: todas
 * se cumplían). Su trabajo es que siga así:
 *
 *   domain           ← no depende de nada del resto de src, ni de React
 *   application      ← solo domain (y utils); ni directa ni indirectamente
 *                      llega a React ni a un .jsx (9 nov 2026)
 *   utils            ← ayudas: no conocen la interfaz, ni services, ni las
 *                      capas de arriba (9 nov 2026)
 *   services         ← api.js, la sesión, la cola…: no conocen la interfaz;
 *                      los casos de uso, solo por composition (9 nov 2026)
 *   infrastructure   ← implementa los repositorios de domain; habla con la API
 *   composition      ← la composition root: el único sitio que junta
 *                      casos de uso e implementaciones
 *   pages / components / hooks / contexts ← la interfaz: usa los casos de uso a
 *                      través de composition, nunca directamente
 *
 * Si una regla falla, la salida dice qué import la rompe. No se relaja una regla
 * sin decidirlo: añadir una excepción es una decisión de arquitectura.
 */

const UI = '^src/(pages|components|hooks|contexts)/';
const TEST = '\\.test\\.(js|jsx|ts|tsx)$';

module.exports = {
  forbidden: [
    {
      name: 'domain-is-pure',
      comment:
        'El dominio no depende de ninguna otra capa del frontend: ni casos de uso, ni infraestructura, ni interfaz, ni servicios.',
      severity: 'error',
      from: { path: '^src/domain/', pathNot: TEST },
      to: { path: '^src/', pathNot: '^src/domain/' },
    },
    {
      name: 'domain-without-frameworks',
      comment: 'El dominio no conoce React, el router, i18n ni Sentry.',
      severity: 'error',
      from: { path: '^src/domain/', pathNot: TEST },
      to: {
        dependencyTypes: ['npm', 'npm-dev', 'npm-peer', 'npm-optional'],
        path: 'node_modules/(react|react-dom|react-router|react-router-dom|react-i18next|i18next|@sentry/[^/]+)/',
      },
    },
    {
      name: 'application-only-uses-domain',
      comment:
        'Los casos de uso solo dependen del dominio (y de utils): nunca de la infraestructura, de los servicios, de la composition root ni de la interfaz.',
      severity: 'error',
      from: { path: '^src/application/', pathNot: TEST },
      to: { path: '^src/(infrastructure|services|composition|pages|components|hooks|contexts)/' },
    },
    {
      name: 'infrastructure-does-not-reach-up',
      comment:
        'La infraestructura implementa los repositorios del dominio; no conoce los casos de uso, la composition root ni la interfaz.',
      severity: 'error',
      from: { path: '^src/infrastructure/', pathNot: TEST },
      to: { path: '^src/(application|composition|pages|components|hooks|contexts)/' },
    },
    {
      name: 'ui-goes-through-composition',
      comment:
        'La interfaz usa los casos de uso a través de src/composition (la composition root), nunca importando application ni infrastructure directamente.',
      severity: 'error',
      from: { path: UI, pathNot: TEST },
      to: { path: '^src/(application|infrastructure)/' },
    },
    // ── Reglas añadidas el 9 nov 2026 (auditoría de arquitectura) ──────────
    // Las de arriba miran solo el import directo. Estas cierran los huecos por
    // los que React se colaba en el núcleo a través de utils, y las carpetas
    // (utils, services) que no tenían ninguna regla.
    {
      name: 'core-does-not-reach-react',
      comment:
        'Ni el dominio ni los casos de uso llegan a React, al router, a i18n ni a un .jsx, tampoco a través de otro módulo (utils, services…). Un import directo no basta: CompetitionAssembler llegaba a React por utils/countryUtils.',
      severity: 'error',
      from: { path: '^src/(domain|application)/', pathNot: TEST },
      to: {
        path: [
          'node_modules/(react|react-dom|react-router|react-router-dom|react-i18next|react-hot-toast|@sentry/react)/',
          '\\.jsx$',
        ],
        reachable: true,
      },
    },
    {
      name: 'utils-does-not-import-ui',
      comment:
        'utils son ayudas sin interfaz: no importan componentes, páginas, contextos ni hooks. Si una ayuda necesita algo de ahí, ese algo no es de la interfaz y tiene que salir de esa carpeta.',
      severity: 'error',
      from: { path: '^src/utils/', pathNot: TEST },
      to: { path: `${UI}|\\.jsx$` },
    },
    {
      name: 'utils-does-not-import-services',
      comment:
        'utils está por debajo de services (services usa utils, nunca al revés): una ayuda que necesita la sesión, la memoria o la API es un servicio y vive en src/services.',
      severity: 'error',
      // EXCEPCIÓN PENDIENTE DE DECIDIR (9 nov 2026): deviceRevocationLogout
      // borra los apuntes de la cuenta (loUltimoConocido, refrescoDeHandicapApuntes,
      // novedadesDeActividad) y lo usan csrfLogout y tokenRefreshInterceptor,
      // también en utils. Sacarlo de aquí arrastra unos 35 ficheros: se deja
      // fuera de la regla hasta que se decida cómo, y solo él
      from: { path: '^src/utils/', pathNot: [TEST, '^src/utils/deviceRevocationLogout\\.js$'] },
      to: { path: '^src/services/' },
    },
    {
      name: 'utils-does-not-reach-up',
      comment:
        'utils no conoce los casos de uso, la infraestructura ni la composition root.',
      severity: 'error',
      from: { path: '^src/utils/', pathNot: TEST },
      to: { path: '^src/(application|infrastructure|composition)/' },
    },
    {
      name: 'infrastructure-does-not-import-ui',
      comment:
        'La infraestructura no importa nada de la interfaz, ni siquiera un .jsx suelto (infrastructure-does-not-reach-up ya cubre las carpetas; esta cubre los .jsx de cualquier sitio).',
      severity: 'error',
      from: { path: '^src/infrastructure/', pathNot: TEST },
      to: { path: '\\.jsx$' },
    },
    {
      name: 'services-does-not-reach-up',
      comment:
        'src/services (api.js, la sesión compartida, la cola sin conexión…) lo usan los repositorios y la interfaz: no conoce la interfaz, y a los casos de uso y la infraestructura solo llega por la composition root, como la interfaz (vaciadoDeLaCola y refrescoDeHandicap lanzan casos de uso desde ahí).',
      severity: 'error',
      from: { path: '^src/services/', pathNot: TEST },
      to: {
        path: [`${UI}|\\.jsx$`, '^src/(application|infrastructure)/'],
      },
    },
    {
      name: 'infrastructure-and-services-do-not-reach-ui',
      comment:
        'La infraestructura y los servicios no llegan a la interfaz ni por un camino indirecto (p. ej. services/api → utils → contexts).',
      severity: 'error',
      from: { path: '^src/(infrastructure|services)/', pathNot: TEST },
      to: { path: [UI, '\\.jsx$'], reachable: true },
    },
    {
      name: 'no-circular',
      comment: 'Sin dependencias circulares entre módulos.',
      severity: 'error',
      from: { pathNot: TEST },
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: TEST },
    tsConfig: undefined,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    },
    reporterOptions: { text: { highlightFocused: true } },
  },
};
