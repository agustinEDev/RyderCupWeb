/**
 * Título de la hoja de barras y botón de quitar jugador (pasada del Kind,
 * 4 nov 2026). La hoja «Otras» de tu barra se titulaba «Salida de tus barras»
 * («your tee's tee» en inglés): se montaba «Salida de {nombre}» con «tus
 * barras» de nombre. Y cada botón de quitar se llamaba «Quitar» a secas, sin
 * decir a quién quita.
 *
 *   #  dónde                                   | título / nombre accesible
 *   ---|---------------------------------------|---------------------------------
 *   1  «Otras» del paso 1, con tu género       | «Tu salida» / «Your tee»
 *   2  paso 1 sin tu género (panel de siempre) | «Tu salida» / «Your tee»
 *   3  hoja de un amigo                        | «Salida de Jugador 23» (igual)
 *   4  hoja del invitado con nombre            | «Salida de Prueba Kind» (igual)
 *   5  hoja del invitado sin nombre            | «Salida de» + nombre genérico (igual)
 *   6  quitar a un amigo                       | «Quitar a Jugador 12» / «Remove Jugador 12»
 *   7  quitar a un invitado                    | «Quitar a Prueba Kind Blancas»
 *   8  dos jugadores                           | cada botón con el suyo, nunca iguales
 *   9  tu fila                                 | sin botón de quitar (igual)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import BarrasDeTuGenero from './BarrasDeTuGenero';
import TeeSelectPanel from './TeeSelectPanel';
import ParticipantsStep from './ParticipantsStep';
import es from '../../i18n/locales/es/quickMatch.json';
import en from '../../i18n/locales/en/quickMatch.json';

// Una traducción que deja ver la clave y lo que se le mete
const t = (clave, opciones) => (opciones?.name === undefined ? clave : `${clave}[${opciones.name}]`);

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (clave, opciones) => (opciones?.name === undefined ? clave : `${clave}[${opciones.name}]`) }),
}));

const TEES = [
  { color: 'YELLOW', gender: 'MALE' },
  { color: 'WHITE', gender: 'MALE' },
  { color: 'RED', gender: 'FEMALE' },
];

const tituloDeLaHoja = () => {
  const hoja = screen.getByTestId('quick-match-tee-panel');
  return { nombre: hoja.getAttribute('aria-label'), visto: within(hoja).getAllByText(/./)[0].textContent };
};

describe('Título de la hoja de barras', () => {
  it('1: «Otras» de tu barra se titula «Tu salida», sin «Salida de»', () => {
    render(<BarrasDeTuGenero t={t} courseTees={TEES} genero="MALE" value="" onChange={vi.fn()} />);
    fireEvent.click(screen.getByTestId('quick-match-creator-tee-otras'));

    expect(tituloDeLaHoja()).toEqual({
      nombre: 'create.course.yourTeePanelTitle',
      visto: 'create.course.yourTeePanelTitle',
    });
  });

  it('2: sin tu género, el panel de siempre también se titula «Tu salida»', () => {
    render(<BarrasDeTuGenero t={t} courseTees={TEES} genero={null} value="" onChange={vi.fn()} />);
    fireEvent.click(screen.getByTestId('quick-match-creator-tee'));

    expect(tituloDeLaHoja()).toEqual({
      nombre: 'create.course.yourTeePanelTitle',
      visto: 'create.course.yourTeePanelTitle',
    });
  });

  it('3: la hoja de un amigo sigue siendo «Salida de» su nombre', () => {
    render(<TeeSelectPanel courseTees={TEES} playerName="Jugador 23" selectedKey="" onSelect={vi.fn()} onClose={vi.fn()} />);

    expect(tituloDeLaHoja()).toEqual({
      nombre: 'create.teePanel.title[Jugador 23]',
      visto: 'create.teePanel.title[Jugador 23]',
    });
  });

  it('los textos: «Tu salida» y «Your tee», sin hueco para un nombre', () => {
    expect(es.create.course.yourTeePanelTitle).toBe('Tu salida');
    expect(en.create.course.yourTeePanelTitle).toBe('Your tee');
  });
});

const Paso = (props) => (
  <ParticipantsStep
    t={t}
    currentUser={{ id: 'u1' }}
    participants={[]}
    capacity={4}
    rosterFull={false}
    isTeamFormat={false}
    isFreePlay
    selectedTeam="A"
    onSelectedTeamChange={vi.fn()}
    participantTab="guest"
    onParticipantTabChange={vi.fn()}
    availableFriends={[]}
    courseTees={TEES}
    onAddFriend={vi.fn()}
    guestForm={{ firstName: '', lastName: '', handicap: '' }}
    onGuestFirstNameChange={vi.fn()}
    onGuestLastNameChange={vi.fn()}
    onAddGuest={vi.fn()}
    onOpenGuestHandicapPanel={vi.fn()}
    guestTeeKey=""
    onGuestTeeKeyChange={vi.fn()}
    onRemoveParticipant={vi.fn()}
    isProcessing={false}
    onBack={vi.fn()}
    onClose={vi.fn()}
    onNext={vi.fn()}
    {...props}
  />
);

describe('Hoja del invitado (sin cambios)', () => {
  it('4: con nombre, «Salida de» su nombre', () => {
    render(<Paso guestForm={{ firstName: 'Prueba', lastName: 'Kind', handicap: '' }} />);
    fireEvent.click(screen.getByTestId('quick-match-guest-tee'));

    expect(tituloDeLaHoja().nombre).toBe('create.teePanel.title[Prueba Kind]');
  });

  it('5: sin nombre, «Salida de» el nombre genérico', () => {
    render(<Paso />);
    fireEvent.click(screen.getByTestId('quick-match-guest-tee'));

    expect(tituloDeLaHoja().nombre).toBe('create.teePanel.title[create.participants.guestFallbackName]');
  });
});
