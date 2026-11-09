import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Sentry en el arranque: lo mínimo para no perder un error temprano va en
 * main.jsx y en un trozo estable (`sentry`); el seguimiento de navegaciones y
 * Replay llegan después con `import('./sentry')`.
 *
 * | Caso                                      | Esperado                                               |
 * |-------------------------------------------|--------------------------------------------------------|
 * | main.jsx                                  | `Sentry.init` al cargar, con el saneado y sus procesadores |
 * | src/sentry.ts                             | solo por `import()` dinámico                           |
 * | App.jsx                                   | registra el router en `routerParaSentry`, sin Sentry    |
 * | routerParaSentry                          | no importa nada de Sentry                              |
 * | vite.config.js                            | trozo `sentry` sin los envoltorios de routers ni profiler |
 *
 * Antes App.jsx importaba `navegacionesEnSentry`, que trae el envoltorio de React
 * Router de Sentry; y el trozo `sentry` cogía todo @sentry/react. Entre los dos,
 * el seguimiento de navegaciones entero entraba en el arranque (9 nov 2026).
 */
const fuente = (ruta) => readFileSync(resolve(globalThis.process.cwd(), ruta), 'utf8');

describe('Sentry en el arranque', () => {
  it('main.jsx inicia Sentry al cargar, con el saneado de URLs y sus procesadores', () => {
    const main = fuente('src/main.jsx');

    expect(main).toMatch(/^import \* as Sentry from '@sentry\/react';$/m);
    expect(main).toMatch(/Sentry\.init\(\{[\s\S]*beforeBreadcrumb: sentryScrubbing\.beforeBreadcrumb,[\s\S]*beforeSendSpan: sentryScrubbing\.beforeSendSpan,/);
    expect(main).toMatch(/Sentry\.addEventProcessor\(sentryScrubbing\.eventProcessor\);/);
    expect(main).toMatch(/Sentry\.addEventProcessor\(\(evento\) =>[\s\S]*esElEcoDeLaRecarga/);
  });

  it('src/sentry.ts (Replay, navegaciones) se carga después, nunca en el arranque', () => {
    const main = fuente('src/main.jsx');

    expect(main).toMatch(/import\('\.\/sentry'\)/);
    expect(main).not.toMatch(/^import [^;]*'\.\/sentry(\.ts)?';$/m);
  });

  it('App.jsx registra su router sin cargar el seguimiento de navegaciones', () => {
    const app = fuente('src/App.jsx');
    const registro = fuente('src/utils/routerParaSentry.js');

    expect(app).toMatch(/import \{ registrarRouterParaSentry \} from '\.\/utils\/routerParaSentry';/);
    expect(app).not.toMatch(/from '\.\/utils\/navegacionesEnSentry'/);
    expect(registro).not.toMatch(/@sentry\//);
    expect(registro).not.toMatch(/^import /m);
  });

  it('el trozo sentry deja fuera los envoltorios de routers y el profiler', () => {
    const config = fuente('vite.config.js');

    expect(config).toMatch(/!\/\\\/react-\?router\|tanstackrouter\|profiler\/\.test\(id\)/);
  });
});
