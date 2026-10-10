import { errorDeHoja } from '../../../domain/value_objects/HojaDeSalidas';

class CreateRoundUseCase {
  constructor({ scheduleRepository }) {
    this.scheduleRepository = scheduleRepository;
  }

  async execute(competitionId, roundData) {
    if (!competitionId) {
      throw new Error('Competition ID is required');
    }
    if (!roundData || typeof roundData !== 'object') {
      throw new Error('Round data is required');
    }
    if (!roundData.golf_course_id) {
      throw new Error('Golf course ID is required');
    }
    if (!roundData.round_date) {
      throw new Error('Round date is required');
    }
    if (!roundData.session_type) {
      throw new Error('Session type is required');
    }
    // Una sesión de la Ryder lleva su formato y una franja de stroke play su
    // hoja de salidas (FE #824): una de las dos, nunca las dos (el backend da
    // un 400 si una franja trae formato)
    if (!roundData.match_format && !roundData.tee_sheet) {
      throw new Error('Match format or tee sheet is required');
    }
    if (roundData.match_format && roundData.tee_sheet) {
      throw new Error('A round has either a match format or a tee sheet, not both');
    }
    // La hoja, con las reglas del dominio: no solo las comprueba la pantalla
    if (roundData.tee_sheet) {
      const hoja = roundData.tee_sheet;
      const error = errorDeHoja({
        primera: hoja.first_tee_time,
        ultima: hoja.last_tee_time,
        intervalo: hoja.interval_minutes,
        tamano: hoja.group_size,
      });
      if (error) throw new Error(`Invalid tee sheet: ${error}`);
    }
    return await this.scheduleRepository.createRound(competitionId, roundData);
  }
}

export default CreateRoundUseCase;
