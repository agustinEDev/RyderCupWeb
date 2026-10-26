import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HoleSelector from './HoleSelector';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => opts ? `${key} ${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

describe('HoleSelector', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  it('should render 18 hole buttons by default', () => {
    render(<HoleSelector currentHole={1} onSelect={mockOnSelect} />);
    expect(screen.getByTestId('hole-selector')).toBeInTheDocument();
    expect(screen.getByTestId('hole-btn-1')).toBeInTheDocument();
    expect(screen.getByTestId('hole-btn-18')).toBeInTheDocument();
  });

  it('should highlight current hole with ring class', () => {
    render(<HoleSelector currentHole={5} onSelect={mockOnSelect} />);
    expect(screen.getByTestId('hole-btn-5').className).toContain('ring-2');
    expect(screen.getByTestId('hole-btn-1').className).not.toContain('ring-2');
  });

  it('should call onSelect when a hole is clicked', () => {
    render(<HoleSelector currentHole={1} onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByTestId('hole-btn-7'));
    expect(mockOnSelect).toHaveBeenCalledWith(7);
  });

  it('should show validated status with green class', () => {
    const scores = [{ holeNumber: 3, playerScores: [{ validationStatus: 'match' }] }];
    render(<HoleSelector currentHole={1} onSelect={mockOnSelect} scores={scores} />);
    expect(screen.getByTestId('hole-btn-3').className).toContain('bg-green-100');
  });

  it('should show mismatch status with red class', () => {
    const scores = [{ holeNumber: 5, playerScores: [{ validationStatus: 'mismatch' }] }];
    render(<HoleSelector currentHole={1} onSelect={mockOnSelect} scores={scores} />);
    expect(screen.getByTestId('hole-btn-5').className).toContain('bg-red-100');
  });

  it('should respect totalHoles prop', () => {
    render(<HoleSelector currentHole={1} onSelect={mockOnSelect} totalHoles={9} />);
    expect(screen.getByTestId('hole-btn-9')).toBeInTheDocument();
    expect(screen.queryByTestId('hole-btn-10')).toBeNull();
  });
});

// Un hoyo que no se pudo guardar se marca aparte (FE #622): el rojo de fondo
// ya dice «desacuerdo con el marcador», así que va un punto en la esquina
describe('HoleSelector · los hoyos que no se pudieron guardar (FE #622)', () => {
  it('llevan un punto, y se anuncian', () => {
    render(<HoleSelector currentHole={1} onSelect={vi.fn()} noGuardados={[5, 7]} />);

    expect(screen.getByTestId('no-guardado-5')).toBeInTheDocument();
    expect(screen.getByTestId('no-guardado-7')).toBeInTheDocument();
    // El número y el aviso: el punto solo no le dice nada a un lector de pantalla
    expect(screen.getByTestId('hole-btn-5')).toHaveAccessibleName('5, holeSelector.noGuardado');
    expect(screen.getByTestId('hole-btn-6')).toHaveAccessibleName('6');
  });

  it('los demás no', () => {
    render(<HoleSelector currentHole={1} onSelect={vi.fn()} noGuardados={[5]} />);

    expect(screen.queryByTestId('no-guardado-6')).not.toBeInTheDocument();
  });

  it('sin la lista, ninguno', () => {
    render(<HoleSelector currentHole={1} onSelect={vi.fn()} />);

    expect(screen.queryByTestId(/^no-guardado-/)).not.toBeInTheDocument();
  });

  describe('#847: los hoyos sin jugar', () => {
    const sinNada = { ownSubmitted: false, markerSubmitted: false, validationStatus: 'pending' };

    it('salen vacíos (grises), no amarillos, aunque la API traiga la fila', () => {
      render(
        <HoleSelector currentHole={1} onSelect={vi.fn()} scores={[{ holeNumber: 12, playerScores: [sinNada, sinNada] }]} />
      );

      expect(screen.getByTestId('hole-btn-12').className).toContain('bg-gray-100');
      expect(screen.getByTestId('hole-btn-12').className).not.toContain('bg-yellow-100');
    });

    it('revisor: una fila sin nadie (todos retirados), también gris', () => {
      render(<HoleSelector currentHole={1} onSelect={vi.fn()} scores={[{ holeNumber: 4, playerScores: [] }]} />);

      expect(screen.getByTestId('hole-btn-4').className).toContain('bg-gray-100');
    });

    it('con algo anotado y sin validar, sí amarillo', () => {
      const anotado = { ...sinNada, ownSubmitted: true };
      render(<HoleSelector currentHole={1} onSelect={vi.fn()} scores={[{ holeNumber: 3, playerScores: [anotado, sinNada] }]} />);

      expect(screen.getByTestId('hole-btn-3').className).toContain('bg-yellow-100');
    });
  });
});

// F6 (25 oct 2026): con un retirado del fourball, el hoyo se cierra sin su bola
describe('HoleSelector · fourball con un retirado', () => {
  const hoyo = (a1) => [{
    holeNumber: 1,
    holeResult: null,
    playerScores: [
      { userId: 'a1', validationStatus: a1, ownSubmitted: false, markerSubmitted: false },
      { userId: 'a2', validationStatus: 'match', ownSubmitted: true, markerSubmitted: true },
      { userId: 'b1', validationStatus: 'match', ownSubmitted: true, markerSubmitted: true },
      { userId: 'b2', validationStatus: 'match', ownSubmitted: true, markerSubmitted: true },
    ],
  }];

  it('F6: la bola del retirado sin validar no deja el hoyo a medias', () => {
    render(<HoleSelector currentHole={2} onSelect={() => {}} scores={hoyo('pending')} retirados={['a1']} />);
    expect(screen.getByTestId('hole-btn-1').className).toContain('bg-green-100');
  });

  it('F6: sin retirados, la misma bola sí lo deja a medias', () => {
    render(<HoleSelector currentHole={2} onSelect={() => {}} scores={hoyo('pending')} />);
    expect(screen.getByTestId('hole-btn-1').className).not.toContain('bg-green-100');
  });

  it('F6: con resultado del servidor (cerrado sin su bola al volver), verde', () => {
    const cerrado = hoyo('pending').map((h) => ({ ...h, holeResult: { winner: 'B' } }));
    render(<HoleSelector currentHole={2} onSelect={() => {}} scores={cerrado} />);
    expect(screen.getByTestId('hole-btn-1').className).toContain('bg-green-100');
  });

  // /code-review (26 oct 2026): el resultado del servidor no tapa lo que aún
  // no está cerrado: una corrección en la cola, o un desacuerdo nuevo
  it('con resultado del servidor y una corrección en la cola, a medias', () => {
    const cerrado = hoyo('match').map((h) => ({
      ...h,
      holeResult: { winner: 'B' },
      playerScores: h.playerScores.map((ps) => (ps.userId === 'a2' ? { ...ps, validationStatus: 'pending', enCola: true } : ps)),
    }));
    render(<HoleSelector currentHole={2} onSelect={() => {}} scores={cerrado} />);
    expect(screen.getByTestId('hole-btn-1').className).toContain('bg-yellow-100');
  });

  it('con resultado del servidor y un desacuerdo, rojo', () => {
    const cerrado = hoyo('match').map((h) => ({
      ...h,
      holeResult: { winner: 'B' },
      playerScores: h.playerScores.map((ps) => (ps.userId === 'b1' ? { ...ps, validationStatus: 'mismatch' } : ps)),
    }));
    render(<HoleSelector currentHole={2} onSelect={() => {}} scores={cerrado} />);
    expect(screen.getByTestId('hole-btn-1').className).toContain('bg-red-100');
  });

  it('el desacuerdo en la bola del retirado no pinta rojo: no cuenta', () => {
    render(<HoleSelector currentHole={2} onSelect={() => {}} scores={hoyo('mismatch')} retirados={['a1']} />);
    expect(screen.getByTestId('hole-btn-1').className).toContain('bg-green-100');
  });
});
