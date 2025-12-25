// src/domain/entities/Competition.test.js

import { describe, it, expect, beforeEach } from 'vitest';
import Competition, { CompetitionStateError } from './Competition';
import { CompetitionId } from '../value_objects/CompetitionId';
import { CompetitionName } from '../value_objects/CompetitionName';
import { DateRange } from '../value_objects/DateRange';
import { Location } from '../value_objects/Location';
import { CountryCode } from '../value_objects/CountryCode';
import { HandicapSettings, HandicapType } from '../value_objects/HandicapSettings';
import { TeamAssignment } from '../value_objects/TeamAssignment';
import { CompetitionStatus } from '../value_objects/CompetitionStatus';

// Mock UserId for testing purposes
class UserId {
  constructor(value) { this.id = value; }
  equals(other) { return other instanceof UserId && this.id === other.id; }
  toString() { return this.id; }
}

describe('Competition', () => {
  let mockCompetitionId;
  let mockCreatorId;
  let mockName;
  let mockDates;
  let mockLocation;
  let mockHandicapSettings;
  let mockTeamAssignment;

  beforeEach(() => {
    mockCompetitionId = CompetitionId.generate();
    mockCreatorId = new UserId('user-123');
    mockName = new CompetitionName('Test Competition');
    mockDates = new DateRange(new Date('2025-01-01'), new Date('2025-01-05'));
    mockLocation = new Location(new CountryCode('ES'));
    mockHandicapSettings = new HandicapSettings(HandicapType.PERCENTAGE, 90);
    mockTeamAssignment = TeamAssignment.MANUAL;
  });

  const createValidCompetitionProps = (overrides = {}) => ({
    id: mockCompetitionId,
    creatorId: mockCreatorId,
    name: mockName,
    dates: mockDates,
    location: mockLocation,
    team1Name: 'Team Alpha',
    team2Name: 'Team Beta',
    handicapSettings: mockHandicapSettings,
    maxPlayers: 24,
    teamAssignment: mockTeamAssignment,
    ...overrides,
  });

  describe('Constructor and Static create()', () => {
    it('should create a Competition instance with valid properties', () => {
      const props = createValidCompetitionProps();
      const competition = new Competition(props);
      expect(competition).toBeInstanceOf(Competition);
      expect(competition.id.equals(props.id)).toBe(true);
      expect(competition.creatorId.equals(props.creatorId)).toBe(true);
      expect(competition.name.equals(props.name)).toBe(true);
      expect(competition.dates.equals(props.dates)).toBe(true);
      expect(competition.location.equals(props.location)).toBe(true);
      expect(competition.team1Name).toBe(props.team1Name);
      expect(competition.team2Name).toBe(props.team2Name);
      expect(competition.handicapSettings.equals(props.handicapSettings)).toBe(true);
      expect(competition.maxPlayers).toBe(props.maxPlayers);
      expect(competition.teamAssignment.equals(props.teamAssignment)).toBe(true);
      expect(competition.status.equals(CompetitionStatus.DRAFT)).toBe(true);
      expect(competition.createdAt).toBeInstanceOf(Date);
      expect(competition.updatedAt).toBeInstanceOf(Date);
    });

    it('create() should initialize with DRAFT status and current dates', () => {
      const props = createValidCompetitionProps();
      const competition = Competition.create(props);
      expect(competition.status.equals(CompetitionStatus.DRAFT)).toBe(true);
      expect(competition.createdAt).toBeInstanceOf(Date);
      expect(competition.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw an error if team1Name is empty', () => {
      const props = createValidCompetitionProps({ team1Name: '' });
      expect(() => new Competition(props)).toThrow('Team 1 name cannot be empty.');
    });

    it('should throw an error if team2Name is empty', () => {
      const props = createValidCompetitionProps({ team2Name: '' });
      expect(() => new Competition(props)).toThrow('Team 2 name cannot be empty.');
    });

    it('should throw an error if team names are the same', () => {
      const props = createValidCompetitionProps({ team1Name: 'Same', team2Name: 'Same' });
      expect(() => new Competition(props)).toThrow('Team names must be different.');
    });
  });

  describe('Getters', () => {
    it('should return the correct id', () => {
      const props = createValidCompetitionProps();
      const competition = new Competition(props);
      expect(competition.id.equals(props.id)).toBe(true);
    });
    
    it('should return the correct creatorId', () => {
      const props = createValidCompetitionProps();
      const competition = new Competition(props);
      expect(competition.creatorId.equals(props.creatorId)).toBe(true)
    });

    it('should return the correct name', () => {
      const props = createValidCompetitionProps();
      const competition = new Competition(props);
      expect(competition.name.equals(props.name)).toBe(true)
    });
    
    it('should return the correct dates', () => {
      const props = createValidCompetitionProps();
      const competition = new Competition(props);
      expect(competition.dates.equals(props.dates)).toBe(true)
    });

    it('should return the correct location', () => {
      const props = createValidCompetitionProps();
      const competition = new Competition(props);
      expect(competition.location.equals(props.location)).toBe(true)
    });

    it('should return the correct team1Name', () => {
      const props = createValidCompetitionProps();
      const competition = new Competition(props);
      expect(competition.team1Name).toBe(props.team1Name)
    });

    it('should return the correct team2Name', () => {
      const props = createValidCompetitionProps();
      const competition = new Competition(props);
      expect(competition.team2Name).toBe(props.team2Name)
    });

    it('should return the correct handicapSettings', () => {
      const props = createValidCompetitionProps();
      const competition = new Competition(props);
      expect(competition.handicapSettings.equals(props.handicapSettings)).toBe(true)
    });

    it('should return the correct maxPlayers', () => {
      const props = createValidCompetitionProps();
      const competition = new Competition(props);
      expect(competition.maxPlayers).toBe(props.maxPlayers)
    });

    it('should return the correct teamAssignment', () => {
      const props = createValidCompetitionProps();
      const competition = new Competition(props);
      expect(competition.teamAssignment.equals(props.teamAssignment)).toBe(true)
    });

    it('should return the correct status', () => {
      const props = createValidCompetitionProps();
      const competition = new Competition(props);
      expect(competition.status.equals(CompetitionStatus.DRAFT)).toBe(true)
    });
  });

  describe('Query Methods', () => {
    it('isCreator should return true for the creator', () => {
      const competition = new Competition(createValidCompetitionProps());
      expect(competition.isCreator(mockCreatorId)).toBe(true);
    });

    it('isCreator should return false for a different user', () => {
      const competition = new Competition(createValidCompetitionProps());
      expect(competition.isCreator(new UserId('another-user'))).toBe(false);
    });

    it('isDraft should be true for a new competition', () => {
      const competition = Competition.create(createValidCompetitionProps());
      expect(competition.isDraft()).toBe(true);
      expect(competition.allowsModifications()).toBe(true);
    });

    it('isActive should be true after activation', () => {
      let competition = Competition.create(createValidCompetitionProps());
      competition = competition.activate();
      expect(competition.isActive()).toBe(true);
      expect(competition.allowsEnrollments()).toBe(true);
    });

    // Test other status queries similarly
    it('isClosed should be true after enrollments closed', () => {
      let competition = Competition.create(createValidCompetitionProps());
      competition = competition.activate().closeEnrollments();
      expect(competition.isClosed()).toBe(true);
    });

    it('isInProgress should be true after start', () => {
      let competition = Competition.create(createValidCompetitionProps());
      competition = competition.activate().closeEnrollments().start();
      expect(competition.isInProgress()).toBe(true);
    });

    it('isCompleted should be true after complete', () => {
      let competition = Competition.create(createValidCompetitionProps());
      competition = competition.activate().closeEnrollments().start().complete();
      expect(competition.isCompleted()).toBe(true);
    });

    it('isCancelled should be true after cancel', () => {
      let competition = Competition.create(createValidCompetitionProps());
      competition = competition.cancel();
      expect(competition.isCancelled()).toBe(true);
    });
  });

  describe('Command Methods (State Transitions)', () => {
    it('activate() should transition from DRAFT to ACTIVE', () => {
      const initialCompetition = Competition.create(createValidCompetitionProps());
      const activatedCompetition = initialCompetition.activate();
      expect(activatedCompetition.status.equals(CompetitionStatus.ACTIVE)).toBe(true);
      expect(activatedCompetition).not.toBe(initialCompetition); // Should return new instance
      // expect(activatedCompetition.updatedAt.getTime()).toBeGreaterThan(initialCompetition.updatedAt.getTime());
    });

    it('should throw CompetitionStateError if activate() from non-DRAFT state', () => {
      let competition = Competition.create(createValidCompetitionProps());
      competition = competition.activate(); // Now ACTIVE
      expect(() => competition.activate()).toThrow(CompetitionStateError);
    });
    
    // Test closeEnrollments, start, complete, cancel similarly
    it('closeEnrollments() should transition from ACTIVE to CLOSED', () => {
      let competition = Competition.create(createValidCompetitionProps()).activate();
      const closedCompetition = competition.closeEnrollments();
      expect(closedCompetition.status.equals(CompetitionStatus.CLOSED)).toBe(true);
      expect(closedCompetition).not.toBe(competition);
    });

    it('start() should transition from CLOSED to IN_PROGRESS', () => {
      let competition = Competition.create(createValidCompetitionProps()).activate().closeEnrollments();
      const startedCompetition = competition.start();
      expect(startedCompetition.status.equals(CompetitionStatus.IN_PROGRESS)).toBe(true);
      expect(startedCompetition).not.toBe(competition);
    });

    it('complete() should transition from IN_PROGRESS to COMPLETED', () => {
      let competition = Competition.create(createValidCompetitionProps()).activate().closeEnrollments().start();
      const completedCompetition = competition.complete();
      expect(completedCompetition.status.equals(CompetitionStatus.COMPLETED)).toBe(true);
      expect(completedCompetition).not.toBe(competition);
    });

    it('cancel() should transition from DRAFT to CANCELLED', () => {
      const initialCompetition = Competition.create(createValidCompetitionProps());
      const cancelledCompetition = initialCompetition.cancel();
      expect(cancelledCompetition.status.equals(CompetitionStatus.CANCELLED)).toBe(true);
      expect(cancelledCompetition).not.toBe(initialCompetition);
    });

    it('cancel() should transition from ACTIVE to CANCELLED', () => {
      let competition = Competition.create(createValidCompetitionProps()).activate();
      const cancelledCompetition = competition.cancel();
      expect(cancelledCompetition.status.equals(CompetitionStatus.CANCELLED)).toBe(true);
      expect(cancelledCompetition).not.toBe(competition);
    });

    it('should throw CompetitionStateError if cancel() from final state', () => {
      let competition = Competition.create(createValidCompetitionProps()).activate().closeEnrollments().start().complete(); // COMPLETED
      
      try {
        competition.cancel();
        // If it gets here, the test fails because it didn't throw.
        expect.fail('Expected cancel() to throw CompetitionStateError, but it did not.');
      } catch (e) {
        expect(e).toBeInstanceOf(CompetitionStateError);
      }

      const cancelledCompetition = Competition.create(createValidCompetitionProps()).cancel(); // Now CANCELLED
      
      try {
        cancelledCompetition.cancel();
        // If it gets here, the test fails because it didn't throw.
        expect.fail('Expected cancel() to throw CompetitionStateError, but it did not.');
      } catch (e) {
        expect(e).toBeInstanceOf(CompetitionStateError);
      }
    });
  });

  describe('updateInfo()', () => {
    it('should update properties in DRAFT state and return a new instance', () => {
      const initialCompetition = Competition.create(createValidCompetitionProps());
      const newName = new CompetitionName('Updated Name');
      const updatedCompetition = initialCompetition.updateInfo({ name: newName });

      expect(updatedCompetition).not.toBe(initialCompetition); // New instance
      expect(updatedCompetition.name.equals(newName)).toBe(true);
      // expect(updatedCompetition.updatedAt.getTime()).toBeGreaterThan(initialCompetition.updatedAt.getTime());
      expect(updatedCompetition.status.equals(CompetitionStatus.DRAFT)).toBe(true); // Status should remain DRAFT
    });

    it('should throw CompetitionStateError if updateInfo() from non-DRAFT state', () => {
      let competition = Competition.create(createValidCompetitionProps()).activate(); // Now ACTIVE
      expect(() => competition.updateInfo({ name: new CompetitionName('New Name') })).toThrow(CompetitionStateError);
    });

    it('should throw error for invalid team names during update', () => {
      const competition = Competition.create(createValidCompetitionProps());
      expect(() => competition.updateInfo({ team1Name: '' })).toThrow('Team 1 name cannot be empty.');
      expect(() => competition.updateInfo({ team1Name: 'Same', team2Name: 'Same' })).toThrow('Team names must be different.');
    });

    it('should throw error for invalid maxPlayers during update', () => {
      const competition = Competition.create(createValidCompetitionProps());
      expect(() => competition.updateInfo({ maxPlayers: 1 })).toThrow('maxPlayers must be a number between 2 and 100.');
      expect(() => competition.updateInfo({ maxPlayers: 101 })).toThrow('maxPlayers must be a number between 2 and 100.');
      expect(() => competition.updateInfo({ maxPlayers: 'invalid' })).toThrow('maxPlayers must be a number between 2 and 100.');
    });
  });

  describe('equals', () => {
    it('should return true for two competitions with the same ID', () => {
      const id = CompetitionId.generate();
      const comp1 = new Competition(createValidCompetitionProps({ id }));
      const comp2 = new Competition(createValidCompetitionProps({ id }));
      expect(comp1.equals(comp2)).toBe(true);
    });

    it('should return false for two competitions with different IDs', () => {
      const comp1 = new Competition(createValidCompetitionProps({ id: CompetitionId.generate() }));
      const comp2 = new Competition(createValidCompetitionProps({ id: CompetitionId.generate() }));
      expect(comp1.equals(comp2)).toBe(false);
    });

    it('should return false when comparing with null or different object type', () => {
      const competition = Competition.create(createValidCompetitionProps());
      expect(competition.equals(null)).toBe(false);
      expect(competition.equals(undefined)).toBe(false);
      expect(competition.equals({ id: competition.id })).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return a string representation of the competition', () => {
      const competition = Competition.create(createValidCompetitionProps());
      expect(competition.toString()).toBe(`${mockName.toString()} (${CompetitionStatus.DRAFT.toString()})`);
    });
  });
});
