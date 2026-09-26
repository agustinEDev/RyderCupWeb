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

  it('should invite to score, not show the par or a dash, when nothing is entered yet (FE #725)', () => {
    // Ni el par ni un guion: el guion se confundia con la raya, que es un hoyo
    // ya cerrado. Y un hueco vacío parecía desactivado: ahora dice «Anotar»
    render(<HoleInput {...defaultProps} />);
    expect(screen.getByTestId('own-score-button')).toHaveTextContent('input.tapToScore');
    expect(screen.getByTestId('own-score-button')).not.toHaveTextContent('4');
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

  /**
   * FE #725 (opción B, solo los botones): el primer hueco vacío del hoyo —el
   * tuyo antes que el del rival— es el siguiente; los demás, en borde verde.
   *
   *   B1  nada anotado                  | tu golpe es el siguiente, el rival en borde
   *   B2  tu golpe anotado              | el del rival es el siguiente
   *   B3  los dos anotados              | ningún botón de anotar
   *   B4  tu bola recogida (la raya)    | cuenta como anotada: el siguiente es el rival
   */
  it('B1: nada anotado, tu golpe es el siguiente', () => {
    render(<HoleInput {...defaultProps} />);
    expect(within(screen.getByTestId('own-score-button')).getByTestId('anotar-siguiente')).toBeInTheDocument();
    expect(within(screen.getByTestId('marked-score-button')).getByTestId('anotar')).toBeInTheDocument();
  });

  it('B2: con tu golpe anotado, el siguiente es el del rival', () => {
    render(<HoleInput {...defaultProps} playerScore={{ ownScore: 4, ownSubmitted: true }} />);
    expect(within(screen.getByTestId('marked-score-button')).getByTestId('anotar-siguiente')).toBeInTheDocument();
    expect(screen.getByTestId('own-score-value')).toHaveTextContent('4');
  });

  it('B3: los dos anotados, ningún botón de anotar', () => {
    render(
      <HoleInput
        {...defaultProps}
        playerScore={{ ownScore: 4, ownSubmitted: true }}
        markedPlayerScore={{ markerScore: 5, markerSubmitted: true }}
      />
    );
    expect(screen.queryByTestId('anotar-siguiente')).toBeNull();
    expect(screen.queryByTestId('anotar')).toBeNull();
  });

  it('B5: con tu golpe bloqueado y vacío, el siguiente es el del rival', () => {
    render(<HoleInput {...defaultProps} isOwnScoreLocked />);
    expect(within(screen.getByTestId('marked-score-button')).getByTestId('anotar-siguiente')).toBeInTheDocument();
  });

  it('B4: la raya cuenta como anotada', () => {
    render(<HoleInput {...defaultProps} playerScore={{ ownScore: null, ownSubmitted: true }} />);
    expect(screen.getByTestId('own-score-value')).toHaveTextContent('—');
    expect(within(screen.getByTestId('marked-score-button')).getByTestId('anotar-siguiente')).toBeInTheDocument();
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

  it('should show the dash figure when picked-up is selected', () => {
    // El trazo de la raya, que ahora es el UNICO trazo de la casilla: el hoyo
    // sin anotar se queda vacio.
    render(<HoleInput {...defaultProps} />);
    fireEvent.click(screen.getByTestId('own-score-button'));
    fireEvent.click(screen.getByTestId('picked-up-button'));
    expect(screen.getByTestId('own-score-value')).toHaveTextContent('—');
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
describe('HoleInput · una vista más nueva llega a la casilla (FE #606)', () => {
  // Cada `rerender` con un elemento NUEVO: con el mismo objeto React se salta
  // la reconciliación y el test no prueba nada
  const base = { holeNumber: 1, par: 4, strokeIndex: 3, onScoreChange: vi.fn() };
  const sinAnotar = { ownSubmitted: false, ownScore: null };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1 · la vista llega sin el golpe y luego con él: la casilla lo muestra', () => {
    // Lo que se vio en Chrome: la vista carga antes de que el vaciado de
    // entrada mande el golpe, y la casilla seguía vacía hasta cambiar de hoyo
    const { rerender } = render(<HoleInput {...base} playerScore={sinAnotar} />);
    expect(screen.getByTestId('own-score-button')).toHaveTextContent('input.tapToScore');

    rerender(<HoleInput {...base} playerScore={{ ownSubmitted: true, ownScore: 5 }} />);

    expect(screen.getByTestId('own-score-value')).toHaveTextContent('5');
  });

  it('2 · si la vista nueva trae la bola recogida, sale la raya y no el hueco', () => {
    const { rerender } = render(<HoleInput {...base} playerScore={sinAnotar} />);

    rerender(<HoleInput {...base} playerScore={{ ownSubmitted: true, ownScore: null }} />);

    expect(screen.getByTestId('own-score-value')).toHaveTextContent('—');
  });

  it('3 · lo que el jugador acaba de elegir no lo pisa una vista que no ha cambiado', () => {
    const { rerender } = render(<HoleInput {...base} playerScore={sinAnotar} />);
    fireEvent.click(screen.getByTestId('own-score-button'));
    fireEvent.click(screen.getByRole('button', { name: /6/ }));

    rerender(<HoleInput {...base} playerScore={{ ...sinAnotar }} />);

    expect(screen.getByTestId('own-score-value')).toHaveTextContent('6');
  });

  it('4 · la casilla del marcado también muestra la vista nueva', () => {
    const { rerender } = render(
      <HoleInput {...base} markedPlayerScore={{ markerSubmitted: false, markerScore: null }} />
    );

    rerender(<HoleInput {...base} markedPlayerScore={{ markerSubmitted: true, markerScore: 4 }} />);

    expect(screen.getByTestId('marked-score-value')).toHaveTextContent('4');
  });

  it('4b · y tampoco pisa lo que el marcador acaba de elegir', () => {
    const { rerender } = render(
      <HoleInput {...base} markedPlayerScore={{ markerSubmitted: false, markerScore: null }} />
    );
    fireEvent.click(screen.getByTestId('marked-score-button'));
    fireEvent.click(screen.getByRole('button', { name: /7/ }));

    rerender(<HoleInput {...base} markedPlayerScore={{ markerSubmitted: false, markerScore: null }} />);

    expect(screen.getByTestId('marked-score-value')).toHaveTextContent('7');
  });
});

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

  // #710: en foursomes hay una bola por pareja. «Tu anotación» y «Anotación
  // marcador» hablaban como si cada uno jugara la suya
  describe('foursomes', () => {
    const defaultProps = { holeNumber: 5, par: 4, strokeIndex: 7, onScoreChange: vi.fn() };

    it('F3: las dos casillas son vuestra bola y la del rival', () => {
      render(<HoleInput {...defaultProps} matchFormat="FOURSOMES" />);

      expect(screen.getByText('input.pairBall')).toBeInTheDocument();
      expect(screen.getByText('input.rivalBall')).toBeInTheDocument();
      expect(screen.queryByText('input.yourScore')).not.toBeInTheDocument();
    });

    it('F4: y en solo lectura, vuestra bola y lo que apuntó el rival', () => {
      render(
        <HoleInput
          {...defaultProps}
          matchFormat="FOURSOMES"
          isReadOnly
          playerScore={{ ownScore: 5, markerScore: 5 }}
        />
      );

      expect(screen.getByText('input.pairBall')).toBeInTheDocument();
      expect(screen.getByText('input.rivalCount')).toBeInTheDocument();
    });

    it('F3b: y el teclado que se abre se titula igual (revisión local)', () => {
      render(<HoleInput {...defaultProps} matchFormat="FOURSOMES" />);

      fireEvent.click(screen.getByTestId('own-score-button'));

      expect(screen.getAllByText('input.pairBall').length).toBeGreaterThan(1);
      expect(screen.queryByText('input.yourScore')).not.toBeInTheDocument();
    });

    it('F3c: y el de la bola rival también', () => {
      render(<HoleInput {...defaultProps} matchFormat="FOURSOMES" />);

      fireEvent.click(screen.getByTestId('marked-score-button'));

      expect(screen.getAllByText('input.rivalBall').length).toBeGreaterThan(1);
      expect(screen.queryByText('input.markerScore')).not.toBeInTheDocument();
    });

    it('F5: en fourball, cada uno la suya, como siempre', () => {
      render(<HoleInput {...defaultProps} matchFormat="FOURBALL" />);

      expect(screen.getByText('input.yourScore')).toBeInTheDocument();
      expect(screen.getByText('input.markerScore')).toBeInTheDocument();
    });
  });

  // FE #736 · los dos huecos a la misma altura. La cabecera del marcado lleva
  // la marca de validación y es más alta que la tuya: con una columna por
  // jugador, su hueco quedaba 4 px más abajo. Etiquetas en una fila de la
  // rejilla y huecos en la siguiente: comparten fila, midan lo que midan
  describe('los dos huecos a la misma altura (#736)', () => {
    const defaultProps = { holeNumber: 5, par: 4, strokeIndex: 7, onScoreChange: vi.fn() };
    const filaDeLosHuecos = () => {
      const rejilla = screen.getByTestId('huecos-del-hoyo');
      return [...rejilla.children].slice(2);
    };

    it('A1: con la marca del marcado, los dos huecos van en la misma fila', () => {
      render(<HoleInput {...defaultProps} markedValidationStatus="match" />);
      const [tuyo, suyo] = filaDeLosHuecos();
      expect(tuyo).toBe(screen.getByTestId('own-score-button'));
      expect(suyo).toBe(screen.getByTestId('marked-score-button'));
    });

    it('A2: sin marca, igual', () => {
      render(<HoleInput {...defaultProps} />);
      const [tuyo, suyo] = filaDeLosHuecos();
      expect(tuyo).toBe(screen.getByTestId('own-score-button'));
      expect(suyo).toBe(screen.getByTestId('marked-score-button'));
    });

    it('A3: un hueco bloqueado sigue en su sitio de la fila', () => {
      render(
        <HoleInput
          {...defaultProps}
          isOwnScoreLocked
          playerScore={{ ownScore: 4, ownSubmitted: true }}
        />
      );
      const [tuyo, suyo] = filaDeLosHuecos();
      expect(tuyo).toBe(screen.getByTestId('own-score-value'));
      expect(suyo).toBe(screen.getByTestId('marked-score-button'));
    });
  });
});
