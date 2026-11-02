import { describe, it, expect, beforeAll } from 'vitest';
import { useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { createBrowserRouter, useLocation, useNavigationType, createRoutesFromChildren, matchRoutes } from 'react-router';
import { registrarRouterParaSentry, instrumentarRouterEnSentry } from './navegacionesEnSentry';

/**
 * La aplicación instalada abre en `/start` y redirige al momento, antes de que
 * llegue el seguimiento de Sentry (~2 s). Sentry solo nombra la carga de página
 * cuando lo último fue una carga o un «atrás» (POP): tras una redirección
 * (REPLACE) o un toque (PUSH) la dejaba como «Pageload» (revisor, FE #647).
 * Con el árbol de la aplicación: carcasa sin ruta, ruta sin ruta y las hojas.
 *
 *   #   | caso                                                  | esperado
 *   ----|-------------------------------------------------------|----------------------------------
 *   S6b | redirección antes de Sentry                           | la carga, con la ruta de destino
 *   S6c | después, navegar sigue nombrando con la ruta          | navegación con la ruta
 */
const RUTAS = [
  {
    id: 'carcasa',
    children: [
      {
        id: 'pantallas',
        children: [{ path: '/start' }, { path: '/competitions/:id' }, { path: '/admin/:seccion?' }, { path: '*' }],
      },
    ],
  },
];
const spans = [];
const recoger = { name: 'RecogerSpans', setup: (cliente) => cliente.on('spanStart', (s) => spans.push(s)) };
const deTipo = (op) => spans.map((s) => Sentry.spanToJSON(s)).filter((s) => s.attributes?.['sentry.op'] === op);

let router;
beforeAll(async () => {
  window.history.replaceState({}, '', '/start');
  router = createBrowserRouter(RUTAS);
  registrarRouterParaSentry(router, RUTAS);
  await router.navigate('/competitions/abc-123', { replace: true });

  Sentry.init({
    dsn: 'https://public@o0.ingest.sentry.io/0',
    tracesSampleRate: 1,
    integrations: [recoger],
    transport: () => ({ send: async () => ({}), flush: async () => true }),
  });
  Sentry.getClient().addIntegration(
    Sentry.reactRouterV7BrowserTracingIntegration({ useEffect, useLocation, useNavigationType, createRoutesFromChildren, matchRoutes })
  );
  instrumentarRouterEnSentry();
});

describe('navegaciones en Sentry, con redirección antes de que llegue', () => {
  it('S6b: la carga de página lleva la ruta de destino', () => {
    const [carga] = deTipo('pageload');

    expect(carga.name).toBe('/competitions/:id');
    expect(carga.attributes['sentry.segment.name.source']).toBe('route');
    expect(carga.attributes['url.template']).toBe('/competitions/:id');
  });

  it('S6c: después, navegar sigue nombrando con la ruta', async () => {
    await router.navigate('/admin/usuarios');

    const navegacion = deTipo('navigation').at(-1);
    expect(navegacion.name).toBe('/admin/:seccion?');
    expect(navegacion.attributes['sentry.segment.name.source']).toBe('route');
  });
});
