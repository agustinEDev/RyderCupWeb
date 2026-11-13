import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
// Como en la app: con la interfaz del transporte registrada, un rechazo avisa a Sentry
import '../../composition/interfazDelTransporte';
import Avatar from './Avatar';

/**
 * Un id que no vale para una ruta (`.`, `..`) pinta el icono, y el render no avisa a
 * Sentry: se pintaría en cada render (code-review, 11 nov 2026).
 */
const informado = vi.hoisted(() => []);
vi.mock('../../utils/sentryHelpers', async (original) => ({
  ...(await original()),
  captureError: vi.fn((...args) => informado.push(args)),
}));

describe('Avatar · id que no vale', () => {
  it.each(['.', '..', 'a/b', 'a\\b'])(
    '%j: el icono, sin avisar a Sentry',
    (id) => {
      const { container, rerender } = render(<Avatar userId={id} />);
      rerender(<Avatar userId={id} size="lg" />);

      expect(container.querySelector('img')).toBeNull();
      expect(informado).toEqual([]);
    },
  );
});
