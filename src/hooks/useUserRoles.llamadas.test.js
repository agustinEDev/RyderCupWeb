import { describe, it, expect } from 'vitest';

/**
 * Guardián de los que llaman a `useUserRoles` (A01, tanda T4).
 *
 * Los roles van por la pareja competición + usuario: si una pantalla dejara de
 * pasar el usuario, los roles calculados para otra cuenta podrían valer para la
 * actual y nadie se enteraría, porque los tests de las pantallas sustituyen el
 * hook. Aquí se lee el código de cada llamada y se exige que pase las dos cosas.
 */
const fuentes = import.meta.glob(
  ['/src/**/*.{js,jsx}', '!/src/**/*.test.{js,jsx}', '!/src/hooks/useUserRoles.jsx'],
  { query: '?raw', import: 'default', eager: true }
);

const llamadas = Object.entries(fuentes).flatMap(([fichero, codigo]) =>
  [...codigo.matchAll(/useUserRoles\(([^)]*)\)/g)].map((m) => [fichero, m[1]])
);

describe('useUserRoles · quien lo llama pasa competición y usuario', () => {
  // Si el glob dejara de encontrar las pantallas, el resto pasaría sin mirar nada
  it('encuentra a los que lo llaman', () => {
    expect(llamadas.length).toBeGreaterThanOrEqual(4);
  });

  it.each(llamadas)('%s pasa la competición y el id del usuario', (_fichero, argumentos) => {
    const partes = argumentos
      .split(',')
      .map((parte) => parte.trim())
      .filter(Boolean);
    expect(partes).toHaveLength(2);
    // `user?.id`, o el mismo valor ya guardado en `userId` (como CompetitionDetail)
    expect(partes[1]).toMatch(/^(?:user\?\.id|userId)$/);
  });
});
