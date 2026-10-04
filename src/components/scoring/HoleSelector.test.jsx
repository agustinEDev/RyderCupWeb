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
});

