import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// jsdom no implementa `scrollIntoView`: sin esto, cualquier componente que
// lleve un aviso a los ojos revienta en los tests que no lo esperaban
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// Ejecuta una función de limpieza después de cada test para limpiar el DOM
afterEach(() => {
  cleanup();
});
