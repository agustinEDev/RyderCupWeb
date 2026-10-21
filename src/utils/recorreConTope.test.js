import { describe, it, expect } from 'vitest';
import { recorreConTope } from './recorreConTope';

/**
 * LA TABLA — recorrer una lista con un tope de tareas a la vez (FE #418).
 *
 *   caso                                  | qué pasa
 *   --------------------------------------|----------------------------------
 *   más elementos que el tope             | nunca hay más de `tope` en vuelo
 *   una acaba                             | entra la siguiente, sin esperar
 *                                         | a que acabe la tanda entera
 *   una falla                             | las demás siguen
 *   `sigue` pasa a falso                  | no empieza ninguna más; las que
 *                                         | ya estaban en vuelo terminan
 *   lista vacía                           | resuelve sin llamar a nada
 */

// Una tarea que no acaba hasta que el test lo dice
const controlable = () => {
  const llamadas = [];
  let enVuelo = 0;
  let maximo = 0;
  const tarea = (elemento) =>
    new Promise((resolve, reject) => {
      enVuelo += 1;
      maximo = Math.max(maximo, enVuelo);
      llamadas.push({
        elemento,
        resolve: (v) => { enVuelo -= 1; resolve(v); },
        reject: (e) => { enVuelo -= 1; reject(e); },
      });
    });
  return { tarea, llamadas, maximo: () => maximo };
};

const respira = () => new Promise((r) => setTimeout(r, 0));

describe('recorreConTope', () => {
  it('nunca tiene más de `tope` tareas en vuelo', async () => {
    const { tarea, llamadas, maximo } = controlable();
    const fin = recorreConTope([1, 2, 3, 4, 5, 6, 7], 3, tarea);

    expect(llamadas.map((l) => l.elemento)).toEqual([1, 2, 3]);
    while (llamadas.some((l) => !l.hecha)) {
      const pendiente = llamadas.find((l) => !l.hecha);
      pendiente.hecha = true;
      pendiente.resolve();
      await respira();
    }
    await fin;

    expect(llamadas.map((l) => l.elemento)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(maximo()).toBe(3);
  });

  it('en cuanto acaba una entra la siguiente, sin esperar a la tanda', async () => {
    const { tarea, llamadas } = controlable();
    recorreConTope([1, 2, 3, 4], 2, tarea);

    llamadas[1].resolve();
    await respira();

    expect(llamadas.map((l) => l.elemento)).toEqual([1, 2, 3]);
  });

  it('si una falla, las demás siguen', async () => {
    const { tarea, llamadas } = controlable();
    const fin = recorreConTope([1, 2, 3], 1, tarea);

    llamadas[0].reject(new Error('caída'));
    await respira();
    llamadas[1].resolve();
    await respira();
    llamadas[2].resolve();

    await expect(fin).resolves.toBeUndefined();
    expect(llamadas.map((l) => l.elemento)).toEqual([1, 2, 3]);
  });

  it('cuando `sigue` pasa a falso no empieza ninguna más', async () => {
    const { tarea, llamadas } = controlable();
    let vigente = true;
    const fin = recorreConTope([1, 2, 3, 4], 2, tarea, { sigue: () => vigente });

    vigente = false;
    llamadas[0].resolve();
    llamadas[1].resolve();
    await fin;

    expect(llamadas.map((l) => l.elemento)).toEqual([1, 2]);
  });

  it('con la lista vacía resuelve sin llamar a nada', async () => {
    const { tarea, llamadas } = controlable();

    await recorreConTope([], 5, tarea);

    expect(llamadas).toEqual([]);
  });
});
