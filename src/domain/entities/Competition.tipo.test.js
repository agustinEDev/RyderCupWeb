import { describe, it, expect } from 'vitest';
import Competition from './Competition';
import { CompetitionId } from '../value_objects/CompetitionId';
import { CompetitionName } from '../value_objects/CompetitionName';
import { DateRange } from '../value_objects/DateRange';
import { Location } from '../value_objects/Location';
import { CountryCode } from '../value_objects/CountryCode';
import { HandicapSettings, HandicapType } from '../value_objects/HandicapSettings';
import { TeamAssignment } from '../value_objects/TeamAssignment';

/**
 * Solo una Ryder Cup tiene equipos, en su pieza (FE #791), como en el backend.
 *
 * La entidad exigía nombres de equipo a toda competición, y el mapper se los
 * inventaba («Team 1»/«Team 2») a un Stableford: la ficha enseñaba equipos que
 * no existen y editarlo los mandaba de vuelta, con un 400 del backend.
 */
const props = (extra = {}) => ({
  id: CompetitionId.generate(),
  creatorId: 'user-123',
  name: new CompetitionName('Torneo del club'),
  dates: new DateRange(new Date('2030-06-01'), new Date('2030-06-02')),
  location: new Location(new CountryCode('ES')),
  handicapSettings: new HandicapSettings(HandicapType.HANDICAP),
  ...extra,
});

const ryder = (extra = {}) =>
  new Competition(
    props({ team1Name: 'Europa', team2Name: 'USA', teamAssignment: TeamAssignment.MANUAL, ...extra })
  );

describe('Competition · el tipo de torneo (FE #791)', () => {
  it('D1: un Stableford no tiene pieza de Ryder', () => {
    const competicion = new Competition(props({ tournamentType: 'STABLEFORD' }));

    expect(competicion.tournamentType).toBe('STABLEFORD');
    expect(competicion.ryderCup).toBeNull();
    expect(competicion.hasTeams).toBe(false);
  });

  it('D2: una Ryder sin nombres de equipo sigue sin poder crearse', () => {
    expect(() => new Competition(props({ teamAssignment: TeamAssignment.MANUAL }))).toThrow(
      'Team 1 name cannot be empty.'
    );
  });

  it('D3: sin tipo es una Ryder Cup, con su pieza', () => {
    const competicion = ryder();

    expect(competicion.tournamentType).toBe('RYDER_CUP');
    expect(competicion.hasTeams).toBe(true);
    expect(competicion.ryderCup.team1Name).toBe('Europa');
  });

  it('D4: cambiar de estado conserva el tipo y la pieza', () => {
    const stableford = new Competition(props({ tournamentType: 'STABLEFORD' })).activate();
    const activada = ryder().activate();

    expect(stableford.tournamentType).toBe('STABLEFORD');
    expect(stableford.ryderCup).toBeNull();
    expect(activada.ryderCup.team2Name).toBe('USA');
  });

  it('D5: a un Stableford no se le ponen equipos al editarlo', () => {
    const stableford = new Competition(props({ tournamentType: 'STABLEFORD' }));

    expect(() => stableford.updateInfo({ team1Name: 'Europa' })).toThrow('no tiene equipos');
  });

  it('D6: una Ryder sí cambia sus equipos', () => {
    expect(ryder().updateInfo({ team1Name: 'Asia' }).ryderCup.team1Name).toBe('Asia');
  });
});
