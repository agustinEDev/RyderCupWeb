/**
 * Abre un Chromium visible en el login para que la sesión la inicies TÚ, y
 * guarda las cookies en `scripts/movil/.sesion.json` para que las medidas de
 * `medir.mjs` puedan repetirse sin volver a pedírtela.
 *
 * El fichero queda fuera de git. Aquí no se teclea ninguna contraseña: la pones
 * tú (o tu gestor) en la ventana que se abre.
 *
 *   node scripts/movil/sesion.mjs
 */
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || 'http://localhost:5173';

// `channel: 'chrome'` usa el Chrome que ya está instalado: el Chromium propio
// de Playwright no está descargado y son 150 MB que no hacen falta
const navegador = await chromium.launch({ headless: false, channel: 'chrome' });
const contexto = await navegador.newContext();
const pagina = await contexto.newPage();
await pagina.goto(`${BASE}/login`);

console.log('\nInicia sesión en LA VENTANA QUE SE ACABA DE ABRIR (no en tu Chrome de siempre).');
console.log('En cuanto vea la cookie de sesión, la guardo y cierro. Hay 15 minutos.\n');

// Se espera a la COOKIE, no a la URL: la app puede quedarse en la misma ruta
// tras entrar, y entonces esperar un cambio de URL no termina nunca
const CADUCA = Date.now() + 15 * 60 * 1000;
let entrado = false;
while (Date.now() < CADUCA) {
  const cookies = await contexto.cookies();
  if (cookies.some((c) => /refresh|access|session/i.test(c.name))) { entrado = true; break; }
  await pagina.waitForTimeout(1000);
}
if (!entrado) {
  console.error('\nSe acabó el tiempo sin ver la sesión. Nada guardado.');
  await navegador.close();
  process.exit(1);
}
await pagina.waitForTimeout(1500);

await contexto.storageState({ path: join(AQUI, '.sesion.json') });
console.log('Sesión guardada en scripts/movil/.sesion.json');
await navegador.close();
