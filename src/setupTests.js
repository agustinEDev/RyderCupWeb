import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Ejecuta una función de limpieza después de cada test para limpiar el DOM
afterEach(() => {
  cleanup();
});
