import { describe, it, expect } from 'vitest';

/**
 * Ninguna pantalla aparece desde invisible al entrar en ella.
 *
 * El 3 nov 2026, en el iPhone, Agustín vio parpadear Torneos al pulsar su
 * pestaña: el título, el buscador y las tarjetas arrancaban a opacidad 0 y
 * entraban con un fundido, y durante un instante la pantalla se quedaba en
 * blanco. Pasaba igual en 31 ficheros. Decidido con él: cada pantalla sale ya
 * pintada. Este test lee el código para que no vuelva a colarse.
 *
 * LA TABLA (aprobada el 3 nov 2026):
 *
 *   #   | qué                                          | fundido
 *   ----|----------------------------------------------|-------------------
 *   A1  | al entrar en una pantalla de la aplicación   | no
 *   A2  | al entrar en las públicas y las de acceso    | no
 *   A3  | el vacío de Torneos                          | no
 *   A4  | las tarjetas de Torneos                      | no, nunca
 *   B1  | la caja de un modal, al abrirlo              | sí: lo abre un gesto
 *   B2  | error de un campo, requisitos de la          | sí: reaccionan a lo
 *       | contraseña, mensaje de éxito                 | que se escribe
 *   B3  | filas de barras de `GolfCourseForm`          | sí: obsoleto, no se toca
 */
const fuentes = import.meta.glob(['/src/**/*.jsx', '!/src/**/*.test.jsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

// `initial` que arranca invisible, sea un objeto o una expresión que lo lleve
const DESDE_INVISIBLE = /initial=\{[^}]*?\{\s*opacity:\s*0\b/g;

// Lo que puede quedarse (B1-B3), mirando lo que precede a la animación
const ANTES = 160;
const permitida = (fichero, codigo, posicion) => {
  const antes = codigo.slice(Math.max(0, posicion - ANTES), posicion);
  const etiqueta = antes.slice(antes.lastIndexOf('<'));
  if (/boxClassName=/.test(antes)) return 'B1';
  if (etiqueta.startsWith('<motion.p')) return 'B2';
  if (/(successMessage|showSuccess) &&/.test(antes)) return 'B2';
  if (fichero.endsWith('/components/ui/PasswordRequirements.jsx')) return 'B2';
  if (fichero.endsWith('/components/golf_course/GolfCourseForm.jsx')) return 'B3';
  return null;
};

const linea = (codigo, posicion) => codigo.slice(0, posicion).split('\n').length;

describe('ninguna pantalla aparece desde invisible al entrar', () => {
  it('solo los modales, los avisos de los campos y lo obsoleto conservan su fundido', () => {
    const fundidos = [];
    for (const [fichero, codigo] of Object.entries(fuentes)) {
      for (const m of codigo.matchAll(DESDE_INVISIBLE)) {
        if (!permitida(fichero, codigo, m.index)) fundidos.push(`${fichero}:${linea(codigo, m.index)}`);
      }
    }
    expect(fundidos).toEqual([]);
  });

  it('el detector ve las animaciones que sí se permiten (no está ciego)', () => {
    const permitidas = [];
    for (const [fichero, codigo] of Object.entries(fuentes)) {
      for (const m of codigo.matchAll(DESDE_INVISIBLE)) {
        const tipo = permitida(fichero, codigo, m.index);
        if (tipo) permitidas.push(tipo);
      }
    }
    expect(permitidas).toContain('B1');
    expect(permitidas).toContain('B2');
    expect(permitidas).toContain('B3');
  });
});
