import { describe, it, expect } from 'vitest';
import Competition from './Competition';
import { CompetitionId } from '../value_objects/CompetitionId';
import { CompetitionName } from '../value_objects/CompetitionName';
import { DateRange } from '../value_objects/DateRange';
import { Location } from '../value_objects/Location';
import { CountryCode } from '../value_objects/CountryCode';
import { HandicapSettings, HandicapType } from '../value_objects/HandicapSettings';
import { TeamAssignment } from '../value_objects/TeamAssignment';
import { StrokePlaySetup } from '../value_objects/StrokePlaySetup';

/**
 * Los ajustes del stroke play viven en su pieza (FE #824), como en el backend:
 * un Stableford o un Medal la tiene y una Ryder no.
 */
const props = (extra = {}) => ({
  id: CompetitionId.generate(),
  creatorId: 'user-123',
  name: new CompetitionName('Medal de octubre'),
  dates: new DateRange(new Date('2030-06-01'), new Date('2030-06-02')),
  location: new Location(new CountryCode('ES')),
  handicapSettings: new HandicapSettings(HandicapType.HANDICAP),
  ...extra,
});

const ryder = (extra = {}) =>
  new Competition(
    props({ team1Name: 'Europa', team2Name: 'USA', teamAssignment: TeamAssignment.MANUAL, ...extra })
  );

describe('Competition · los ajustes del stroke play (FE #824)', () => {
  it('P1: un Stableford sin ajustes tiene los de por defecto', () => {
    const competicion = new Competition(props({ tournamentType: 'STABLEFORD' }));

    expect(competicion.strokePlay).toBeInstanceOf(StrokePlaySetup);
    expect(competicion.strokePlay.maxMatchdaysPerPlayer).toBe(1);
  });

  it('P2: un Medal guarda los suyos', () => {
    const ajustes = new StrokePlaySetup({ categoryCount: 3, maxMatchdaysPerPlayer: 2 });

    const competicion = new Competition(props({ tournamentType: 'MEDAL', strokePlay: ajustes }));

    expect(competicion.strokePlay).toBe(ajustes);
  });

  it('P3: una Ryder no tiene la pieza', () => {
    expect(ryder().strokePlay).toBeNull();
  });

  it('P4: una Ryder con ajustes de stroke play no se crea', () => {
    expect(() => ryder({ strokePlay: new StrokePlaySetup({}) })).toThrow();
  });

  it('P5: lo que no es una pieza se rechaza', () => {
    expect(() => new Competition(props({ tournamentType: 'STABLEFORD', strokePlay: { categoryCount: 3 } }))).toThrow();
  });

  it('P6: la pieza viaja con la copia al cambiar de estado', () => {
    const ajustes = new StrokePlaySetup({ categoryLimits: [12] });
    const competicion = new Competition(props({ tournamentType: 'STABLEFORD', strokePlay: ajustes }));

    expect(competicion.activate().strokePlay).toBe(ajustes);
  });
});
