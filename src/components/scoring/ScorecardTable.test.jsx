import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import ScorecardTable from './ScorecardTable';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => opts ? `${key} ${JSON.stringify(opts)}` : key,
    i18n: { language: 'en' },
  }),
}));

const holes = Array.from({ length: 18 }, (_, i) => ({
  holeNumber: i + 1,
  par: 4,
  strokeIndex: i + 1,
}));

const players = [
  { userId: 'u1', userName: 'Player A', team: 'A' },
  { userId: 'u2', userName: 'Player B', team: 'B' },
];

describe('ScorecardTable', () => {
  it('should render the scorecard', () => {
    render(<ScorecardTable holes={holes} players={players} currentUserId="u1" />);
    expect(screen.getByTestId('scorecard-table')).toBeInTheDocument();
  });

  it('should display OUT and IN sections', () => {
    render(<ScorecardTable holes={holes} players={players} currentUserId="u1" />);
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('scorecard.out');
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('scorecard.in');
  });

  it('should display player names', () => {
    render(<ScorecardTable holes={holes} players={players} currentUserId="u1" />);
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('Player A');
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('Player B');
  });

  it('should display par values', () => {
    render(<ScorecardTable holes={holes} players={players} currentUserId="u1" />);
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('scorecard.par');
  });

  it('should display stroke index values', () => {
    render(<ScorecardTable holes={holes} players={players} currentUserId="u1" />);
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('scorecard.si');
  });

  it('should show dash when no score', () => {
    render(<ScorecardTable holes={holes} players={players} scores={[]} currentUserId="u1" />);
    const table = screen.getByTestId('scorecard-table');
    expect(table).toBeInTheDocument();
  });

  /**
   * La coincidencia entre anotadores se decidió que vive en la anotación, no en
   * la tarjeta: aquí se viene a leer el resultado, y un icono por celda competía
   * con él en las 18 columnas.
   */
  it('no pinta el icono de coincidencia en las celdas', () => {
    const scores = [
      {
        holeNumber: 1,
        playerScores: [
          { userId: 'u1', ownScore: 5, netScore: 4, validationStatus: 'match' },
          { userId: 'u2', ownScore: 6, netScore: 6, validationStatus: 'mismatch' },
        ],
      },
    ];

    render(<ScorecardTable holes={holes} players={players} scores={scores} currentUserId="u1" />);

    expect(screen.queryByTestId('validation-icon')).not.toBeInTheDocument();
    // pero los resultados siguen estando: GolfFigure emite el mismo testid para
    // su guión de "sin resultado", así que contar iconos no distinguiría una
    // tarjeta con datos de una vacía
    const figures = screen.getAllByTestId('golf-figure').map((f) => f.textContent);
    expect(figures).toContain('5');
    expect(figures).toContain('6');
  });

  it('should highlight current user row', () => {
    const scores = [{ holeNumber: 1, playerScores: [{ userId: 'u1', ownScore: 5, netScore: 4, validationStatus: 'match' }] }];
    render(<ScorecardTable holes={holes} players={players} scores={scores} currentUserId="u1" />);
    const table = screen.getByTestId('scorecard-table');
    expect(table.innerHTML).toContain('bg-blue-50');
  });

  it('should render with empty arrays', () => {
    render(<ScorecardTable />);
    expect(screen.getByTestId('scorecard-table')).toBeInTheDocument();
  });

  it('should display result row', () => {
    render(<ScorecardTable holes={holes} players={players} currentUserId="u1" />);
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('scorecard.result');
  });

  it('should show hole result winner with team name', () => {
    const scores = [{ holeNumber: 1, playerScores: [{ userId: 'u1', ownScore: 4, validationStatus: 'match' }], holeResult: { winner: 'A', standing: '1UP' } }];
    render(<ScorecardTable holes={holes} players={players} scores={scores} currentUserId="u1" teamAName="Team Red" teamBName="Team Blue" />);
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('Team Red');
  });

  it('should show halved symbol for halved holes', () => {
    const scores = [{ holeNumber: 1, playerScores: [{ userId: 'u1', ownScore: 4, validationStatus: 'match' }], holeResult: { winner: 'HALVED', standing: 'AS' } }];
    render(<ScorecardTable holes={holes} players={players} scores={scores} currentUserId="u1" teamAName="Team Red" teamBName="Team Blue" />);
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('scorecard.halved');
  });

  it('should show team B name when team B wins hole', () => {
    const scores = [{ holeNumber: 1, playerScores: [{ userId: 'u2', ownScore: 3, validationStatus: 'match' }], holeResult: { winner: 'B', standing: '1UP' } }];
    render(<ScorecardTable holes={holes} players={players} scores={scores} currentUserId="u1" teamAName="Team Red" teamBName="Team Blue" />);
    expect(screen.getByTestId('scorecard-table')).toHaveTextContent('Team Blue');
  });

  describe('FOURSOMES format', () => {
    const foursomePlayers = [
      { userId: 'u1', userName: 'Player A1', team: 'A' },
      { userId: 'u2', userName: 'Player A2', team: 'A' },
      { userId: 'u3', userName: 'Player B1', team: 'B' },
      { userId: 'u4', userName: 'Player B2', team: 'B' },
    ];

    it('should render 2 rows with combined names for FOURSOMES', () => {
      render(<ScorecardTable holes={holes} players={foursomePlayers} currentUserId="u1" matchFormat="FOURSOMES" teamAName="Team Red" teamBName="Team Blue" />);
      const table = screen.getByTestId('scorecard-table');
      expect(table).toHaveTextContent('Player A1 / Player A2');
      expect(table).toHaveTextContent('Player B1 / Player B2');
    });

    it('las parejas se leen enteras: la celda parte en líneas, no corta (FE #727)', () => {
      // «Nacho Noche / …» no decía quién jugaba con quién
      render(<ScorecardTable holes={holes} players={foursomePlayers} currentUserId="u1" matchFormat="FOURSOMES" teamAName="Team Red" teamBName="Team Blue" />);
      // Cada nombre va en su propio elemento desde #414 (con su hándicap al lado)
      const celda = screen.getAllByTestId('jugador-u1')[0].closest('td');
      expect(celda).toHaveTextContent('Player A1 / Player A2');
      expect(celda.className).not.toContain('truncate');
      expect(celda.className).toContain('whitespace-normal');
      // Ni el nombre: en la tabla, la caja del jugador va en línea, sin cortar
      const jugadorEnLaTabla = screen.getAllByTestId('jugador-u1')[0];
      expect(jugadorEnLaTabla).not.toHaveAttribute('class');
      expect(within(jugadorEnLaTabla).getByText('Player A1')).not.toHaveAttribute('class');
    });

    it('should show team names above player names in FOURSOMES', () => {
      render(<ScorecardTable holes={holes} players={foursomePlayers} currentUserId="u1" matchFormat="FOURSOMES" teamAName="Team Red" teamBName="Team Blue" />);
      const table = screen.getByTestId('scorecard-table');
      expect(table).toHaveTextContent('Team Red');
      expect(table).toHaveTextContent('Team Blue');
    });

    it('should show team color borders in FOURSOMES', () => {
      render(<ScorecardTable holes={holes} players={foursomePlayers} currentUserId="u1" matchFormat="FOURSOMES" teamAName="Team Red" teamBName="Team Blue" />);
      const table = screen.getByTestId('scorecard-table');
      expect(table.innerHTML).toContain('border-l-blue-500');
      expect(table.innerHTML).toContain('border-l-red-500');
    });

    it('should use first available score from teammates in FOURSOMES', () => {
      const foursomeScores = [{
        holeNumber: 1,
        playerScores: [
          { userId: 'u1', ownScore: 4, validationStatus: 'match' },
          { userId: 'u3', ownScore: 5, validationStatus: 'match' },
        ],
      }];
      render(<ScorecardTable holes={holes} players={foursomePlayers} scores={foursomeScores} currentUserId="u1" matchFormat="FOURSOMES" />);
      expect(screen.getByTestId('scorecard-table')).toBeInTheDocument();
    });

    it('should not show best-ball highlighting in FOURSOMES', () => {
      const scoresWithBestBall = [{
        holeNumber: 1,
        playerScores: [{ userId: 'u1', ownScore: 4, validationStatus: 'match' }],
        holeResult: { winner: 'A', bestBallPlayerA: ['u1'] },
      }];
      render(<ScorecardTable holes={holes} players={foursomePlayers} scores={scoresWithBestBall} currentUserId="u1" matchFormat="FOURSOMES" />);
      expect(screen.getByTestId('scorecard-table').innerHTML).not.toContain('bg-yellow-50');
    });
  });

  describe('FOURBALL format', () => {
    const fourballPlayers = [
      { userId: 'u1', userName: 'Player A1', team: 'A' },
      { userId: 'u2', userName: 'Player A2', team: 'A' },
      { userId: 'u3', userName: 'Player B1', team: 'B' },
      { userId: 'u4', userName: 'Player B2', team: 'B' },
    ];

    it('should show team color borders for FOURBALL', () => {
      render(<ScorecardTable holes={holes} players={fourballPlayers} currentUserId="u1" matchFormat="FOURBALL" teamAName="Team Red" teamBName="Team Blue" />);
      const table = screen.getByTestId('scorecard-table');
      expect(table.innerHTML).toContain('border-l-blue-500');
      expect(table.innerHTML).toContain('border-l-red-500');
    });

    it('should render 4 individual rows for FOURBALL', () => {
      render(<ScorecardTable holes={holes} players={fourballPlayers} currentUserId="u1" matchFormat="FOURBALL" teamAName="Team Red" teamBName="Team Blue" />);
      const table = screen.getByTestId('scorecard-table');
      expect(table).toHaveTextContent('Player A1');
      expect(table).toHaveTextContent('Player A2');
      expect(table).toHaveTextContent('Player B1');
      expect(table).toHaveTextContent('Player B2');
    });

    it('should show team names above player names in FOURBALL', () => {
      render(<ScorecardTable holes={holes} players={fourballPlayers} currentUserId="u1" matchFormat="FOURBALL" teamAName="Team Red" teamBName="Team Blue" />);
      const table = screen.getByTestId('scorecard-table');
      expect(table).toHaveTextContent('Team Red');
      expect(table).toHaveTextContent('Team Blue');
    });
  });

  describe('SINGLES format', () => {
    it('should not show team color borders for SINGLES', () => {
      render(<ScorecardTable holes={holes} players={players} currentUserId="u1" matchFormat="SINGLES" />);
      const table = screen.getByTestId('scorecard-table');
      expect(table.innerHTML).not.toContain('border-l-blue-500');
      expect(table.innerHTML).not.toContain('border-l-red-500');
    });
  });
});
/**
 * La rejilla comparte las filas Par y SI entre todos los jugadores, pero la
 * FIGURA de cada casilla es de quien juega esa bola: en 25 de los 800 campos
 * federados el par cambia entre barras, y quien no jugaba la primera veía su
 * resultado dibujado contra un par ajeno. Ver RyderCupWeb#417.
 */
describe('ScorecardTable · la figura sale del par de cada jugador', () => {
  const courseHoles = Array.from({ length: 18 }, (_, i) => ({
    holeNumber: i + 1,
    par: 4,
    strokeIndex: i + 1,
  }));

  // El de naranjas juega un par 3 donde la tarjeta del campo dice 4
  const orangeCard = courseHoles.map((h) => (h.holeNumber === 1 ? { ...h, par: 3 } : h));

  const players = [
    { userId: 'u1', userName: 'Naranjas', team: 'A', holeCard: orangeCard },
    { userId: 'u2', userName: 'Campo', team: 'B', holeCard: [] },
  ];

  const scores = [
    {
      holeNumber: 1,
      playerScores: [
        { userId: 'u1', ownScore: 3 },
        { userId: 'u2', ownScore: 3 },
      ],
    },
  ];

  it('pinta par para quien juega un par 3 y birdie para quien juega el par 4 del campo', () => {
    render(
      <ScorecardTable
        holes={courseHoles}
        players={players}
        scores={scores}
        currentUserId="u1"
      />
    );

    const figures = screen.getAllByTestId('golf-figure');
    const titles = figures.map((f) => f.getAttribute('title')).filter(Boolean);

    // Mismo 3 en el mismo hoyo, dos figuras distintas: cada una contra su par
    expect(titles).toContain('figures.par');
    expect(titles).toContain('figures.birdie');
  });

  it('cae al par del campo para quien no trae tarjeta de barra', () => {
    render(
      <ScorecardTable
        holes={courseHoles}
        players={[players[1]]}
        scores={[{ holeNumber: 1, playerScores: [{ userId: 'u2', ownScore: 3 }] }]}
        currentUserId="u2"
      />
    );

    const titles = screen
      .getAllByTestId('golf-figure')
      .map((f) => f.getAttribute('title'))
      .filter(Boolean);

    expect(titles).toContain('figures.birdie');
    expect(titles).not.toContain('figures.par');
  });
});
/**
 * En foursomes la fila es el bando entero. Leer el par del primero le pintaba
 * al compañero un par que no juega, así que un bando con los dos en barras de
 * distinto par se queda con la del campo: no es la de ninguno de los dos, y por
 * eso es preferible a la de uno. Ver RyderCupWeb#417.
 */
describe('ScorecardTable · foursomes con los dos jugadores en barras distintas', () => {
  const courseHoles = Array.from({ length: 18 }, (_, i) => ({
    holeNumber: i + 1,
    par: 4,
    strokeIndex: i + 1,
  }));

  const cardWithPar = (par) =>
    courseHoles.map((h) => (h.holeNumber === 1 ? { ...h, par } : h));

  const scores = [
    {
      holeNumber: 1,
      playerScores: [
        { userId: 'a1', ownScore: 3 },
        { userId: 'a2', ownScore: 3 },
        { userId: 'b1', ownScore: 3 },
        { userId: 'b2', ownScore: 3 },
      ],
    },
  ];

  it('usa el par del campo cuando el bando no comparte par', () => {
    const players = [
      // Bando A: uno juega un par 3 en el hoyo 1 y el otro un par 5
      { userId: 'a1', userName: 'A uno', team: 'A', holeCard: cardWithPar(3) },
      { userId: 'a2', userName: 'A dos', team: 'A', holeCard: cardWithPar(5) },
      // Bando B: los dos en la misma barra, par 3
      { userId: 'b1', userName: 'B uno', team: 'B', holeCard: cardWithPar(3) },
      { userId: 'b2', userName: 'B dos', team: 'B', holeCard: cardWithPar(3) },
    ];

    render(
      <ScorecardTable
        holes={courseHoles}
        players={players}
        scores={scores}
        currentUserId="a1"
        matchFormat="FOURSOMES"
      />
    );

    const titles = screen
      .getAllByTestId('golf-figure')
      .map((f) => f.getAttribute('title'))
      .filter(Boolean);

    // El bando mixto va contra el par 4 del campo: un 3 es birdie.
    // El bando que comparte barra va contra su par 3: el mismo 3 es par.
    expect(titles).toContain('figures.birdie');
    expect(titles).toContain('figures.par');
  });

  it('usa el par del campo si a un miembro del bando le falta la tarjeta', () => {
    const players = [
      { userId: 'a1', userName: 'A uno', team: 'A', holeCard: cardWithPar(3) },
      { userId: 'a2', userName: 'A dos', team: 'A', holeCard: [] },
      { userId: 'b1', userName: 'B uno', team: 'B', holeCard: [] },
      { userId: 'b2', userName: 'B dos', team: 'B', holeCard: [] },
    ];

    render(
      <ScorecardTable
        holes={courseHoles}
        players={players}
        scores={scores}
        currentUserId="a1"
        matchFormat="FOURSOMES"
      />
    );

    const titles = screen
      .getAllByTestId('golf-figure')
      .map((f) => f.getAttribute('title'))
      .filter(Boolean);

    // Ninguna fila puede resolver un par compartido: las dos van al par 4
    expect(titles).toEqual(['figures.birdie', 'figures.birdie']);
  });
});

/**
 * FE #550: la tarjeta se lee de pie en el tee, así que la fila propia es la
 * primera. Se ordena solo lo que se pinta —`players` sigue como llega— porque
 * la posición dentro de ese array decide a nombre de quién se guarda la bola de
 * un bando y qué jugador hace de bando A en el reparto de golpes.
 */
describe('ScorecardTable — la fila de quien mira va primero', () => {
  const cuatro = [
    { userId: 'u1', userName: 'Ana', team: 'A' },
    { userId: 'u2', userName: 'Beto', team: 'A' },
    { userId: 'u3', userName: 'Carlos', team: 'B' },
    { userId: 'u4', userName: 'Diana', team: 'B' },
  ];

  // La primera celda de cada fila del cuerpo lleva la etiqueta; la última fila
  // es la del resultado del hoyo, no un jugador.
  // Solo la primera mitad —la ida—: la vuelta repite las mismas filas en otra
  // tabla, y contarlas dos veces no dice nada más sobre el orden.
  const filasDeLaIda = (container) =>
    [...container.querySelector('tbody').querySelectorAll('tr')].slice(0, -1);

  const etiquetasEnOrden = (container) =>
    filasDeLaIda(container).map((tr) => tr.querySelector('td')?.textContent ?? '');

  it('saca la fila propia delante en individuales', () => {
    const { container } = render(
      <ScorecardTable holes={holes} players={players} currentUserId="u2" matchFormat="SINGLES" />
    );

    expect(etiquetasEnOrden(container)).toEqual(['Player B', 'Player A']);
  });

  it('en fourball sube al compañero detrás y deja a los rivales en su orden', () => {
    const { container } = render(
      <ScorecardTable holes={holes} players={cuatro} currentUserId="u4" matchFormat="FOURBALL" teamAName="Rojos" teamBName="Azules" />
    );

    expect(etiquetasEnOrden(container)).toEqual([
      'AzulesDiana',
      'AzulesCarlos',
      'RojosAna',
      'RojosBeto',
    ]);
  });

  it('en foursomes sube el bando propio y escribe delante el nombre de quien mira', () => {
    const { container } = render(
      <ScorecardTable holes={holes} players={cuatro} currentUserId="u2" matchFormat="FOURSOMES" teamAName="Rojos" teamBName="Azules" />
    );

    // La etiqueta del equipo sigue pegada a su fila: se resuelve por `row.team`
    // y no por la posición, así que subir el bando no la descoloca.
    expect(etiquetasEnOrden(container)).toEqual(['RojosBeto / Ana', 'AzulesCarlos / Diana']);
  });

  it('deja el orden del servidor a quien no juega la partida', () => {
    const { container } = render(
      <ScorecardTable holes={holes} players={cuatro} currentUserId="organizador" matchFormat="FOURSOMES" teamAName="Rojos" teamBName="Azules" />
    );

    expect(etiquetasEnOrden(container)).toEqual(['RojosAna / Beto', 'AzulesCarlos / Diana']);
  });

  /**
   * La bola del bando se busca por `playerIds`, y esos salen de `players` en su
   * orden. Reordenar la etiqueta no puede mover un golpe de fila.
   */
  it('no cambia los golpes que pinta cada fila al reordenarla', () => {
    const scores = [
      {
        holeNumber: 1,
        playerScores: [
          { userId: 'u1', ownScore: 5, netScore: 5 },
          { userId: 'u3', ownScore: 3, netScore: 3 },
        ],
      },
    ];

    // Quien mira es del bando B, el segundo que manda el servidor: si no
    // cambiase de sitio, comparar las dos vistas no probaría nada.
    const comoJugador = render(
      <ScorecardTable holes={holes} players={cuatro} scores={scores} currentUserId="u4" matchFormat="FOURSOMES" />
    );
    const filasDelJugador = filasDeLaIda(comoJugador.container).map(
      (tr) => [...tr.querySelectorAll('td')].slice(1, 3).map((td) => td.textContent)
    );

    comoJugador.unmount();

    const comoEspectador = render(
      <ScorecardTable holes={holes} players={cuatro} scores={scores} currentUserId="nadie" matchFormat="FOURSOMES" />
    );
    const filasDelEspectador = filasDeLaIda(comoEspectador.container).map(
      (tr) => [...tr.querySelectorAll('td')].slice(1, 3).map((td) => td.textContent)
    );

    // Las mismas casillas, intercambiadas de sitio: el 3 del bando B sube con su
    // fila y el 5 del bando A baja con la suya.
    expect(filasDelJugador[0]).toEqual(filasDelEspectador[1]);
    expect(filasDelJugador[1]).toEqual(filasDelEspectador[0]);
    expect(filasDelJugador[0]).not.toEqual(filasDelJugador[1]);
  });
});

/**
 * FE #414 · el hándicap de juego de cada jugador, como en la tarjeta de partida
 * rápida. Va en la misma línea que su nombre, en letra pequeña: con su propia
 * línea la tarjeta crecía.
 */
describe('ScorecardTable · el hándicap de juego junto al nombre (#414)', () => {
  // Corto a la vista («Hcp juego 12»): «Hcp de juego 12» ensanchaba la columna del
  // nombre en el ordenador. El lector de pantalla oye el largo.
  const hcp = (valor) => `scorecard.playingHandicapShort ${JSON.stringify({ value: valor })}`;
  const hcpLargo = (valor) => `scorecard.playingHandicap ${JSON.stringify({ value: valor })}`;
  const conHandicap = [
    { userId: 'u1', userName: 'Player A', team: 'A', playingHandicap: -2 },
    { userId: 'u2', userName: 'Player B', team: 'B', playingHandicap: 14 },
  ];

  it('T1: cada fila dice su hándicap de juego, el plus con su signo', () => {
    render(<ScorecardTable holes={holes} players={conHandicap} currentUserId="u1" matchFormat="SINGLES" />);

    expect(screen.getAllByTestId('hcp-de-juego-u1')[0]).toHaveTextContent(hcp('+2'));
    expect(screen.getAllByTestId('hcp-de-juego-u2')[0]).toHaveTextContent(hcp('14'));
  });

  it('T1: a la vista la etiqueta corta; el lector de pantalla oye la larga', () => {
    render(<ScorecardTable holes={holes} players={conHandicap} currentUserId="u1" matchFormat="SINGLES" />);

    const valor = screen.getAllByTestId('hcp-de-juego-u1')[0];
    expect(within(valor).getByText(hcp('+2'))).toHaveAttribute('aria-hidden', 'true');
    expect(within(valor).getByText(hcpLargo('+2')).className).toMatch(/\bsr-only\b/);
  });

  it('T1: el cero también se dice', () => {
    const conCero = [{ userId: 'u1', userName: 'Player A', team: 'A', playingHandicap: 0 }];
    render(<ScorecardTable holes={holes} players={conCero} currentUserId="u1" matchFormat="SINGLES" />);

    expect(screen.getAllByTestId('hcp-de-juego-u1')[0]).toHaveTextContent(hcp('0'));
  });

  it('T2: en foursomes, cada miembro del bando con el suyo, junto a su nombre', () => {
    const foursomes = [
      { userId: 'a1', userName: 'Nacho', team: 'A', playingHandicap: 8 },
      { userId: 'a2', userName: 'Agustín', team: 'A', playingHandicap: -1 },
      { userId: 'b1', userName: 'Luna', team: 'B', playingHandicap: 20 },
      { userId: 'b2', userName: 'Óscar', team: 'B', playingHandicap: 3 },
    ];
    render(<ScorecardTable holes={holes} players={foursomes} currentUserId="a1" matchFormat="FOURSOMES" />);

    const nacho = screen.getAllByTestId('jugador-a1')[0];
    const agustin = screen.getAllByTestId('jugador-a2')[0];
    expect(nacho).toHaveTextContent(`Nacho${hcp('8')}`);
    expect(agustin).toHaveTextContent(`Agustín${hcp('+1')}`);
    expect(nacho).not.toHaveTextContent('Agustín');
    // Los dos en la fila de su bando
    expect(nacho.closest('td')).toBe(agustin.closest('td'));
    expect(screen.getAllByTestId('hcp-de-juego-b1')[0]).toHaveTextContent(hcp('20'));
    expect(screen.getAllByTestId('hcp-de-juego-b2')[0]).toHaveTextContent(hcp('3'));
  });

  it('T3: en la misma línea que el nombre, nunca en una propia', () => {
    render(<ScorecardTable holes={holes} players={conHandicap} currentUserId="u1" matchFormat="SINGLES" />);

    const jugador = screen.getAllByTestId('jugador-u1')[0];
    const valor = screen.getAllByTestId('hcp-de-juego-u1')[0];
    expect(valor.parentElement).toBe(jugador);
    expect(valor.className).toContain('whitespace-nowrap');
    expect(valor.className).not.toMatch(/\bblock\b/);
    expect(jugador.className).not.toMatch(/\bblock\b|flex-col/);
  });

  it('T4: sin hándicap de juego no se pinta nada más que el nombre', () => {
    const sinHandicap = [
      { userId: 'u1', userName: 'Player A', team: 'A', playingHandicap: null },
      { userId: 'u2', userName: 'Player B', team: 'B' },
    ];
    render(<ScorecardTable holes={holes} players={sinHandicap} currentUserId="u1" matchFormat="SINGLES" />);

    expect(screen.queryAllByTestId(/^hcp-de-juego-/)).toHaveLength(0);
    expect(screen.getAllByTestId('jugador-u1')[0].textContent).toBe('Player A');
    expect(screen.getAllByTestId('jugador-u2')[0].textContent).toBe('Player B');
    expect(screen.getByTestId('scorecard-table')).not.toHaveTextContent('undefined');
    expect(screen.getByTestId('scorecard-table')).not.toHaveTextContent('playingHandicap');
  });
});

/**
 * «Siempre una raya es par + golpes recibidos + 2» (Agustín, 23 oct 2026): en
 * la tarjeta del partido, con los golpes que el jugador recibe en el partido.
 * En neto, `par + 2`. Antes la raya no sumaba nada.
 */
describe('ScorecardTable · la raya suma su doble bogey neto', () => {
  // Recibe golpe en el hoyo 1: con golpes en juego sale el interruptor de neto
  const singles = [
    { userId: 'u1', userName: 'Player A', team: 'A', strokesReceived: [1] },
    { userId: 'u2', userName: 'Player B', team: 'B' },
  ];
  const scores = [
    {
      holeNumber: 1,
      playerScores: [
        { userId: 'u1', ownScore: null, ownSubmitted: true, netScore: null, strokesReceivedThisHole: 1 },
      ],
    },
    {
      holeNumber: 2,
      playerScores: [{ userId: 'u1', ownScore: 4, ownSubmitted: true, netScore: 4, strokesReceivedThisHole: 0 }],
    },
  ];
  // La suma de la ida de Player A: última casilla de su fila en la primera tabla
  const sumaDeLaIda = () => {
    const [ida] = screen.getAllByRole('table');
    const fila = within(ida).getByText('Player A').closest('tr');
    const celdas = within(fila).getAllByRole('cell');
    // La última es el hueco del TOTAL, que solo lleva la vuelta (FE #938)
    return celdas[celdas.length - 2];
  };

  it('en bruto: par 4 con un golpe recogido vale 7', () => {
    render(<ScorecardTable holes={holes} scores={scores} players={singles} currentUserId="u1" />);

    expect(sumaDeLaIda()).toHaveTextContent(/^11$/);
  });

  it('en neto: la raya vale par + 2', () => {
    render(<ScorecardTable holes={holes} scores={scores} players={singles} currentUserId="u1" />);
    fireEvent.click(screen.getByRole('switch', { name: 'scorecard.grossNet' }));

    expect(sumaDeLaIda()).toHaveTextContent(/^10$/);
  });

  it('con el par de la barra del jugador, no el del campo', () => {
    const naranjas = holes.map((h) => (h.holeNumber === 1 ? { ...h, par: 3 } : h));
    const conBarra = [{ ...singles[0], holeCard: naranjas }, singles[1]];
    render(<ScorecardTable holes={holes} scores={scores} players={conBarra} currentUserId="u1" />);

    // Par 3 recogido con un golpe: 6, más el 4 del hoyo 2
    expect(sumaDeLaIda()).toHaveTextContent(/^10$/);
  });

  it('en foursomes cuenta la raya aunque esté en la fila del compañero', () => {
    // Sin conexión solo se reescribe la fila de quien anota: la del otro llega
    // sin enviar y no puede tapar la raya
    const bandos = [
      { userId: 'u1', userName: 'Player A', team: 'A', strokesReceived: [1] },
      { userId: 'u3', userName: 'Player C', team: 'A', strokesReceived: [1] },
      { userId: 'u2', userName: 'Player B', team: 'B' },
    ];
    const conCompanero = [
      {
        holeNumber: 1,
        playerScores: [
          { userId: 'u1', ownScore: null, ownSubmitted: false, strokesReceivedThisHole: 1 },
          { userId: 'u3', ownScore: null, ownSubmitted: true, strokesReceivedThisHole: 1 },
        ],
      },
    ];
    render(
      <ScorecardTable
        holes={holes}
        scores={conCompanero}
        players={bandos}
        currentUserId="u1"
        matchFormat="FOURSOMES"
      />
    );

    const [ida] = screen.getAllByRole('table');
    const fila = within(ida).getAllByRole('row').find((tr) => tr.textContent.includes('Player C'));
    const celdas = within(fila).getAllByRole('cell');
    // La penúltima: la última es el hueco del TOTAL (FE #938)
    expect(celdas[celdas.length - 2]).toHaveTextContent(/^7$/);
  });

  it('una raya enviada gana a un número sin enviar de la otra fila', () => {
    const bandos = [
      { userId: 'u1', userName: 'Player A', team: 'A', strokesReceived: [1] },
      { userId: 'u3', userName: 'Player C', team: 'A', strokesReceived: [1] },
      { userId: 'u2', userName: 'Player B', team: 'B' },
    ];
    const conNumeroSinEnviar = [
      {
        holeNumber: 1,
        playerScores: [
          { userId: 'u1', ownScore: 5, ownSubmitted: false, strokesReceivedThisHole: 1 },
          { userId: 'u3', ownScore: null, ownSubmitted: true, strokesReceivedThisHole: 1 },
        ],
      },
    ];
    render(
      <ScorecardTable
        holes={holes}
        scores={conNumeroSinEnviar}
        players={bandos}
        currentUserId="u1"
        matchFormat="FOURSOMES"
      />
    );

    const [ida] = screen.getAllByRole('table');
    const fila = within(ida).getAllByRole('row').find((tr) => tr.textContent.includes('Player C'));
    const celdas = within(fila).getAllByRole('cell');
    // La penúltima: la última es el hueco del TOTAL (FE #938)
    expect(celdas[celdas.length - 2]).toHaveTextContent(/^7$/);
  });

  it('un hoyo sin anotar sigue sin sumar', () => {
    const sinEnviar = [
      { holeNumber: 1, playerScores: [{ userId: 'u1', ownScore: null, ownSubmitted: false }] },
    ];
    render(<ScorecardTable holes={holes} scores={sinEnviar} players={singles} currentUserId="u1" />);

    expect(sumaDeLaIda()).toHaveTextContent(/^-$/);
  });
});

// F4 (25 oct 2026): el retirado del fourball lleva su etiqueta junto al nombre
describe('ScorecardTable · fourball con un retirado', () => {
  it('F4: «Retirado» junto a su nombre, y solo junto al suyo', () => {
    render(<ScorecardTable holes={holes} players={players} currentUserId="u1" retirados={['u2']} />);
    expect(screen.getAllByTestId('etiqueta-retirado-u2').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('etiqueta-retirado-u1')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('etiqueta-retirado-u2')[0]).toHaveTextContent('withdraw.badge');
  });
  // /code-review (26 oct 2026): dentro del envoltorio que recorta el nombre: a
  // 360 px cede el nombre, no se ensancha la fila
  it('F4: la etiqueta va dentro del nombre que se recorta', () => {
    render(<ScorecardTable holes={holes} players={players} currentUserId="u1" retirados={['u2']} />);
    for (const etiqueta of screen.getAllByTestId('etiqueta-retirado-u2')) {
      expect(etiqueta.closest('[data-testid="jugador-u2"]')).not.toBeNull();
    }
  });
});
