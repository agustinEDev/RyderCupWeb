import { describe, it, expect, beforeAll } from 'vitest';
import { useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { createBrowserRouter, useLocation, useNavigationType, createRoutesFromChildren, matchRoutes } from 'react-router';
import { registrarRouterParaSentry, instrumentarRouterEnSentry } from './navegacionesEnSentry';

/**
 * Con Sentry de verdad (sin enviar nada): el router se crea antes de que llegue
 * su seguimiento, como en la aplicación, y aun así nombra la carga y las
 * navegaciones con la ruta y no con la dirección (FE #647 fase 1).
 *
 *   #  | caso                                     | esperado
 *   ---|------------------------------------------|----------------------------------------
 *   S6 | llega Sentry                              | la carga de página, con la ruta
 *   S6d | una redirección (replace) con la carga aún abierta     | la carga pasa a la ruta de destino
 *   S1 | navegar después                           | una navegación con la ruta, origen route
 *   S3 | una dirección que no existe               | no se le inventa una ruta de las conocidas
 *   S7 | una ruta con `loader`                      | la navegación lleva su ruta (FE #647, fase 3: T25)
 *
 * Sentry 11 envía las spans según acaban («span streaming»): no quedan como span
 * activa, así que se recogen al empezar, con una integración que se engancha
 * antes de que Sentry abra la carga de página.
 */
const RUTAS = [
  { path: '/dashboard' },
  // Como Torneos: una ruta con `loader` (fase 3)
  { path: '/competitions', loader: async () => ({ estado: 'ok', datos: [] }) },
  { path: '/competitions/:id' },
  { path: '*' },
];
const spans = [];
const recoger = { name: 'RecogerSpans', setup: (cliente) => cliente.on('spanStart', (s) => spans.push(s)) };
const datos = (span) => Sentry.spanToJSON(span);
const deTipo = (op) => spans.map(datos).filter((s) => s.attributes?.['sentry.op'] === op);

let router;
beforeAll(() => {
  window.history.replaceState({}, '', '/competitions/7');
  router = createBrowserRouter(RUTAS);
  registrarRouterParaSentry(router, RUTAS);

  // Como en la aplicación: main.jsx arranca Sentry sin el seguimiento, y
  // src/sentry.ts lo añade después al cliente que ya existe
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

describe('navegaciones en Sentry, con Sentry de verdad', () => {
  it('S6: al llegar, la carga de página lleva la ruta', () => {
    const [carga] = deTipo('pageload');

    expect(carga.name).toBe('/competitions/:id');
    expect(carga.attributes['sentry.segment.name.source']).toBe('route');
  });

  it('S6d: una redirección con la carga abierta la renombra a la de destino', async () => {
    await router.navigate('/dashboard', { replace: true });

    const [carga] = deTipo('pageload');
    expect(carga.name).toBe('/dashboard');
    expect(carga.attributes['url.template']).toBe('/dashboard');
  });

  it('S1: navegar abre una navegación con la ruta, no con la dirección', async () => {
    await router.navigate('/dashboard');
    await router.navigate('/competitions/42');

    const navegacion = deTipo('navigation').at(-1);
    expect(navegacion.name).toBe('/competitions/:id');
    expect(navegacion.attributes['sentry.segment.name.source']).toBe('route');
    expect(deTipo('navigation').map((n) => n.name)).toContain('/dashboard');
  });

  it('S7: una ruta con loader lleva su ruta', async () => {
    await router.navigate('/competitions');

    const navegacion = deTipo('navigation').at(-1);
    expect(router.state.location.pathname).toBe('/competitions');
    expect(navegacion.name).toBe('/competitions');
    expect(navegacion.attributes['sentry.segment.name.source']).toBe('route');
  });

  it('S3: una dirección que no existe no se convierte en una ruta conocida', async () => {
    await router.navigate('/esto/no/existe');

    const navegacion = deTipo('navigation').at(-1);
    expect(['/dashboard', '/competitions/:id']).not.toContain(navegacion.name);
  });
});
