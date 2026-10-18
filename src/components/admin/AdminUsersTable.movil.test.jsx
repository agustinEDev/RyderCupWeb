import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import AdminUsersTable from './AdminUsersTable';

/**
 * Usuarios en el móvil (17 oct, entrega 5): filas a todo el ancho y una ficha
 * que sube desde abajo con los datos y las acciones. En el ordenador sigue la
 * tabla. Casos F1, F2 y F8 aprobados en el chat.
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, o) => (o ? `${key} ${JSON.stringify(o)}` : key),
    i18n: { language: 'en' },
  }),
}));

const ANA = {
  id: 'u1',
  firstName: 'Ana',
  lastName: 'Ruiz',
  alias: 'Anita',
  email: 'ana@test.com',
  handicap: 17.7,
  isAdmin: false,
  isActive: true,
  // Verificado y activo, a la contra en cada uno: así no se confunden
  emailVerified: false,
  createdAt: '2026-07-27T00:00:00Z',
  lastLoginAt: '2026-07-30T10:00:00Z',
};
const LUIS = { ...ANA, id: 'u2', firstName: 'Luis', lastName: 'Gil', alias: null, email: 'luis@test.com', isAdmin: true, isActive: false, emailVerified: true, handicap: null, lastLoginAt: null };

const pintar = (props = {}) => {
  const manos = { onEdit: vi.fn(), onToggleActive: vi.fn(), onManageDelete: vi.fn() };
  render(<AdminUsersTable users={[ANA, LUIS]} {...manos} {...props} />);
  return manos;
};
const lista = () => screen.getByRole('list', { name: 'users.listLabel' });
const fila = (nombre) => within(lista()).getByRole('button', { name: new RegExp(nombre) });
const ficha = () => screen.getByRole('dialog');

describe('AdminUsersTable · móvil', () => {
  it('F1/F8: en el móvil, filas; en el ordenador, la tabla', () => {
    pintar();

    expect(lista()).toHaveClass('md:hidden');
    expect(screen.getByRole('table').parentElement).toHaveClass('hidden', 'md:block');
    expect(within(lista()).getAllByRole('button')).toHaveLength(2);
    for (const boton of within(lista()).getAllByRole('button')) expect(boton).toHaveClass('w-full');
  });

  it('F1: la fila dice el nombre con su alias y el correo debajo', () => {
    pintar();

    expect(fila('Ana Ruiz')).toHaveTextContent('Ana Ruiz«Anita»ana@test.com');
    expect(fila('Luis Gil')).toHaveTextContent('Luis Gilluis@test.com');
  });

  it('F1: «Admin» e «Inactivo» solo si aplican', () => {
    pintar();

    expect(fila('Ana Ruiz')).not.toHaveTextContent('users.roleAdmin');
    expect(fila('Ana Ruiz')).not.toHaveTextContent('users.statusInactive');
    expect(fila('Ana Ruiz')).not.toHaveTextContent('users.rolePlayer');
    expect(fila('Ana Ruiz')).not.toHaveTextContent('users.statusActive');
    expect(fila('Luis Gil')).toHaveTextContent('users.roleAdmin');
    expect(fila('Luis Gil')).toHaveTextContent('users.statusInactive');
  });

  it('F2: tocar la fila abre su ficha con todos sus datos', () => {
    pintar();
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(fila('Ana Ruiz'));

    expect(ficha()).toHaveAccessibleName('Ana Ruiz «Anita»');
    expect(ficha()).toHaveTextContent('ana@test.com');
    const dato = (clave) => within(ficha()).getByText(clave).nextElementSibling;
    expect(dato('users.columnHandicap')).toHaveTextContent('17.7');
    expect(dato('users.columnRole')).toHaveTextContent('users.rolePlayer');
    expect(dato('users.columnStatus')).toHaveTextContent('users.statusActive');
    expect(dato('users.filterVerified')).toHaveTextContent('users.filterVerifiedNo');
    expect(dato('users.columnJoined')).toHaveTextContent(new Date(ANA.createdAt).toLocaleDateString('en'));
    expect(dato('users.columnLastLogin')).toHaveTextContent(new Date(ANA.lastLoginAt).toLocaleDateString('en'));
  });

  it('F2: lo que falta, con su guion o «nunca»', () => {
    pintar();
    fireEvent.click(fila('Luis Gil'));

    expect(ficha()).toHaveAccessibleName('Luis Gil');
    const dato = (clave) => within(ficha()).getByText(clave).nextElementSibling;
    expect(dato('users.columnHandicap')).toHaveTextContent('—');
    expect(dato('users.columnRole')).toHaveTextContent('users.roleAdmin');
    expect(dato('users.columnStatus')).toHaveTextContent('users.statusInactive');
    expect(dato('users.filterVerified')).toHaveTextContent('users.filterVerifiedYes');
    expect(dato('users.columnLastLogin')).toHaveTextContent('users.lastLoginNever');
  });

  it.each([
    ['users.editTooltip', 'onEdit'],
    ['users.deactivateTooltip', 'onToggleActive'],
    ['users.deleteTooltip', 'onManageDelete'],
  ])('F2: «%s» cierra la ficha y hace lo de siempre', (accion, mano) => {
    const manos = pintar();
    fireEvent.click(fila('Ana Ruiz'));
    fireEvent.click(within(ficha()).getByRole('button', { name: accion }));

    expect(manos[mano]).toHaveBeenCalledWith(ANA);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('F2: una cuenta desactivada se reactiva', () => {
    const manos = pintar();
    fireEvent.click(fila('Luis Gil'));

    expect(within(ficha()).queryByRole('button', { name: 'users.deactivateTooltip' })).toBeNull();
    fireEvent.click(within(ficha()).getByRole('button', { name: 'users.reactivateTooltip' }));
    expect(manos.onToggleActive).toHaveBeenCalledWith(LUIS);
  });

  it('F2: de la ficha se sale con «Cerrar» y con Escape, sin hacer nada', () => {
    const manos = pintar();
    fireEvent.click(fila('Ana Ruiz'));
    fireEvent.click(within(ficha()).getByRole('button', { name: 'common:close' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(fila('Ana Ruiz'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(Object.values(manos).every((m) => m.mock.calls.length === 0)).toBe(true);
  });

  it('F2: la ficha sube desde abajo', () => {
    pintar();
    fireEvent.click(fila('Ana Ruiz'));

    expect(ficha()).toHaveClass('items-end');
  });

  it('/code-review: la ficha respeta la barra de inicio del iPhone y la altura visible', () => {
    pintar();
    fireEvent.click(fila('Ana Ruiz'));
    const caja = ficha().firstElementChild;

    expect(caja).toHaveClass('pb-[calc(1.25rem+env(safe-area-inset-bottom))]', 'max-h-[85dvh]');
  });

  it('/code-review: las marcas de la fila no se encogen', () => {
    pintar();

    for (const marca of within(fila('Luis Gil')).getAllByText(/users\.(roleAdmin|statusInactive)/)) {
      expect(marca).toHaveClass('flex-shrink-0');
    }
  });

  it('/code-review: con la ficha abierta, si la lista cambia, la ficha enseña lo de ahora; si el usuario ya no está, se cierra', () => {
    const manos = { onEdit: vi.fn(), onToggleActive: vi.fn(), onManageDelete: vi.fn() };
    const { rerender } = render(<AdminUsersTable users={[ANA, LUIS]} {...manos} />);
    fireEvent.click(fila('Ana Ruiz'));
    rerender(<AdminUsersTable users={[{ ...ANA, isActive: false }, LUIS]} {...manos} />);

    expect(within(ficha()).getByText('users.columnStatus').nextElementSibling).toHaveTextContent('users.statusInactive');
    rerender(<AdminUsersTable users={[LUIS]} {...manos} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
