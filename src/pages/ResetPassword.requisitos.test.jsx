import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave) => clave, i18n: { language: 'es' } }),
}));
vi.mock('../composition', () => ({
  validateResetTokenUseCase: { execute: vi.fn().mockResolvedValue({ valid: true }) },
  resetPasswordUseCase: { execute: vi.fn() },
}));

const { default: ResetPassword } = await import('./ResetPassword');

describe('ResetPassword · requisitos', () => {
  it('lista el símbolo entre los requisitos, como pide el backend', async () => {
    window.history.replaceState(null, '', `/reset-password/${'c'.repeat(48)}`);
    render(
      <BrowserRouter>
        <Routes>
          <Route path="/reset-password/:token" element={<ResetPassword />} />
        </Routes>
      </BrowserRouter>
    );

    expect(await screen.findByText('resetPassword.requirement4')).toBeTruthy();
  });
});
