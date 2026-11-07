import { describe, it, expect } from 'vitest';
import User from './User';

const BASE = { id: '1', email: 'ana@gmail.com', first_name: 'Ana', last_name: 'Lopez' };

describe('User · correo pendiente (RyderCupAm #749)', () => {
  it('guarda el correo pendiente que manda el backend', () => {
    expect(new User({ ...BASE, pending_email: 'ana@trabajo.com' }).pendingEmail).toBe('ana@trabajo.com');
  });

  it('sin él (el backend de antes), null', () => {
    expect(new User(BASE).pendingEmail).toBeNull();
  });
});
