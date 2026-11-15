import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import ResumenDeLaCompeticion from './ResumenDeLaCompeticion';

/**
 * F1 · «Inscripción abierta hasta el {día} a las 12:00» en la ficha, mientras
 * la inscripción está abierta (15 nov 2026; RyderCupAm #865).
 *
 *   caso                                          | qué se ve
 *   ----------------------------------------------|---------------------------------------------
 *   S1 abierta, con plazo que vale y en el futuro  | «Inscripción abierta hasta el 13 de noviembre a las 12:00»
 *   S2 el plazo ya pasó                            | nada
 *   S3 no vale (abierta a mano pasado el plazo)    | nada
 *   S4 cerrada                                     | nada
 */
const t = (clave, p) => (p ? `${clave} ${JSON.stringify(p)}` : clave);

const pinta = (competition) =>
  render(
    <MemoryRouter>
      <ResumenDeLaCompeticion
        competition={{
          id: 'c-1',
          name: 'Ryder',
          status: 'ACTIVE',
          visibility: 'PUBLIC',
          startDate: '2026-11-14',
          endDate: '2026-11-15',
          countries: [],
          enrollmentDeadline: '2026-11-13T12:00:00+01:00',
          enrollmentDeadlineApplies: true,
          ...competition,
        }}
        t={t}
        i18n={{ language: 'es' }}
        isCreator={false}
        canManage={false}
        approvedCount={0}
        fechaDeAperturaLegible={null}
      />
    </MemoryRouter>,
  );

describe('ResumenDeLaCompeticion · el plazo de inscripción', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-10T09:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('S1: Given abierta con plazo en el futuro, When se pinta, Then «hasta el 13 de noviembre a las 12:00»', () => {
    pinta({});

    expect(screen.getByTestId('plazo-de-inscripcion')).toHaveTextContent(
      'detail.enrollmentOpenUntil {"dia":"13 de noviembre","hora":"12:00"}',
    );
  });

  it('S2: Given el plazo ya pasó, When se pinta, Then nada', () => {
    vi.setSystemTime(new Date('2026-11-13T12:30:00+01:00'));
    pinta({});

    expect(screen.queryByTestId('plazo-de-inscripcion')).toBeNull();
  });

  it('S3: Given no vale para ella, When se pinta, Then nada', () => {
    pinta({ enrollmentDeadlineApplies: false });

    expect(screen.queryByTestId('plazo-de-inscripcion')).toBeNull();
  });

  it('S4: Given cerrada, When se pinta, Then nada', () => {
    pinta({ status: 'CLOSED' });

    expect(screen.queryByTestId('plazo-de-inscripcion')).toBeNull();
  });
});
