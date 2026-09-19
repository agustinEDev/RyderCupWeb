/**
 * Mide una pantalla a anchos de móvil de verdad y avisa de lo que un teléfono
 * rompe y una ventana de escritorio no: desbordes laterales, campos que cortan
 * su contenido, objetivos táctiles pequeños y cuánto scroll hay que hacer.
 *
 * El Chrome con el que se verifica a mano no baja de 500 px de viewport; esto
 * sí llega a 360, que es donde vive media base de usuarios.
 *
 *   node scripts/movil/medir.mjs                       # la pantalla de crear
 *   node scripts/movil/medir.mjs /competitions         # cualquier otra
 *
 * No sustituye al teléfono: Chromium no es Safari, no pinta el selector de
 * fecha de iOS ni el teclado nativo, y no tiene barra de navegación que se
 * coma alto al hacer scroll.
 */
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SESION = join(AQUI, '.sesion.json');
const SALIDA = join(AQUI, 'capturas');
const BASE = process.env.BASE_URL || 'http://localhost:5173';
const RUTA = process.argv[2] || '/competitions/create';

// Los tres anchos que importan: el Android pequeño que sigue vivo, el iPhone
// moderno y el grande. Si algo se rompe, se rompe en el primero
const PANTALLAS = [
  { nombre: 'android-360', ancho: 360, alto: 740, escala: 3 },
  { nombre: 'iphone-390', ancho: 390, alto: 844, escala: 3 },
  { nombre: 'iphone-max-430', ancho: 430, alto: 932, escala: 3 },
];

// Sin sesión se miden igualmente las pantallas públicas: sirve para comprobar
// que el medidor funciona sin depender de que haya nadie delante
const HAY_SESION = existsSync(SESION);
if (!HAY_SESION) {
  console.log(`Sin sesión guardada: solo se puede medir lo público (${RUTA}).`);
  console.log('Para el resto: node scripts/movil/sesion.mjs\n');
}
mkdirSync(SALIDA, { recursive: true });

const revisa = () => {
  const doc = document.documentElement;
  const desbordes = [];
  const recortados = [];
  const dedoPequeno = [];

  for (const nodo of document.querySelectorAll('body *')) {
    const caja = nodo.getBoundingClientRect();
    if (caja.width === 0 || caja.height === 0) continue;

    // Se sale por la derecha de la pantalla
    if (caja.right > doc.clientWidth + 1 && nodo.children.length === 0) {
      desbordes.push({ que: nodo.tagName + (nodo.className ? '.' + String(nodo.className).split(' ')[0] : ''), sobra: Math.round(caja.right - doc.clientWidth) });
    }

    // Un campo cuyo contenido no cabe en él: el caso de la fecha estrecha
    if (['INPUT', 'SELECT', 'BUTTON'].includes(nodo.tagName) && nodo.scrollWidth > nodo.clientWidth + 1) {
      recortados.push({ que: nodo.tagName, id: nodo.id || nodo.dataset.testid || '', cabe: nodo.clientWidth, necesita: nodo.scrollWidth });
    }

    // 44 px es el mínimo que se toca sin fallar
    const pulsable = nodo.tagName === 'BUTTON' || nodo.tagName === 'A' || nodo.tagName === 'INPUT';
    if (pulsable && (caja.height < 44 || caja.width < 44)) {
      dedoPequeno.push({ que: nodo.tagName, id: nodo.id || nodo.dataset.testid || (nodo.textContent || '').trim().slice(0, 18), alto: Math.round(caja.height), ancho: Math.round(caja.width) });
    }
  }

  return {
    alturaDocumento: Math.round(doc.scrollHeight),
    scrollHorizontal: doc.scrollWidth > doc.clientWidth ? doc.scrollWidth - doc.clientWidth : 0,
    desbordes: desbordes.slice(0, 8),
    recortados,
    dedoPequeno: dedoPequeno.slice(0, 8),
  };
};

// Con el Chrome instalado, sin descargar el Chromium propio de Playwright
const navegador = await chromium.launch({ channel: 'chrome' });
let problemas = 0;

for (const p of PANTALLAS) {
  const contexto = await navegador.newContext({
    ...(HAY_SESION ? { storageState: SESION } : {}),
    viewport: { width: p.ancho, height: p.alto },
    deviceScaleFactor: p.escala,
    isMobile: true,
    hasTouch: true,
    locale: 'es-ES',
  });
  const pagina = await contexto.newPage();
  await pagina.goto(BASE + RUTA, { waitUntil: 'networkidle' });

  // Si la pantalla empieza preguntando el tipo, se elige el único que existe
  const ryder = pagina.getByTestId('tipo-RYDER_CUP');
  if (await ryder.count()) {
    await ryder.click();
    await pagina.waitForTimeout(800);
  }

  const plegado = await pagina.evaluate(revisa);
  await pagina.screenshot({ path: join(SALIDA, `${p.nombre}-plegado.png`), fullPage: true });

  // Y otra vez con «Más opciones» abierto, que es donde cabe menos
  const mas = pagina.getByTestId('mas-opciones');
  let abierto = null;
  if (await mas.count()) {
    await mas.click();
    await pagina.waitForTimeout(500);
    abierto = await pagina.evaluate(revisa);
    await pagina.screenshot({ path: join(SALIDA, `${p.nombre}-abierto.png`), fullPage: true });
  }

  const pantallas = (alto) => (alto / p.alto).toFixed(1);
  console.log(`\n${p.nombre} (${p.ancho}x${p.alto})`);
  console.log(`  alto: ${plegado.alturaDocumento} px — ${pantallas(plegado.alturaDocumento)} pantallas` +
    (abierto ? `, abierto ${abierto.alturaDocumento} px (${pantallas(abierto.alturaDocumento)})` : ''));

  for (const [momento, r] of [['plegado', plegado], ['abierto', abierto]].filter(([, r]) => r)) {
    if (r.scrollHorizontal) { console.log(`  ✗ ${momento}: se puede hacer scroll lateral, ${r.scrollHorizontal} px`); problemas++; }
    for (const d of r.desbordes) { console.log(`  ✗ ${momento}: ${d.que} se sale ${d.sobra} px`); problemas++; }
    for (const c of r.recortados) { console.log(`  ✗ ${momento}: ${c.que} ${c.id} recorta su contenido (cabe ${c.cabe}, necesita ${c.necesita})`); problemas++; }
    for (const d of r.dedoPequeno) { console.log(`  · ${momento}: ${d.que} ${d.id} mide ${d.ancho}x${d.alto}, por debajo de 44`); }
  }
}

await navegador.close();
console.log(`\nCapturas en scripts/movil/capturas/`);
console.log(problemas ? `\n${problemas} cosa(s) que arreglar antes del móvil.` : '\nNada que se salga ni se recorte.');
process.exit(problemas ? 1 : 0);
