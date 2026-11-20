import { CompetitionStatusEnum } from '../domain/value_objects/CompetitionStatus';

/**
 * Cómo se llama cada estado en el filtro de Competiciones (claves de
 * `competitions`). Se ofrecen en el orden del dominio; un test exige una
 * etiqueta, que exista, para cada estado.
 */
export const ETIQUETA_DEL_FILTRO = Object.freeze({
  [CompetitionStatusEnum.DRAFT]: 'myCompetitions.draft',
  [CompetitionStatusEnum.ACTIVE]: 'myCompetitions.active',
  [CompetitionStatusEnum.CLOSED]: 'myCompetitions.closed',
  [CompetitionStatusEnum.IN_PROGRESS]: 'myCompetitions.inProgress',
  [CompetitionStatusEnum.COMPLETED]: 'myCompetitions.completed',
  [CompetitionStatusEnum.CANCELLED]: 'myCompetitions.cancelled',
});
