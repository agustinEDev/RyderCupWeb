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
 *   application      ← solo domain (y utils)
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
