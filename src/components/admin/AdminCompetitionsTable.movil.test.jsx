import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import AdminCompetitionsTable from './AdminCompetitionsTable';

/**
 * Competiciones en el móvil (17 oct, entrega 5): una fila por competición y su
 * ficha con las acciones. Casos F5, F6 y F8 aprobados en el chat.
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'en' } }),
}));

const competicion = (id, status, extra = {}) => ({
  id,
  name: `Copa ${id}`,
  status,
  startDate: '2026-11-01',
  endDate: '2026-11-03',
  creator: { firstName: 'Ana', lastName: 'Ruiz' },
  ...extra,
});
const BORRADOR = competicion('b', 'DRAFT');
const CERRADA = competicion('c', 'CLOSED', { creator: null });
const fechas = `${new Date('2026-11-01').toLocaleDateString('en')} – ${new Date('2026-11-03').toLocaleDateString('en')}`;

const pintar = (props = {}) => {
  const manos = { onEdit: vi.fn(), onTransition: vi.fn() };
  render(<AdminCompetitionsTable competitions={[BORRADOR, CERRADA]} {...manos} {...props} />);
  return manos;
};
const lista = () => screen.getByRole('list', { name: 'competitions.listLabel' });
const fila = (nombre) => within(lista()).getByRole('button', { name: new RegExp(nombre) });
const ficha = () => screen.getByRole('dialog');

describe('AdminCompetitionsTable · móvil', () => {
  it('F5/F8: en el móvil, filas; en el ordenador, la tabla', () => {
    pintar();

    expect(lista()).toHaveClass('md:hidden');
    expect(screen.getByRole('table').parentElement).toHaveClass('hidden', 'md:block');
    for (const boton of within(lista()).getAllByRole('button')) expect(boton).toHaveClass('w-full');
  });

  it('F5: la fila dice el nombre y, debajo, el estado y las fechas', () => {
    pintar();

    expect(fila('Copa b')).toHaveTextContent(`Copa bstatus.DRAFT${fechas}`);
    expect(fila('Copa c')).toHaveTextContent(`Copa cstatus.CLOSED${fechas}`);
  });

  it('F6: la ficha dice el creador, el estado y las fechas', () => {
    pintar();
    fireEvent.click(fila('Copa b'));

    expect(ficha()).toHaveAccessibleName('Copa b');
    const dato = (clave) => within(ficha()).getByText(clave).nextElementSibling;
    expect(dato('competitions.columnCreator')).toHaveTextContent('Ana Ruiz');
    expect(dato('competitions.columnStatus')).toHaveTextContent('status.DRAFT');
    expect(dato('competitions.columnDates')).toHaveTextContent(fechas);
  });

  it('F6: sin creador, se dice', () => {
    pintar();
    fireEvent.click(fila('Copa c'));

    expect(within(ficha()).getByText('competitions.columnCreator').nextElementSibling).toHaveTextContent('competitions.unknownCreator');
  });

  it('F6: en borrador se edita, y editar cierra la ficha', () => {
    const manos = pintar();
    fireEvent.click(fila('Copa b'));
    fireEvent.click(within(ficha()).getByRole('button', { name: 'competitions.editTooltip' }));

    expect(manos.onEdit).toHaveBeenCalledWith(BORRADOR);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('F6: fuera de borrador no hay «Editar»; sí los cambios de su estado', () => {
    pintar();
    fireEvent.click(fila('Copa c'));

    expect(within(ficha()).queryByRole('button', { name: /competitions.edit/ })).toBeNull();
    const acciones = within(ficha()).getAllByRole('button').map((b) => b.textContent).filter((x) => x.startsWith('competitions.actions'));
    expect(acciones).toEqual(['competitions.actions.start', 'competitions.actions.reopenEnrollments', 'competitions.actions.cancel']);
  });

  it.each(['start', 'cancel'])('F6: «%s» cierra la ficha y lo hace como siempre (cancelar pide confirmación fuera)', (accion) => {
    const manos = pintar();
    fireEvent.click(fila('Copa c'));
    fireEvent.click(within(ficha()).getByRole('button', { name: `competitions.actions.${accion}` }));

    expect(manos.onTransition).toHaveBeenCalledWith(CERRADA, accion);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('F6: mientras cambia un estado, las acciones de la ficha no se pueden tocar', () => {
    pintar({ disabled: true });
    fireEvent.click(fila('Copa b'));

    for (const boton of within(ficha()).getAllByRole('button').filter((b) => b.textContent.startsWith('competitions.'))) {
      expect(boton).toBeDisabled();
    }
    expect(within(ficha()).getByRole('button', { name: 'common:close' })).toBeEnabled();
  });

  it('F6: de la ficha se sale con «Cerrar», sin hacer nada', () => {
    const manos = pintar();
    fireEvent.click(fila('Copa b'));
    fireEvent.click(within(ficha()).getByRole('button', { name: 'common:close' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(manos.onEdit).not.toHaveBeenCalled();
    expect(manos.onTransition).not.toHaveBeenCalled();
  });

  it('/code-review: con la ficha abierta, si la competición cambia de estado, la ficha da las acciones de ahora', () => {
    const manos = { onEdit: vi.fn(), onTransition: vi.fn() };
    const { rerender } = render(<AdminCompetitionsTable competitions={[BORRADOR, CERRADA]} {...manos} />);
    fireEvent.click(fila('Copa b'));
    rerender(<AdminCompetitionsTable competitions={[{ ...BORRADOR, status: 'ACTIVE' }, CERRADA]} {...manos} />);

    expect(within(ficha()).queryByRole('button', { name: 'competitions.editTooltip' })).toBeNull();
    expect(within(ficha()).getByRole('button', { name: 'competitions.actions.closeEnrollments' })).toBeInTheDocument();
    rerender(<AdminCompetitionsTable competitions={[CERRADA]} {...manos} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it.each(['ACTIVE', 'CLOSED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])('G1: fuera de borrador (%s), la ficha dice por qué no se edita, antes de los botones', (estado) => {
    render(<AdminCompetitionsTable competitions={[competicion('x', estado)]} onEdit={vi.fn()} onTransition={vi.fn()} />);
    fireEvent.click(fila('Copa x'));

    const aviso = within(ficha()).getByText('competitions.editDisabledTooltip');
    expect(aviso).toHaveClass('text-gray-500');
    const primerBoton = within(ficha()).getAllByRole('button')[0];
    expect(aviso.compareDocumentPosition(primerBoton) & globalThis.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('G2: en borrador no hay aviso, porque se puede editar', () => {
    pintar();
    fireEvent.click(fila('Copa b'));

    expect(within(ficha()).queryByText('competitions.editDisabledTooltip')).toBeNull();
  });
});
