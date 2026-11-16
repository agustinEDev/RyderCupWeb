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
 * | main.jsx, la IP del usuario (FS-01)       | `dataCollection: { userInfo: false }`: Sentry no la deduce |
 * |   y, con ella, el user agent              | tampoco se deduce en spans, logs y métricas (aceptado: |
 * |                                           | los errores llevan el navegador en sus cabeceras)      |
 * | src/sentry.ts                             | solo por `import()` dinámico                           |
 * | App.jsx                                   | registra el router en `routerParaSentry`, sin Sentry    |
 * | routerParaSentry                          | no importa nada de Sentry                              |
 * | vite.config.js                            | trozo `sentry` sin los envoltorios de routers          |
 *
 * Antes App.jsx importaba `navegacionesEnSentry`, que trae el envoltorio de React
 * Router de Sentry; y el trozo `sentry` cogía todo @sentry/react. Entre los dos,
 * el seguimiento de navegaciones entero entraba en el arranque (9 nov 2026).
 */
const fuente = (ruta) =>
  readFileSync(resolve(globalThis.process.cwd(), ruta), 'utf8');

describe('Sentry en el arranque', () => {
  it('main.jsx inicia Sentry al cargar, con el saneado de URLs y sus procesadores', () => {
    const main = fuente('src/main.jsx');

    expect(main).toMatch(/^import \* as Sentry from '@sentry\/react';$/m);
    expect(main).toMatch(
      /Sentry\.init\(\{[\s\S]*beforeBreadcrumb: sentryScrubbing\.beforeBreadcrumb,[\s\S]*beforeSendSpan: sentryScrubbing\.beforeSendSpan,/,
    );
    expect(main).toMatch(
      /Sentry\.addEventProcessor\(sentryScrubbing\.eventProcessor\);/,
    );
    expect(main).toMatch(
      /Sentry\.addEventProcessor\(\(evento\) =>[\s\S]*esElEcoDeLaRecarga/,
    );
  });

  it('FS-01: main.jsx no deja a Sentry deducir la IP del usuario', () => {
    // Given Sentry 11, que por defecto pide a su servidor la IP de quien envía
    // (`infer_ip: 'auto'` con `dataCollection.userInfo` a true)
    const main = fuente('src/main.jsx');

    // Then el init la apaga —y con ella el user agent deducido en spans, logs
    // y métricas, aceptado—, y no hay otro init que la vuelva a encender
    expect(main).toMatch(
      /Sentry\.init\(\{[\s\S]*dataCollection: \{ userInfo: false \},[\s\S]*\}\);/,
    );
    expect(main.match(/Sentry\.init\(/g)).toHaveLength(1);
    expect(fuente('src/sentry.ts')).not.toMatch(/Sentry\.init\(|userInfo/);
  });

  it('FS-01: con esa opción, el Sentry instalado pide no deducir la IP', async () => {
    // Given el cliente del navegador de la versión instalada
    const { BrowserClient, makeFetchTransport, defaultStackParser } =
      await import('@sentry/react');

    // When se crea con la opción de main.jsx
    const cliente = new BrowserClient({
      dsn: 'https://clave@o0.ingest.sentry.io/0',
      integrations: [],
      transport: makeFetchTransport,
      stackParser: defaultStackParser,
      dataCollection: { userInfo: false },
    });

    // Then lo que manda con cada envío le dice a Sentry que no la deduzca
    expect(cliente.getOptions()._metadata.sdk.settings.infer_ip).toBe('never');
    // And la misma opción es la que, en spans, logs y métricas, pide
    // `infer_ip` e `infer_user_agent: 'never'`: sin el user agent deducido ahí
    // (aceptado; los errores llevan el navegador en sus cabeceras)
    expect(cliente.getDataCollectionOptions().userInfo).toBe(false);
  });

  it('src/sentry.ts (Replay, navegaciones) se carga después, nunca en el arranque', () => {
    const main = fuente('src/main.jsx');

    expect(main).toMatch(/import\('\.\/sentry'\)/);
    expect(main).not.toMatch(/^import [^;]*'\.\/sentry(\.ts)?';$/m);
  });

  it('App.jsx registra su router sin cargar el seguimiento de navegaciones', () => {
    const app = fuente('src/App.jsx');
    const registro = fuente('src/utils/routerParaSentry.js');

    expect(app).toMatch(
      /import \{ registrarRouterParaSentry \} from '\.\/utils\/routerParaSentry';/,
    );
    expect(app).not.toMatch(/from '\.\/utils\/navegacionesEnSentry'/);
    expect(registro).not.toMatch(/@sentry\//);
    expect(registro).not.toMatch(/^import /m);
  });

  it('el trozo sentry deja fuera los envoltorios de routers (el profiler, no: lo usa App.jsx)', () => {
    const config = fuente('vite.config.js');

    expect(config).toMatch(
      /!\/\\\/react-\?router\|tanstackrouter\/\.test\(id\)/,
    );
  });
});
