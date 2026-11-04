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
import i18next from 'i18next';

// Una traducción que deja ver la clave y lo que se le mete. La misma para el
// `t` que llega por props y el del hook (`vi.hoisted`, `/code-review`)
const { t } = vi.hoisted(() => ({
  t: (clave, opciones) => (opciones?.name === undefined ? clave : `${clave}[${opciones.name}]`),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t }) }));

const TEES = [
  { color: 'YELLOW', gender: 'MALE' },
  { color: 'WHITE', gender: 'MALE' },
  { color: 'RED', gender: 'FEMALE' },
];

// El título, visible y como nombre de la hoja: se busca el texto esperado, no
// «el primero que haya» (`/code-review`)
const esperaElTitulo = (titulo) => {
  const hoja = screen.getByTestId('quick-match-tee-panel');
  expect(hoja).toHaveAttribute('aria-label', titulo);
  expect(within(hoja).getByText(titulo, { exact: true })).toBeVisible();
};

describe('Título de la hoja de barras', () => {
  it('1: «Otras» de tu barra se titula «Tu salida», sin «Salida de»', () => {
    render(<BarrasDeTuGenero t={t} courseTees={TEES} genero="MALE" value="" onChange={vi.fn()} />);
    fireEvent.click(screen.getByTestId('quick-match-creator-tee-otras'));

    esperaElTitulo('create.course.yourTeePanelTitle');
  });

  it('2: sin tu género, el panel de siempre también se titula «Tu salida»', () => {
    render(<BarrasDeTuGenero t={t} courseTees={TEES} genero={null} value="" onChange={vi.fn()} />);
    fireEvent.click(screen.getByTestId('quick-match-creator-tee'));

    esperaElTitulo('create.course.yourTeePanelTitle');
  });

  it('3: la hoja de un amigo sigue siendo «Salida de» su nombre', () => {
    render(<TeeSelectPanel courseTees={TEES} playerName="Jugador 23" selectedKey="" onSelect={vi.fn()} onClose={vi.fn()} />);

    esperaElTitulo('create.teePanel.title[Jugador 23]');
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

    esperaElTitulo('create.teePanel.title[Prueba Kind]');
  });

  it('5: sin nombre, «Salida de» el nombre genérico', () => {
    render(<Paso />);
    fireEvent.click(screen.getByTestId('quick-match-guest-tee'));

    esperaElTitulo('create.teePanel.title[create.participants.guestFallbackName]');
  });
});

const YO = { participantId: 'u1', userId: 'u1', name: 'Trinx' };
const AMIGO = { participantId: 'u12', userId: 'u12', name: 'Jugador 12' };
const INVITADO = { participantId: 'g1', userId: null, isGuest: true, name: 'Prueba Kind Blancas' };

describe('Botón de quitar jugador', () => {
  it('6: el de un amigo dice a quién quita', () => {
    render(<Paso participants={[YO, AMIGO]} />);

    expect(screen.getByTestId('quick-match-remove-u12')).toHaveAccessibleName('create.participants.remove[Jugador 12]');
  });

  it('7: el de un invitado, también', () => {
    render(<Paso participants={[YO, INVITADO]} />);

    expect(screen.getByTestId('quick-match-remove-g1')).toHaveAccessibleName(
      'create.participants.remove[Prueba Kind Blancas]'
    );
  });

  it('8: con dos jugadores, cada botón lleva el suyo', () => {
    render(<Paso participants={[YO, AMIGO, INVITADO]} />);

    const nombres = [screen.getByTestId('quick-match-remove-u12'), screen.getByTestId('quick-match-remove-g1')].map(
      (b) => b.getAttribute('aria-label')
    );
    expect(new Set(nombres).size).toBe(2);
  });

  it('9: tu fila no tiene botón de quitar', () => {
    render(<Paso participants={[YO, AMIGO]} />);

    expect(screen.queryByTestId('quick-match-remove-u1')).toBeNull();
  });

  it('los textos: «Quitar a {{name}}» y «Remove {{name}}»', () => {
    expect(es.create.participants.remove).toBe('Quitar a {{name}}');
    expect(en.create.participants.remove).toBe('Remove {{name}}');
  });
});

describe('Los textos con i18next de verdad (revisor)', () => {
  const traduce = async (idioma) => {
    const i18n = i18next.createInstance();
    await i18n.init({
      lng: idioma,
      resources: { es: { quickMatch: es }, en: { quickMatch: en } },
      interpolation: { escapeValue: false },
    });
    return i18n.getFixedT(idioma, 'quickMatch');
  };

  it.each([
    ['es', 'Tu salida', 'Quitar a Jugador 12', 'Salida de Jugador 23'],
    ['en', 'Your tee', 'Remove Jugador 12', "Jugador 23's tee"],
  ])('%s: «%s», «%s» y la hoja del amigo «%s»', async (idioma, tuya, quitar, amigo) => {
    const tr = await traduce(idioma);

    expect(tr('create.course.yourTeePanelTitle')).toBe(tuya);
    expect(tr('create.participants.remove', { name: 'Jugador 12' })).toBe(quitar);
    expect(tr('create.teePanel.title', { name: 'Jugador 23' })).toBe(amigo);
  });
});
