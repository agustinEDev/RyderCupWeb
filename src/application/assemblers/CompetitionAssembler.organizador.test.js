import { describe, it, expect } from 'vitest';
import CompetitionMapper from '../../infrastructure/mappers/CompetitionMapper';
import CompetitionAssembler from './CompetitionAssembler';
import { aExtras } from '../../infrastructure/mappers/conExtras';

/**
 * El nombre del organizador (SB-08, 17 nov 2026). En una privada con alias, el
 * backend manda nombre y apellidos vacíos a quien no es él ni un admin: lo que se
 * pinta es `display_name`, que ya trae el nombre que toca.
 */
const DATOS = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  creator_id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Ryder de los amigos',
  start_date: '2027-06-01',
  end_date: '2027-06-03',
  country_code: 'ES',
  play_mode: 'SCRATCH',
  number_of_players: 12,
  team_assignment: 'AUTOMATIC',
  status: 'DRAFT',
  created_at: '2026-11-17T00:00:00',
  updated_at: '2026-11-17T00:00:00',
};

const conCreador = (creator) => ({ ...DATOS, creator });

describe('CompetitionAssembler · el organizador', () => {
  const dto = (apiData) =>
    CompetitionAssembler.toSimpleDTO(
      CompetitionMapper.toDomain(apiData),
      aExtras(apiData),
    );

  it('privada con alias: se pinta el alias aunque no lleguen nombre ni apellidos', () => {
    const { creator } = dto(
      conCreador({
        id: 'c-1',
        first_name: '',
        last_name: '',
        display_name: 'Trinx',
        alias: null,
      }),
    );

    expect(creator.displayName).toBe('Trinx');
    expect(creator.alias).toBeNull();
  });

  it('pública: el nombre real, y el alias aparte para ponerlo debajo', () => {
    const { creator } = dto(
      conCreador({
        id: 'c-1',
        first_name: 'Agustín',
        last_name: 'Estévez',
        display_name: 'Agustín Estévez',
        alias: 'Trinx',
      }),
    );

    expect(creator.displayName).toBe('Agustín Estévez');
    expect(creator.alias).toBe('Trinx');
  });

  it('sin display_name ni nombre, el alias: el mismo criterio que el resto de la app', () => {
    const { creator } = dto(
      conCreador({ id: 'c-1', first_name: '', last_name: '', alias: 'Trinx' }),
    );

    expect(creator.displayName).toBe('Trinx');
  });

  it('una respuesta antigua sin display_name sigue enseñando nombre y apellidos', () => {
    const { creator } = dto(
      conCreador({ id: 'c-1', first_name: 'Agustín', last_name: 'Estévez' }),
    );

    expect(creator.displayName).toBe('Agustín Estévez');
  });
});
