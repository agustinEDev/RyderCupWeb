import { useEffect, useCallback, useRef } from 'react';
import { getCompetitionDetailUseCase, listEnrollmentsUseCase } from '../composition';

/**
 * Lo de los hándicaps y las inscripciones en la ficha de una competición, sin
 * la espera de pantalla completa: la tarjeta lo pide al lanzar o programar, y
 * cada 15 s mientras hay una en marcha (FE #824, PR 5).
 *
 * Las inscripciones (hándicap fijado y categoría) solo cambian al acabar una
 * actualización: releerlas cada 15 s mientras dura eran peticiones de más
 * (revisor). Y una respuesta de otra competición (se cambió de ruta) no pisa,
 * ni una vieja a otra más nueva si se cruzan (el sondeo y un botón; CodeRabbit)
 */
export const useReleerHandicaps = ({
  id,
  competition,
  setCompetition,
  setEnrollments,
  idActual,
  lecturasDeLaFicha,
  lecturasDeInscripciones,
}) => {
  // Para saber cuándo acaba una actualización (FE #824, PR 5)
  const estadoDeLaActualizacion = useRef(null);

  const releerHandicaps = useCallback(() => {
    const deEsta = id;
    const turno = lecturasDeLaFicha.turno();
    getCompetitionDetailUseCase
      .execute(deEsta)
      .then((data) => {
        if (deEsta !== idActual.current || !lecturasDeLaFicha.aplicar(turno)) return;
        const estaba = estadoDeLaActualizacion.current;
        estadoDeLaActualizacion.current = data.handicapUpdate?.status ?? null;
        setCompetition((prev) => ({
          ...prev,
          handicapUpdate: data.handicapUpdate,
          handicapUpdateWindow: data.handicapUpdateWindow,
        }));
        if (estadoDeLaActualizacion.current !== 'IN_PROGRESS' || estaba !== 'IN_PROGRESS') {
          const deLaLista = lecturasDeInscripciones.turno();
          return listEnrollmentsUseCase
            .execute(deEsta)
            .then(
              (lista) =>
                deEsta === idActual.current && lecturasDeInscripciones.aplicar(deLaLista) && setEnrollments(lista)
            );
        }
        return undefined;
      })
      .catch((e) => console.error('Error reloading handicap updates:', e));
  }, [id, lecturasDeLaFicha, lecturasDeInscripciones, idActual, setCompetition, setEnrollments]);

  // Lo último que se sabe de la actualización, para notar cuándo acaba
  const estadoCargado = competition?.handicapUpdate?.status ?? null;
  useEffect(() => {
    estadoDeLaActualizacion.current = estadoCargado;
  }, [estadoCargado]);

  return releerHandicaps;
};
