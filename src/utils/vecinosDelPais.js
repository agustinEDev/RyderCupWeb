import { aPaises } from './formularioDeLaCompeticion';
import { registraElFallo } from './registraElFallo';

/**
 * Los vecinos de un país, como los usan los selectores; sin poder leerlos,
 * ninguno. El caso de uso llega de quien llama: `utils` no alcanza la
 * composición.
 *
 * @param {{execute: (countryId: string) => Promise<Array>}} casoDeUso
 * @param {string} countryId
 * @returns {Promise<Array>}
 */
export const leeVecinos = async (casoDeUso, countryId) => {
  try {
    return aPaises(await casoDeUso.execute(countryId));
  } catch (error) {
    registraElFallo(
      'CreateCompetition.error-fetching-adjacent-countries',
      'Error fetching adjacent countries:',
      error,
    );
    return [];
  }
};
