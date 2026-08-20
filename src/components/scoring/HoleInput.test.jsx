import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import HoleInput from './HoleInput';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => opts ? `${key} ${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

describe('HoleInput', () => {
  const defaultProps = {
    holeNumber: 5,
    par: 4,
    strokeIndex: 7,
    onScoreChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * La tarjeta dejó de marcar la coincidencia y la anotación es ahora el único
   * sitio donde se ve: si alguien la quita también de aquí, deja de haber forma
   * de saber que los dos anotadores discrepan.
   */
  it('marca la coincidencia entre anotadores, que ya solo se ve aquí', () => {
    render(<HoleInput {...defaultProps} validationStatus="mismatch" />);

    // Por el título, no por la presencia: ValidationIcon devuelve el mismo
    // data-testid para su estado "pending" gris, así que buscar solo el testid
    // pasaría igual aunque el cableado se degradase a un pendiente constante,
    // que es justo cómo se perdería la señal ahora que este es el único sitio
    // donde se ve
    expect(screen.getByTestId('validation-icon')).toHaveAttribute(
      'title',
      'validation.mismatch'
    );
  });

  it('distingue el acuerdo del desacuerdo, no solo que hay icono', () => {
    render(<HoleInput {...defaultProps} validationStatus="match" />);
    expect(screen.getByTestId('validation-icon')).toHaveAttribute('title', 'validation.match');
  });

  /**
   * Son dos acuerdos distintos: el de la cabecera es el de TU resultado, y el
   * del jugador al que anotas puede discrepar mientras el tuyo cuadra. Antes se
   * veía en la tarjeta; ahora que la tarjeta no lo lleva, este es el único
   * sitio, y sin él la tira de hoyos se pone roja sin decir por quién.
   */
  it('marca aparte el desacuerdo del jugador al que anotas', () => {
    render(
      <HoleInput {...defaultProps} validationStatus="match" markedValidationStatus="mismatch" />
    );

    const marked = within(screen.getByTestId('marked-validation')).getByTestId('validation-icon');
    expect(marked).toHaveAttribute('title', 'validation.mismatch');

    // y el propio sigue diciendo que el tuyo sí cuadra: son independientes
    const icons = screen.getAllByTestId('validation-icon');
    expect(icons.some((i) => i.getAttribute('title') === 'validation.match')).toBe(true);
  });

  it('no reserva sitio para esa marca cuando no anotas a nadie', () => {
    render(<HoleInput {...defaultProps} validationStatus="match" />);
    expect(screen.queryByTestId('marked-validation')).not.toBeInTheDocument();
  });

  it('should render hole info', () => {
    render(<HoleInput {...defaultProps} />);
    expect(screen.getByTestId('hole-input')).toHaveTextContent('5');
    expect(screen.getByTestId('hole-input')).toHaveTextContent('4');
    expect(screen.getByTestId('hole-input')).toHaveTextContent('7');
  });

  it('should show a dash (not the par) when no score has been submitted yet', () => {
    render(<HoleInput {...defaultProps} />);
    expect(screen.getByTestId('own-score-value')).toHaveTextContent('-');
    expect(screen.getByTestId('marked-score-value')).toHaveTextContent('-');
  });

  it('should show the actual submitted score, styled differently from the unset state', () => {
    render(
      <HoleInput
        {...defaultProps}
        playerScore={{ ownScore: 4, ownSubmitted: true }}
        markedPlayerScore={{ markerScore: 4, markerSubmitted: true }}
      />
    );
    expect(screen.getByTestId('own-score-value')).toHaveTextContent('4');
    expect(screen.getByTestId('own-score-value').className).toContain('text-gray-900');
    expect(screen.getByTestId('own-score-button').className).not.toContain('border-dashed');
  });

  it('should style the unset own score button as a dashed placeholder', () => {
    render(<HoleInput {...defaultProps} />);
    expect(screen.getByTestId('own-score-button').className).toContain('border-dashed');
    expect(screen.getByTestId('own-score-value').className).toContain('text-gray-400');
  });

  it('should open panel on own score button click and select a value', () => {
    render(<HoleInput {...defaultProps} />);
    fireEvent.click(screen.getByTestId('own-score-button'));
    // Panel is open — click button "5"
    fireEvent.click(screen.getByRole('button', { name: /5/ }));
    expect(screen.getByTestId('own-score-value')).toHaveTextContent('5');
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith({ ownScore: 5, markedScore: undefined });
  });

  it('should select a lower value via own score panel', () => {
    render(<HoleInput {...defaultProps} />);
    fireEvent.click(screen.getByTestId('own-score-button'));
    fireEvent.click(screen.getByRole('button', { name: /3/ }));
    expect(screen.getByTestId('own-score-value')).toHaveTextContent('3');
  });

  it('should show dash when picked-up is selected', () => {
    render(<HoleInput {...defaultProps} />);
    fireEvent.click(screen.getByTestId('own-score-button'));
    fireEvent.click(screen.getByTestId('picked-up-button'));
    expect(screen.getByTestId('own-score-value')).toHaveTextContent('-');
  });

  it('should open panel on marked score button click and select a value', () => {
    render(<HoleInput {...defaultProps} />);
    fireEvent.click(screen.getByTestId('marked-score-button'));
    fireEvent.click(screen.getByRole('button', { name: /5/ }));
    expect(screen.getByTestId('marked-score-value')).toHaveTextContent('5');
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith({ ownScore: undefined, markedScore: 5 });
  });

  it('should show read-only mode without buttons', () => {
    render(<HoleInput {...defaultProps} isReadOnly={true} playerScore={{ ownScore: 5, markerScore: 4 }} />);
    expect(screen.queryByTestId('own-score-button')).toBeNull();
    expect(screen.queryByTestId('marked-score-button')).toBeNull();
  });

  it('should show net score when provided', () => {
    render(<HoleInput {...defaultProps} netScore={3} />);
    expect(screen.getByTestId('hole-input')).toHaveTextContent('3');
  });

  it('should show standing with team name', () => {
    render(<HoleInput {...defaultProps} standing="2UP" holeResult={{ winner: 'A', standing: '2UP', standingTeam: 'A' }} teamAName="Europe" teamBName="USA" />);
    expect(screen.getByTestId('hole-input')).toHaveTextContent('Europe 2UP');
  });

  it('should show all square for AS standing', () => {
    render(<HoleInput {...defaultProps} standing="AS" />);
    expect(screen.getByTestId('hole-input')).toHaveTextContent('input.allSquare');
  });

  it('should show strokes received badge', () => {
    render(<HoleInput {...defaultProps} strokesReceived={1} />);
    expect(screen.getByTestId('hole-input')).toHaveTextContent('input.strokeReceived');
  });

  it('should show team A name for hole winner A', () => {
    render(<HoleInput {...defaultProps} holeResult={{ winner: 'A', standing: '1UP', standingTeam: 'A' }} teamAName="Europe" teamBName="USA" />);
    expect(screen.getByTestId('hole-input')).toHaveTextContent('Europe');
  });

  it('should show team B name for hole winner B', () => {
    render(<HoleInput {...defaultProps} holeResult={{ winner: 'B', standing: '1UP', standingTeam: 'B' }} teamAName="Europe" teamBName="USA" />);
    expect(screen.getByTestId('hole-input')).toHaveTextContent('USA');
  });

  it('should show halved for HALVED result', () => {
    render(<HoleInput {...defaultProps} holeResult={{ winner: 'HALVED', standing: 'AS', standingTeam: null }} teamAName="Europe" teamBName="USA" />);
    expect(screen.getByTestId('hole-input')).toHaveTextContent('input.halved');
  });

  it('should hide own score button when isOwnScoreLocked, keep marked button visible', () => {
    render(<HoleInput {...defaultProps} isOwnScoreLocked={true} />);
    expect(screen.queryByTestId('own-score-button')).toBeNull();
    expect(screen.getByTestId('marked-score-button')).toBeInTheDocument();
  });

  it('should hide marked score button when isMarkerScoreLocked, keep own button visible', () => {
    render(<HoleInput {...defaultProps} isMarkerScoreLocked={true} />);
    expect(screen.getByTestId('own-score-button')).toBeInTheDocument();
    expect(screen.queryByTestId('marked-score-button')).toBeNull();
  });

  it('should trigger onScoreChange with correct ownScore when only marker changes', () => {
    render(<HoleInput {...defaultProps} isOwnScoreLocked={true} />);
    fireEvent.click(screen.getByTestId('marked-score-button'));
    fireEvent.click(screen.getByRole('button', { name: /5/ }));
    expect(defaultProps.onScoreChange).toHaveBeenCalledWith({ ownScore: undefined, markedScore: 5 });
  });

  it('should fallback to letter when team name not provided', () => {
    render(<HoleInput {...defaultProps} holeResult={{ winner: 'A', standing: '1UP', standingTeam: 'A' }} />);
    expect(screen.getByTestId('hole-input')).toHaveTextContent('A');
  });
});
/**
 * Quien anota y a quien marca pueden salir de barras distintas, y entonces el
 * mismo hoyo tiene dos pares. El teclado etiquetaba los dos contra el par de
 * quien anota. Ver RyderCupWeb#417.
 */
describe('HoleInput · el teclado del marcado usa SU par', () => {
  const base = {
    holeNumber: 1,
    par: 5,
    strokeIndex: 1,
    playerScore: null,
    markedPlayerScore: null,
    onScoreChange: vi.fn(),
  };

  it('etiqueta el 4 como birdie en el propio y como par en el del marcado', () => {
    render(<HoleInput {...base} markedPar={4} />);

    fireEvent.click(screen.getByTestId('own-score-button'));
    const own = screen.getByRole('dialog');
    expect(within(own).getByRole('button', { name: /4/ })).toHaveTextContent('input.scoreBirdie');
    fireEvent.click(within(own).getByRole('button', { name: /input.close/ }));

    fireEvent.click(screen.getByTestId('marked-score-button'));
    const marked = screen.getByRole('dialog');
    expect(within(marked).getByRole('button', { name: /4/ })).toHaveTextContent('input.par');
  });

  it('sin par propio del marcado usa el del hoyo, como hasta ahora', () => {
    render(<HoleInput {...base} />);

    fireEvent.click(screen.getByTestId('marked-score-button'));
    const marked = screen.getByRole('dialog');
    expect(within(marked).getByRole('button', { name: /5/ })).toHaveTextContent('input.par');
  });
});
