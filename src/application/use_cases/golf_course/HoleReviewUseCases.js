/**
 * Casos de uso del admin para revisar los hoyos (BE #575, 17 oct 2026): una
 * línea de referencia por hoyo, a partir de las muestras de los jugadores.
 *
 * - ListHoleReviewsUseCase: los campos con hoyos por revisar.
 * - GetHoleReviewUseCase: los 18 hoyos de un campo, con su línea guardada, sus
 *   muestras y la tarjeta de cada barra.
 * - SaveHoleLineUseCase / ReopenHoleUseCase: guardar la línea de un hoyo, o
 *   quitarla para que vuelva a recoger.
 * - DeleteHoleSampleUseCase: borrar una muestra mala.
 *
 * @param {Object} dependencies
 * @param {IGolfCourseRepository} dependencies.golfCourseRepository
 */

const exigir = (valor, que) => {
  if (!valor) throw new Error(`${que} is required`);
};

export class ListHoleReviewsUseCase {
  constructor({ golfCourseRepository }) {
    this.golfCourseRepository = golfCourseRepository;
  }

  async execute() {
    return this.golfCourseRepository.listHoleReviews();
  }
}

export class GetHoleReviewUseCase {
  constructor({ golfCourseRepository }) {
    this.golfCourseRepository = golfCourseRepository;
  }

  async execute(golfCourseId) {
    exigir(golfCourseId, 'Golf course ID');
    return this.golfCourseRepository.getHoleReview(golfCourseId);
  }
}

export class SaveHoleLineUseCase {
  constructor({ golfCourseRepository }) {
    this.golfCourseRepository = golfCourseRepository;
  }

  async execute(golfCourseId, holeNumber, linea) {
    exigir(golfCourseId, 'Golf course ID');
    exigir(linea?.tee && linea?.greenCenter, 'A line with tee and green');
    return this.golfCourseRepository.saveHoleLine(golfCourseId, holeNumber, linea);
  }
}

export class ReopenHoleUseCase {
  constructor({ golfCourseRepository }) {
    this.golfCourseRepository = golfCourseRepository;
  }

  async execute(golfCourseId, holeNumber) {
    exigir(golfCourseId, 'Golf course ID');
    return this.golfCourseRepository.reopenHole(golfCourseId, holeNumber);
  }
}

export class DeleteHoleSampleUseCase {
  constructor({ golfCourseRepository }) {
    this.golfCourseRepository = golfCourseRepository;
  }

  async execute(golfCourseId, sampleId) {
    exigir(golfCourseId, 'Golf course ID');
    exigir(sampleId, 'Sample ID');
    return this.golfCourseRepository.deleteHoleSample(golfCourseId, sampleId);
  }
}
