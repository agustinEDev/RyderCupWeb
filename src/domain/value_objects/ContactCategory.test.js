import { describe, it, expect } from 'vitest';
import { ContactCategory } from './ContactCategory';

// Los valores, tal cual circulan (support/domain/value_objects/contact_category.py)
const DEL_BACKEND = ['BUG', 'FEATURE', 'QUESTION', 'OTHER'];

describe('ContactCategory', () => {
  it('tiene los valores del backend, en el mismo orden y con la misma grafía', () => {
    expect(Object.values(ContactCategory)).toEqual(DEL_BACKEND);
  });

  it('cada clave vale lo mismo que su nombre', () => {
    for (const [clave, valor] of Object.entries(ContactCategory)) {
      expect(valor).toBe(clave);
    }
  });

  it('no se puede cambiar', () => {
    expect(Object.isFrozen(ContactCategory)).toBe(true);
  });
});
