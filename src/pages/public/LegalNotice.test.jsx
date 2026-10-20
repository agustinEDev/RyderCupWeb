import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import es from '../../i18n/locales/es/legal.json';
import en from '../../i18n/locales/en/legal.json';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));
// La cabecera y el pie tienen sus propios tests; aquí solo estorban
vi.mock('../../components/layout/Header', () => ({ default: () => null }));
vi.mock('../../components/layout/Footer', () => ({ default: () => null }));

const { default: LegalNotice } = await import('./LegalNotice');

/**
 * Aviso Legal (auditoría del 20 oct 2026). La LSSI pide que un sitio que presta
 * un servicio identifique a su titular de forma permanente, fácil y directa: el
 * servicio lo presta una persona física, no una empresa con el nombre comercial.
 */

const abrir = () =>
  render(
    <MemoryRouter>
      <LegalNotice />
    </MemoryRouter>
  );

const todoElTexto = (bloque) => JSON.stringify(bloque);

describe('Aviso Legal · la página', () => {
  it('A1: pinta el título, la fecha y todas sus secciones', () => {
    abrir();

    expect(screen.getByRole('heading', { level: 1, name: 'legalNotice.title' })).toBeInTheDocument();
    expect(screen.getByText('legalNotice.lastUpdated')).toBeInTheDocument();
    for (const n of [1, 2, 3, 4, 5, 6, 7]) {
      expect(screen.getByRole('heading', { level: 2, name: `legalNotice.section${n}.title` })).toBeInTheDocument();
    }
  });

  it.each([
    ['rfeg', 'https://www.rfegolf.es'],
    ['osm', 'https://www.openstreetmap.org/copyright'],
    ['pnoa', 'https://www.scne.es'],
    ['icgc', 'https://www.icgc.cat'],
    ['geoeuskadi', 'https://www.geo.euskadi.eus'],
    ['idena', 'https://idena.navarra.es'],
    ['maplibre', 'https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt'],
  ])('F5: la fuente %s enlaza a %s en pestaña nueva', (fuente, url) => {
    abrir();

    const enlace = screen.getByRole('link', { name: `legalNotice.section6.sources.${fuente}.name` });
    expect(enlace).toHaveAttribute('href', url);
    expect(enlace).toHaveAttribute('target', '_blank');
    expect(enlace).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.getByText(`legalNotice.section6.sources.${fuente}.detail`)).toBeInTheDocument();
  });

  it('A2: tiene su ruta en App.jsx', () => {
    const app = readFileSync(resolve(process.cwd(), 'src/App.jsx'), 'utf8');

    expect(app).toContain('<Route path="/legal" element={<LegalNotice />} />');
  });
});

describe('Aviso Legal · los textos', () => {
  it.each([
    ['es', es],
    ['en', en],
  ])('A1/A5 (%s): identifica al titular con nombre, NIF, domicilio y correo', (_idioma, textos) => {
    const titular = textos.legalNotice.section1.content;

    expect(titular).toContain('Agustín Estévez Domínguez');
    expect(titular).toContain('76826889N');
    expect(titular).toContain('Germán Adrio Sobrido, 10 - 1D');
    expect(titular).toContain('36003 Pontevedra');
    expect(titular).toContain('agustin.estevez.dominguez@gmail.com');
  });

  it.each([
    ['es', es, '20 de octubre de 2026'],
    ['en', en, '20 October 2026'],
  ])('A1 (%s): fecha de la última actualización', (_idioma, textos, fecha) => {
    expect(textos.legalNotice.lastUpdated).toContain(fecha);
  });

  it.each([
    ['es', es, /ley española/i, /consumidor/i],
    ['en', en, /Spanish law/i, /consumer/i],
  ])('A1 (%s): ley española sin quitar los derechos del consumidor', (_idioma, textos, ley, consumidor) => {
    const texto = textos.legalNotice.section7.content;

    expect(texto).toMatch(ley);
    expect(texto).toMatch(consumidor);
  });

  it.each([
    ['es', es],
    ['en', en],
  ])('F5 (%s): fuentes de datos con sus licencias', (_idioma, textos) => {
    const fuentes = todoElTexto(textos.legalNotice.section6);

    expect(fuentes).toContain('RFEG');
    expect(fuentes).toContain('© OpenStreetMap contributors');
    expect(fuentes).toContain('ODbL');
    expect(fuentes).toContain('PNOA');
    expect(fuentes).toContain('IGN');
    expect(fuentes).toContain('ICGC');
    expect(fuentes).toContain('geoEuskadi');
    expect(fuentes).toContain('IDENA');
    expect(fuentes).toContain('CC BY 4.0');
    expect(fuentes).toContain('MapLibre');
    expect(fuentes).toContain('BSD-3-Clause');
  });

  it.each([
    ['es', es],
    ['en', en],
  ])('A1 (%s): no presenta el nombre comercial como si fuera la empresa titular', (_idioma, textos) => {
    expect(textos.legalNotice.section1.content).not.toMatch(/operado por RyderCupFriends|operated by RyderCupFriends/i);
  });
});
