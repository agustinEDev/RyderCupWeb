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
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('no ocupa sitio en el panel cuando no hay nada que avisar', () => {
    const { container } = render(<GolpesSinEnviar userId="u1" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('cuenta los golpes de cada partida y los nombra por su campo', () => {
    cola.enqueue('m-1', 3, { ownScore: 4 }, null, 'u1', { matchName: 'La Herrería' });
    cola.enqueue('m-1', 4, { ownScore: 5 }, null, 'u1', { matchName: 'La Herrería' });
    cola.enqueue('m-2', 7, { ownScore: 3 }, null, 'u1', { matchName: 'El Encín' });

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
    cola.enqueue('m-1', 3, { ownScore: 4 }, null, 'u1', { matchName: 'La Herrería' });
    render(<GolpesSinEnviar userId="u1" />);

    fireEvent.click(screen.getByRole('button'));

    expect(mockNavigate).toHaveBeenCalledWith('/player/matches/m-1/scoring');
  });

  it('y a la de partida rápida cuando la anotación es de una', () => {
    // Una anotación con participante es de partida rápida: llevar a la ruta de
    // competición dejaría al jugador en una página que no existe
    cola.enqueue('qm-1', 3, { score: 4 }, 'p-1', 'u1', { matchName: 'Amistoso' });
    render(<GolpesSinEnviar userId="u1" />);

    fireEvent.click(screen.getByRole('button'));

    expect(mockNavigate).toHaveBeenCalledWith('/quick-matches/qm-1/scoring');
  });

  it('no enseña lo de la persona que usó el móvil antes', () => {
    cola.enqueue('m-9', 3, { ownScore: 4 }, null, 'otra', { matchName: 'Partida ajena' });
    golpesPerdidos.apunta({ matchId: 'm-9', matchName: 'Partida ajena', holeNumber: 5, userId: 'otra' });

    const { container } = render(<GolpesSinEnviar userId="u1" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('los rechazados se agrupan por partida y se descartan uno a uno', () => {
    golpesPerdidos.apunta({ matchId: 'm-1', matchName: 'La Herrería', holeNumber: 3, userId: 'u1' });
    golpesPerdidos.apunta({ matchId: 'm-1', matchName: 'La Herrería', holeNumber: 4, userId: 'u1' });
    golpesPerdidos.apunta({ matchId: 'm-2', matchName: 'El Encín', holeNumber: 7, userId: 'u1' });

    render(<GolpesSinEnviar userId="u1" />);

    expect(screen.getByText(/perdidos\(count=2,partida=La Herrería\)/)).toBeInTheDocument();
    expect(screen.getByText(/perdidos\(count=1,partida=El Encín\)/)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /descartarDe\(partida=La Herrería\)/ })
    );

    // Solo se va el suyo: el de la otra partida sigue sin leerse
    expect(screen.queryByText(/perdidos\(count=2,partida=La Herrería\)/)).not.toBeInTheDocument();
    expect(screen.getByText(/perdidos\(count=1,partida=El Encín\)/)).toBeInTheDocument();
    expect(golpesPerdidos.pendientes('u1')).toHaveLength(1);
  });

  it('el mismo hoyo perdido para cuatro jugadores es UNA línea, no cuatro', () => {
    // En una partida rápida de cuatro hay un aviso por jugador del mismo
    // hoyo: por aviso salían cuatro «Hoyo 7» iguales, y claves repetidas
    for (const participante of ['p-1', 'p-2', 'p-3', 'p-4']) {
      golpesPerdidos.apunta({
        matchId: 'qm-1', matchName: 'Meis', holeNumber: 7, participantId: participante, userId: 'u1',
      });
    }
    golpesPerdidos.apunta({ matchId: 'qm-1', matchName: 'Meis', holeNumber: 3, participantId: 'p-1', userId: 'u1' });

    render(<GolpesSinEnviar userId="u1" />);

    const lineas = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(lineas).toEqual(['golpesSinEnviar.perdido(hoyo=3)', 'golpesSinEnviar.perdido(hoyo=7)']);
    // Y la cabecera cuenta lo mismo que la lista: dos hoyos, no cinco avisos
    expect(screen.getByText(/golpesSinEnviar\.perdidos\(count=2,/)).toBeInTheDocument();
    // El anuncio del lector de pantalla, también: decía cinco fallos sobre una
    // lista de dos líneas
    expect(screen.getByRole('status')).toHaveTextContent('perdidos=2');
  });

  it('una partida que ya no existe no navega: ofrece descartar', () => {
    // Su pantalla es la única que sabe enviar lo de una partida rápida, y esa
    // pantalla es la que responde 404: el aviso se quedaba para siempre y el
    // botón llevaba a una pantalla muerta
    cola.enqueue('qm-1', 7, { score: 5 }, 'p-1', 'u1', { matchName: 'Meis' });
    cola.marcaDesaparecida('qm-1', 'u1');

    render(<GolpesSinEnviar userId="u1" />);

    expect(screen.queryByRole('button', { name: /golpesSinEnviar.aviso/ })).toBeNull();
    expect(screen.getByText(/golpesSinEnviar\.desaparecida\(count=1,partida=Meis\)/)).toBeInTheDocument();
    // Y sigue habiendo forma de abrirla: su pantalla es la única que puede
    // enviar esos golpes si el 404 fue de un portal cautivo
    expect(screen.getByRole('button', { name: 'golpesSinEnviar.abrir' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /descartarYPerderDe/ }));

    expect(cola.size()).toBe(0);
    expect(screen.queryByTestId('golpes-sin-enviar')).toBeNull();
  });

  it('el fallo de una tarjeta no sale debajo de la otra', () => {
    // Un aviso para todas decía «no hay espacio» bajo la tarjeta que nadie
    // había tocado
    cola.enqueue('qm-1', 7, { score: 5 }, 'p-1', 'u1', { matchName: 'Meis' });
    cola.enqueue('qm-2', 3, { score: 4 }, 'p-1', 'u1', { matchName: 'Domaio' });
    cola.marcaDesaparecida('qm-1', 'u1');
    cola.marcaDesaparecida('qm-2', 'u1');
    render(<GolpesSinEnviar userId="u1" />);
    vi.spyOn(almacen, 'setItem').mockImplementationOnce(() => {
      throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
    });

    fireEvent.click(screen.getByRole('button', { name: /descartarYPerderDe.*Meis/ }));

    expect(screen.getAllByText('golpesSinEnviar.noSePudoDescartar')).toHaveLength(1);
  });

  it('sin sesión resuelta no ofrece descartar: no borraría lo que enseña', () => {
    // `olvidaLasDe` solo se llevaría lo que no tiene dueño, diría que sí, y la
    // tarjeta se repintaría igual
    cola.enqueue('qm-1', 7, { score: 5 }, 'p-1', 'u1', { matchName: 'Meis' });
    cola.marcaDesaparecida('qm-1', 'u1');

    render(<GolpesSinEnviar userId={null} />);

    expect(screen.queryByRole('button', { name: /descartarYPerderDe/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'golpesSinEnviar.abrir' })).toBeInTheDocument();
  });

  it('al descartar el último aviso, el foco no se cae al body', () => {
    // El componente entero deja de existir con el botón dentro: quien navega
    // con teclado o lector se queda en la nada
    cola.enqueue('qm-1', 7, { score: 5 }, 'p-1', 'u1', { matchName: 'Meis' });
    cola.marcaDesaparecida('qm-1', 'u1');
    const { container } = render(<GolpesSinEnviar userId="u1" />);
    const padre = container.firstChild.parentElement;

    fireEvent.click(screen.getByRole('button', { name: /descartarYPerderDe/ }));

    expect(screen.queryByTestId('golpes-sin-enviar')).toBeNull();
    expect(document.activeElement).toBe(padre);
  });

  it('si el móvil no admite la escritura, lo dice en vez de callarse', () => {
    // Un botón que no hace nada y no dice por qué es peor que no tenerlo
    cola.enqueue('qm-1', 7, { score: 5 }, 'p-1', 'u1', { matchName: 'Meis' });
    cola.marcaDesaparecida('qm-1', 'u1');
    render(<GolpesSinEnviar userId="u1" />);
    // El almacén de este fichero es propio, no el de jsdom: espiar
    // `Storage.prototype` no lo tocaría y el test pasaría sin probar nada
    vi.spyOn(almacen, 'setItem').mockImplementationOnce(() => {
      throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
    });

    fireEvent.click(screen.getByRole('button', { name: /descartarYPerderDe/ }));

    expect(screen.getByText('golpesSinEnviar.noSePudoDescartar')).toBeInTheDocument();
  });

  it('distingue dos partidos del MISMO campo por su número', () => {
    // Una jornada juega varios partidos en un solo campo: solo con el nombre
    // del campo salían dos avisos idénticos y no se sabía cuál mirar
    cola.enqueue('m-3', 3, { ownScore: 4 }, null, 'u1', { matchName: 'La Herrería', matchNumber: 3 });
    cola.enqueue('m-7', 8, { ownScore: 5 }, null, 'u1', { matchName: 'La Herrería', matchNumber: 7 });

    render(<GolpesSinEnviar userId="u1" />);

    expect(screen.getByText(/partida=golpesSinEnviar.partidaConNumero\(numero=3,campo=La Herrería\)/)).toBeInTheDocument();
    expect(screen.getByText(/partida=golpesSinEnviar.partidaConNumero\(numero=7,campo=La Herrería\)/)).toBeInTheDocument();
  });

  it('anuncia UNA vez para el lector de pantalla, no una por tarjeta', () => {
    // Varias regiones que se montan a la vez se interrumpen entre ellas, y
    // creadas ya con su texto dentro hay lectores que no anuncian ninguna. Es
    // la convención del panel, escrita en `Dashboard.jsx`
    cola.enqueue('m-1', 3, { ownScore: 4 }, null, 'u1', { matchName: 'La Herrería' });
    golpesPerdidos.apunta({ matchId: 'm-2', matchName: 'El Encín', holeNumber: 7, userId: 'u1' });

    render(<GolpesSinEnviar userId="u1" />);

    expect(screen.queryAllByRole('alert')).toHaveLength(0);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('resumen(sinEnviar=1,perdidos=1)');
  });

  it('si el aviso no se puede quitar, se dice: no se finge que sí', () => {
    // El móvil sin espacio es justo el estado que produjo el rechazo. Callarlo
    // deja un botón que no hace nada y no explica por qué
    golpesPerdidos.apunta({ matchId: 'm-1', matchName: 'La Herrería', holeNumber: 3, userId: 'u1' });
    render(<GolpesSinEnviar userId="u1" />);
    vi.spyOn(almacen, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    fireEvent.click(screen.getByRole('button', { name: /descartarDe/ }));

    expect(screen.getByText('golpesSinEnviar.noSePudoDescartar')).toBeInTheDocument();
    expect(screen.getByText(/perdidos\(count=1/)).toBeInTheDocument();
  });

  it('al quitar un aviso el foco no se cae al vacío', () => {
    // Desmontar el bloque que contiene el botón pulsado dejaba el foco en
    // `<body>`, con otros avisos todavía en pantalla
    golpesPerdidos.apunta({ matchId: 'm-1', matchName: 'La Herrería', holeNumber: 3, userId: 'u1' });
    golpesPerdidos.apunta({ matchId: 'm-2', matchName: 'El Encín', holeNumber: 7, userId: 'u1' });
    render(<GolpesSinEnviar userId="u1" />);

    fireEvent.click(screen.getByRole('button', { name: /descartarDe\(partida=La Herrería\)/ }));

    expect(document.activeElement).toBe(screen.getByTestId('golpes-sin-enviar'));
  });

  it('y al quitar el ÚLTIMO, tampoco: sube al bloque del panel', () => {
    // Aquí el componente entero deja de existir, así que el contenedor al que
    // se devolvía el foco desaparece con él
    golpesPerdidos.apunta({ matchId: 'm-1', matchName: 'La Herrería', holeNumber: 3, userId: 'u1' });
    const { container } = render(<GolpesSinEnviar userId="u1" />);
    const bloqueDelPanel = screen.getByTestId('golpes-sin-enviar').parentElement;

    fireEvent.click(screen.getByRole('button', { name: /descartarDe/ }));

    expect(container).toBeEmptyDOMElement();
    expect(document.activeElement).toBe(bloqueDelPanel);
  });

  it('deja de contar los golpes que el vaciado ya ha enviado', () => {
    cola.enqueue('m-1', 3, { ownScore: 4 }, null, 'u1', { matchName: 'La Herrería' });
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
