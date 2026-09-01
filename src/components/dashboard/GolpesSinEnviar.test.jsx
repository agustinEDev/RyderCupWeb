import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';

// El entorno de este fichero no trae `localStorage`, y los módulos que se
// importan debajo lo capturan al cargarse: se define ARRIBA DEL TODO, no en un
// `beforeEach`, o leerían otro objeto
const almacen = (() => {
  let datos = {};
  return {
    getItem: (clave) => datos[clave] ?? null,
    setItem: (clave, valor) => { datos[clave] = String(valor); },
    removeItem: (clave) => { delete datos[clave]; },
    clear: () => { datos = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: almacen, writable: true });

import GolpesSinEnviar from './GolpesSinEnviar';
import { COLA_VACIADA } from '../../services/vaciadoDeLaCola';
import * as golpesPerdidos from '../../utils/golpesPerdidos';
import * as cola from '../../utils/scoringOfflineQueue';

// La traducción se sustituye por la clave más sus variables: así el test
// comprueba QUÉ se dice y con qué datos, sin depender de la redacción
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, params) => {
      if (!params) return key;
      const partes = Object.entries(params).map(([k, v]) => `${k}=${v}`);
      return `${key}(${partes.join(',')})`;
    },
    i18n: { language: 'es' },
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router', async () => ({
  ...(await vi.importActual('react-router')),
  useNavigate: () => mockNavigate,
}));

describe('GolpesSinEnviar', () => {
  beforeEach(() => {
    almacen.clear();
    vi.clearAllMocks();
  });

  it('no ocupa sitio en el panel cuando no hay nada que avisar', () => {
    const { container } = render(<GolpesSinEnviar userId="u1" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('cuenta los golpes de cada partida y los nombra por su campo', () => {
    cola.enqueue('m-1', 3, { ownScore: 4 }, null, 'u1', 'La Herrería');
    cola.enqueue('m-1', 4, { ownScore: 5 }, null, 'u1', 'La Herrería');
    cola.enqueue('m-2', 7, { ownScore: 3 }, null, 'u1', 'El Encín');

    render(<GolpesSinEnviar userId="u1" />);

    expect(screen.getByText(/aviso\(count=2,partida=La Herrería\)/)).toBeInTheDocument();
    expect(screen.getByText(/aviso\(count=1,partida=El Encín\)/)).toBeInTheDocument();
  });

  it('lo que se guardó sin nombre se llama de alguna manera, no de ninguna', () => {
    // Se encoló antes de que se guardara el nombre, o la vista no lo traía
    cola.enqueue('m-1', 3, { ownScore: 4 }, null, 'u1');

    render(<GolpesSinEnviar userId="u1" />);

    expect(
      screen.getByText(/partida=golpesSinEnviar.partidaSinNombre/)
    ).toBeInTheDocument();
  });

  it('lleva a la pantalla de anotación de esa partida', () => {
    cola.enqueue('m-1', 3, { ownScore: 4 }, null, 'u1', 'La Herrería');
    render(<GolpesSinEnviar userId="u1" />);

    fireEvent.click(screen.getByRole('button'));

    expect(mockNavigate).toHaveBeenCalledWith('/player/matches/m-1/scoring');
  });

  it('y a la de partida rápida cuando la anotación es de una', () => {
    // Una anotación con participante es de partida rápida: llevar a la ruta de
    // competición dejaría al jugador en una página que no existe
    cola.enqueue('qm-1', 3, { score: 4 }, 'p-1', 'u1', 'Amistoso');
    render(<GolpesSinEnviar userId="u1" />);

    fireEvent.click(screen.getByRole('button'));

    expect(mockNavigate).toHaveBeenCalledWith('/quick-matches/qm-1/scoring');
  });

  it('no enseña lo de la persona que usó el móvil antes', () => {
    cola.enqueue('m-9', 3, { ownScore: 4 }, null, 'otra', 'Partida ajena');
    golpesPerdidos.apunta({ matchId: 'm-9', matchName: 'Partida ajena', holeNumber: 5, userId: 'otra' });

    const { container } = render(<GolpesSinEnviar userId="u1" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('los rechazados se agrupan por partida y se descartan uno a uno', () => {
    golpesPerdidos.apunta({ matchId: 'm-1', matchName: 'La Herrería', holeNumber: 3, userId: 'u1' });
    golpesPerdidos.apunta({ matchId: 'm-1', matchName: 'La Herrería', holeNumber: 4, userId: 'u1' });
    golpesPerdidos.apunta({ matchId: 'm-2', matchName: 'El Encín', holeNumber: 7, userId: 'u1' });

    render(<GolpesSinEnviar userId="u1" />);

    expect(screen.getAllByRole('alert')).toHaveLength(2);
    expect(screen.getByText(/perdidos\(count=2,partida=La Herrería\)/)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /descartarDe\(partida=La Herrería\)/ })
    );

    // Solo se va el suyo: el de la otra partida sigue sin leerse
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByText(/perdidos\(count=1,partida=El Encín\)/)).toBeInTheDocument();
    expect(golpesPerdidos.pendientes('u1')).toHaveLength(1);
  });

  it('deja de contar los golpes que el vaciado ya ha enviado', () => {
    cola.enqueue('m-1', 3, { ownScore: 4 }, null, 'u1', 'La Herrería');
    render(<GolpesSinEnviar userId="u1" />);
    expect(screen.getByText(/aviso\(count=1/)).toBeInTheDocument();

    // El vaciado corre por su cuenta y avisa al terminar; sin escucharlo, la
    // tarjeta seguiría diciendo que hay un golpe pendiente que ya llegó
    act(() => {
      cola.clear();
      globalThis.dispatchEvent(new globalThis.CustomEvent(COLA_VACIADA));
    });

    expect(screen.queryByText(/aviso\(count=/)).not.toBeInTheDocument();
  });
});
