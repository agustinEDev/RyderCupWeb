import { useCallback } from 'react';
import {
  cancelQuickMatchUseCase,
  completeQuickMatchUseCase,
} from '../composition';
import { conElEstadoDe } from '../utils/colaDePartidaRapida';

// Terminar y cancelar hacen lo mismo con distinto caso de uso. Las dos piden
// creador, y el `useCallback` devuelve tal cual la promesa de aquí: ni una
// espera de más entre el cierre y quien lo pidió.
//
// Del DTO que devuelve la accion se toma SOLO el estado: es el DTO base
// —sin `holeScores`, `standing` ni `participantStrokes`—, y aplicarlo
// entero borraba la tarjeta y recalculaba el neto con cero golpes, es
// decir numeros equivocados, no huecos. Se aplica igualmente y no se
// espera al refetch porque si este falla —se cae la red justo despues
// del POST— la pantalla seguiria creyendo la partida viva, editable y
// anotando contra 409 en bucle.
const cierraCon = async (
  casoDeUso,
  {
    quickMatchId,
    isCreator,
    idVigenteRef,
    marcaEscritura,
    fetchQuickMatch,
    setQuickMatch,
    setSaveError,
    setIsSubmitting,
  },
) => {
  if (!quickMatchId || !isCreator) return { ok: false };

  setIsSubmitting(true);
  try {
    const actualizada = await casoDeUso.execute(quickMatchId);
    // Si mientras tanto la pantalla pasó a otra partida —la ruta no lleva
    // `key`—, lo cerrado es la anterior y aquí no queda nada que tocar: marcar
    // haría vieja la carga en camino de la nueva, que se quedaba esperando, y
    // con su vista todavía a `null` se pintaba encima la partida anterior
    if (quickMatchId !== idVigenteRef.current) return { ok: true };
    // Invalida cualquier sondeo en vuelo: su foto es anterior al cierre
    marcaEscritura();
    if (actualizada) {
      setQuickMatch((previa) => conElEstadoDe(previa, actualizada));
    }
    setSaveError(null);
    await fetchQuickMatch();
    return { ok: true };
  } catch (err) {
    // El error NO va a `saveError`: ese banner lo traduce el mapa de errores
    // de anotar —«no se ha podido guardar el resultado»— y se queda pegado
    // hasta el siguiente guardado bueno. Se devuelve para que el dialogo
    // distinga un 409 —ya estaba cerrada— de quedarse sin cobertura.
    return { ok: false, error: err };
  } finally {
    setIsSubmitting(false);
  }
};

/**
 * Terminar y cancelar la partida rápida, de `useQuickMatchScoring`. Sin
 * efectos ni estado propio.
 */
export const useCierreDePartidaRapida = ({
  quickMatchId,
  isCreator,
  idVigenteRef,
  marcaEscritura,
  fetchQuickMatch,
  setQuickMatch,
  setSaveError,
  setIsSubmitting,
}) => {
  // Espejo de `completeMatch`: el backend exige creador para las dos
  // (`NotQuickMatchCreatorError`), asi que el boton vive donde el de terminar.
  const cancelMatch = useCallback(
    () =>
      cierraCon(cancelQuickMatchUseCase, {
        quickMatchId,
        isCreator,
        idVigenteRef,
        marcaEscritura,
        fetchQuickMatch,
        setQuickMatch,
        setSaveError,
        setIsSubmitting,
      }),
    [
      quickMatchId,
      isCreator,
      fetchQuickMatch,
      marcaEscritura,
      idVigenteRef,
      setQuickMatch,
      setSaveError,
      setIsSubmitting,
    ],
  );

  const completeMatch = useCallback(
    () =>
      cierraCon(completeQuickMatchUseCase, {
        quickMatchId,
        isCreator,
        idVigenteRef,
        marcaEscritura,
        fetchQuickMatch,
        setQuickMatch,
        setSaveError,
        setIsSubmitting,
      }),
    [
      quickMatchId,
      isCreator,
      fetchQuickMatch,
      marcaEscritura,
      idVigenteRef,
      setQuickMatch,
      setSaveError,
      setIsSubmitting,
    ],
  );

  return { cancelMatch, completeMatch };
};
