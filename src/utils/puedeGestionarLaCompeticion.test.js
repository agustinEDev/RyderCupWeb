import { describe, it, expect } from 'vitest';
import { puedeGestionarLaCompeticion } from './puedeGestionarLaCompeticion';

describe('puedeGestionarLaCompeticion', () => {
  /*
   *   creador | rol de organizador | admin | gestiona
   *   --------|--------------------|-------|---------
   *   sí      | no                 | no    | sí
   *   no      | sí                 | no    | sí
   *   no      | no                 | sí    | sí
   *   no      | no                 | no    | no
   */
  it.each([
    ['el creador', 'yo', false, false, true],
    ['quien tiene el rol', 'otro', true, false, true],
    ['un admin', 'otro', false, true, true],
    ['nadie más', 'otro', false, false, false],
  ])('%s', (_, creatorId, hasCreatorRole, isAdmin, esperado) => {
    expect(
      puedeGestionarLaCompeticion({
        creatorId,
        userId: 'yo',
        hasCreatorRole,
        isAdmin,
      }),
    ).toBe(esperado);
  });

  it.each([
    ['ni aunque falte también el creador', false, false],
    ['ni con el rol de organizador', true, false],
    ['ni como admin', false, true],
  ])(
    'sin usuario identificado nadie gestiona: %s',
    (_, hasCreatorRole, isAdmin) => {
      expect(
        puedeGestionarLaCompeticion({
          creatorId: undefined,
          userId: undefined,
          hasCreatorRole,
          isAdmin,
        }),
      ).toBe(false);
    },
  );
});
