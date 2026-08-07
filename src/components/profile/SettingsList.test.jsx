import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Shield } from 'lucide-react';
import { SettingsGroup, SettingsRow, SettingsControlRow } from './SettingsList';

const renderInRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

/**
 * Lista de ajustes del perfil (FE #324).
 */
describe('SettingsList', () => {
  it('groups rows under a heading', () => {
    renderInRouter(
      <SettingsGroup title="Cuenta">
        <SettingsRow label="Editar perfil" onClick={vi.fn()} />
      </SettingsGroup>
    );

    expect(screen.getByRole('heading', { name: 'Cuenta' })).toBeInTheDocument();
  });

  it('renders a navigating row as a real link', () => {
    // Un boton con navigate() no se puede abrir en otra pestana ni se anuncia
    // como enlace
    renderInRouter(<SettingsRow label="Términos" to="/terms" />);

    expect(screen.getByRole('link', { name: /Términos/ })).toHaveAttribute('href', '/terms');
  });

  it('renders an action row as a button and fires it', () => {
    const onClick = vi.fn();
    renderInRouter(<SettingsRow label="Cerrar sesión" onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: /Cerrar sesión/ }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('keeps rows at the minimum touch target', () => {
    renderInRouter(<SettingsRow label="Editar perfil" icon={Shield} onClick={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Editar perfil/ }).className).toContain('min-h-[44px]');
  });

  it('marks a destructive row without turning it into a solid red block', () => {
    renderInRouter(<SettingsRow label="Cerrar sesión" onClick={vi.fn()} tone="danger" />);

    const row = screen.getByRole('button', { name: /Cerrar sesión/ });
    expect(row.className).toContain('text-red-600');
    expect(row.className).not.toContain('bg-red-600');
    expect(row.className).not.toContain('bg-red-500');
  });

  it('hosts its own control instead of a chevron', () => {
    renderInRouter(
      <SettingsControlRow label="Idioma">
        <button type="button">ES</button>
      </SettingsControlRow>
    );

    expect(screen.getByRole('button', { name: 'ES' })).toBeInTheDocument();
  });
});
