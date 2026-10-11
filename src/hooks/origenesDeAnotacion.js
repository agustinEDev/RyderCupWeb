import * as composicion from '../composition';
import * as cola from '../utils/scoringOfflineQueue';

/**
 * De dónde lee y adónde manda `useScoring` (FE #824, PR 7). La maquinaria de
 * anotar —cola antes de enviar, sondeo, vaciado, golpes no guardados— es la
 * misma para un partido de la Ryder y para una partida de stroke play; cambian
 * los casos de uso y el tipo con que se guarda en la cola, para que el vaciado
 * de fondo sepa adónde mandarlo.
 *
 * Constantes de módulo: `useScoring` las usa en sus dependencias, y un objeto
 * nuevo en cada pintada rearmaría el sondeo. Cada pieza se lee al usarla, no
 * al cargar el módulo: así quien solo anota la Ryder no necesita las de
 * stroke play (ni sus mocks en los tests).
 */
export const ORIGEN_RYDER = Object.freeze({
  get leeLaVista() { return composicion.getScoringViewUseCase; },
  get anota() { return composicion.submitHoleScoreUseCase; },
  get entrega() { return composicion.submitScorecardUseCase; },
  get concede() { return composicion.concedeMatchUseCase; },
  tipo: null,
});

export const ORIGEN_PARTIDA_DE_FRANJA = Object.freeze({
  get leeLaVista() { return composicion.getTeeGroupScoringViewUseCase; },
  get anota() { return composicion.submitTeeGroupHoleScoreUseCase; },
  get entrega() { return composicion.submitTeeGroupScorecardUseCase; },
  // En stroke play no se concede
  concede: null,
  get tipo() { return cola.TIPO_PARTIDA_DE_FRANJA; },
});
