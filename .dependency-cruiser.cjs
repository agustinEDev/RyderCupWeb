/**
 * Contratos de arquitectura del frontend (dependency-cruiser).
 *
 * Se comprueban en el CI (job "Architecture") y en local con:
 *   npm run lint:architecture
 *
 * Ese script pasa además los .ts/.tsx de src uno a uno: dependency-cruiser solo
 * recorre por su cuenta las extensiones que sabe compilar, y para TypeScript pide
 * el compilador < 7 (el del proyecto es la 7). Sin eso, un .ts que ningún .js
 * importara se libraba de todas las reglas; pasado a mano, se analiza.
 *
 * Describen la arquitectura que el código YA sigue (medido el 28 sep 2026: todas
 * se cumplían). Su trabajo es que siga así:
 *
 *   domain           ← no depende de nada del resto de src, ni de React
 *   application      ← solo domain (y utils); ni directa ni indirectamente
 *                      llega a la interfaz ni a otra librería que uuid (9 nov 2026)
 *   utils            ← ayudas: no conocen la interfaz, ni services, ni las
 *                      capas de arriba (9 nov 2026)
 *   services         ← la sesión, la cola sin conexión…: no conocen la interfaz;
 *                      los casos de uso, solo por composition (9 nov 2026);
 *                      de la infraestructura, solo infrastructure/http
 *   infrastructure   ← implementa los repositorios de domain; no importa services
 *     /http          ← el cliente de la API y el transporte de la sesión (api.js,
 *                      refresco, cierres forzados, token CSRF): no conoce
 *                      services ni el resto de la infraestructura; los
 *                      repositorios y services lo usan
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
// Un fichero de interfaz esté donde esté: JSX en .jsx o .tsx
const UI_FILE = '\\.(jsx|tsx)$';
// Las únicas librerías a las que llegan el dominio y los casos de uso (9 nov
// 2026: uuid, y nada más). Añadir una es una decisión de arquitectura
const CORE_ALLOWED_PACKAGES = 'node_modules/(uuid)/';

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
      name: 'application-only-uses-domain',
      comment:
        'Los casos de uso solo dependen del dominio (y de utils): nunca de la infraestructura, de los servicios ni de la composition root. La interfaz la vigila core-does-not-reach-ui, también por caminos indirectos.',
      severity: 'error',
      from: { path: '^src/application/', pathNot: TEST },
      to: { path: '^src/(infrastructure|services|composition)/' },
    },
    {
      name: 'infrastructure-does-not-reach-up',
      comment:
        'La infraestructura implementa los repositorios del dominio; no conoce los casos de uso ni la composition root. La interfaz la vigila infrastructure-and-services-do-not-reach-ui, también por caminos indirectos.',
      severity: 'error',
      from: { path: '^src/infrastructure/', pathNot: TEST },
      to: { path: '^src/(application|composition)/' },
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
      name: 'core-only-reaches-allowed-packages',
      comment:
        'Lista de PERMITIDOS: el dominio y los casos de uso solo llegan, directa o indirectamente, a las librerías de CORE_ALLOWED_PACKAGES. Sustituye a domain-without-frameworks, que era una lista de prohibidos (React, router, i18n, Sentry) y se quedaba atrás con cada librería de interfaz nueva. CompetitionAssembler llegaba a React por utils/countryUtils.',
      severity: 'error',
      from: { path: '^src/(domain|application)/', pathNot: TEST },
      to: { path: 'node_modules/', pathNot: CORE_ALLOWED_PACKAGES, reachable: true },
    },
    {
      name: 'core-does-not-reach-ui',
      comment:
        'Ni el dominio ni los casos de uso llegan a un fichero de interfaz (.jsx, .tsx, pages, components, hooks, contexts), tampoco a través de otro módulo.',
      severity: 'error',
      from: { path: '^src/(domain|application)/', pathNot: TEST },
      to: { path: [UI, UI_FILE], reachable: true },
    },
    {
      name: 'utils-does-not-reach-ui',
      comment:
        'utils son ayudas sin interfaz: no llegan a componentes, páginas, contextos, hooks ni a un .jsx/.tsx, ni directamente ni por otro módulo. Si una ayuda necesita algo de ahí, ese algo no es de la interfaz y tiene que salir de esa carpeta.',
      severity: 'error',
      from: { path: '^src/utils/', pathNot: TEST },
      to: { path: [UI, UI_FILE], reachable: true },
    },
    {
      name: 'utils-does-not-import-services',
      comment:
        'utils está por debajo de services (services usa utils, nunca al revés): una ayuda que necesita la sesión, la memoria o la API es un servicio y vive en src/services.',
      severity: 'error',
      from: { path: '^src/utils/', pathNot: TEST },
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
      name: 'services-does-not-reach-up',
      comment:
        'src/services (la sesión compartida, la cola sin conexión…) lo usa la interfaz: a los casos de uso y la infraestructura solo llega por la composition root, como la interfaz (vaciadoDeLaCola y refrescoDeHandicap lanzan casos de uso desde ahí). La única excepción es el transporte de la sesión, src/infrastructure/http, que services usa directamente (decidido con Agustín, 9 nov 2026). La interfaz la vigila infrastructure-and-services-do-not-reach-ui.',
      severity: 'error',
      from: { path: '^src/services/', pathNot: TEST },
      to: { path: '^src/(application|infrastructure)/', pathNot: '^src/infrastructure/http/' },
    },
    {
      name: 'http-does-not-reach-services',
      comment:
        'src/infrastructure/http (el interceptor del refresco, los cierres forzados, el token CSRF) es el transporte de la sesión: lo usan services y la composition root, y no conoce services, ni directa ni indirectamente. Lo que services guarda de la cuenta se borra con el registro de limpiezas (composition/limpiezaAlCerrarLaSesion), no importándolo desde aquí.',
      severity: 'error',
      from: { path: '^src/infrastructure/http/', pathNot: TEST },
      to: { path: '^src/services/', reachable: true },
    },
    {
      name: 'http-stays-in-its-folder',
      comment:
        'El transporte (api.js, el refresco, los cierres forzados, el token CSRF) no usa el resto de la infraestructura (repositorios, mappers, Sentry), ni directa ni indirectamente: son los repositorios los que llegan a él (apiRequest, con su reintento CSRF), nunca al revés. Al salir de utils estos módulos dejaron de estar bajo utils-does-not-reach-up, y nada lo impedía (revisión de la PR 2a).',
      severity: 'error',
      from: { path: '^src/infrastructure/http/', pathNot: TEST },
      to: { path: '^src/infrastructure/', pathNot: '^src/infrastructure/http/', reachable: true },
    },
    {
      name: 'infrastructure-reaches-http-only-through-api',
      comment:
        'Los repositorios y los mappers llegan al transporte solo por infrastructure/http/api.js (apiRequest, con el refresco del token y el reintento CSRF). Importar el interceptor, el token CSRF o los cierres forzados directamente se salta ese camino.',
      severity: 'error',
      from: { path: '^src/infrastructure/(repositories|mappers)/', pathNot: TEST },
      to: { path: '^src/infrastructure/http/', pathNot: '^src/infrastructure/http/api\\.js$' },
    },
    {
      name: 'infrastructure-does-not-import-services',
      comment:
        'La infraestructura (repositorios, mappers, el transporte) no importa src/services: el cliente de la API vive en infrastructure/http y los repositorios lo usan desde ahí. services está por encima: usa infrastructure/http, no al revés.',
      severity: 'error',
      from: { path: '^src/infrastructure/', pathNot: TEST },
      to: { path: '^src/services/' },
    },
    {
      name: 'infrastructure-does-not-reach-ui-libraries',
      comment:
        'La infraestructura no llega a las librerías de la interfaz (React, el router, los avisos, i18n, Sentry para React, los iconos), ni por un camino indirecto (p. ej. a través de utils). Lo que necesita de la interfaz (traducir, avisar, informar a Sentry, redirigir, saber si una ruta es pública) se lo da la composition root (composition/interfazDelTransporte).',
      severity: 'error',
      from: { path: '^src/infrastructure/', pathNot: TEST },
      to: {
        path: 'node_modules/(react|react-dom|react-router|react-router-dom|react-hot-toast|i18next|react-i18next|@sentry/react|lucide-react)/',
        reachable: true,
      },
    },
    {
      name: 'infrastructure-and-services-do-not-reach-ui',
      comment:
        'La infraestructura y los servicios no llegan a la interfaz (carpetas o .jsx/.tsx de cualquier sitio), ni directamente ni por un camino indirecto (p. ej. infrastructure/http/api → utils → contexts).',
      severity: 'error',
      from: { path: '^src/(infrastructure|services)/', pathNot: TEST },
      to: { path: [UI, UI_FILE], reachable: true },
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
