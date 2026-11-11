import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import es from '../i18n/locales/es/auth.json';
import en from '../i18n/locales/en/auth.json';

/**
 * FE-08 (fase 4 del plan a 9): con `escapeValue: false` (lo pide React, que ya escapa),
 * `<Trans>` metía el correo dentro del texto que luego analiza, así que un correo con
 * etiquetas (`<strong>…</strong>`, `<correo>…`) se convertía en marcado. Ahora el texto
 * solo lleva el hueco `<correo/>` y el correo entra como contenido del elemento: nunca
 * se analiza. Con la configuración real de i18next, no con un Trans de mentira.
 */
vi.mock('../composition', () => ({ resendVerificationEmailUseCase: { execute: vi.fn() } }));

const { default: EmailVerificationBanner } = await import('./EmailVerificationBanner');

const i18n = i18next.createInstance();
beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: 'es',
    fallbackLng: 'es',
    ns: ['auth'],
    defaultNS: 'auth',
    resources: { es: { auth: es }, en: { auth: en } },
    // Como la app (i18n/config.js)
    interpolation: { escapeValue: false },
  });
});

const pinta = (correo, lng = 'es') => {
  i18n.changeLanguage(lng);
  return render(
    <I18nextProvider i18n={i18n}>
      <EmailVerificationBanner userEmail={correo} />
    </I18nextProvider>,
  );
};

describe('EmailVerificationBanner · el correo es texto (FE-08)', () => {
  it.each(['es', 'en'])('[%s] el correo sale en negrita dentro del mensaje', (lng) => {
    pinta('ana@example.com', lng);

    const correo = screen.getByText('ana@example.com');
    expect(correo.tagName).toBe('STRONG');
    expect(correo.className).toContain('wrap-anywhere');
  });

  it.each([
    '<strong>x</strong>@example.com',
    '<correo>x</correo>@example.com',
    '<1>x</1>@example.com',
    '<img src=x onerror=alert(1)>@example.com',
  ])('un correo con etiquetas sale tal cual, como texto: %s', (correo) => {
    const { container } = pinta(correo);

    expect(screen.getByText(correo).tagName).toBe('STRONG');
    expect(container.querySelectorAll('strong')).toHaveLength(1);
    expect(container.querySelector('img')).toBeNull();
  });
});
