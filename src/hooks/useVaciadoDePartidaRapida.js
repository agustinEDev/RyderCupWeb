import { useEffect, useCallback } from 'react';
import {
  submitQuickMatchHoleScoreUseCase,
  submitQuickMatchProxyHoleScoreUseCase,
} from '../composition';
import { PARO, avisoTrasElVaciado, vaciaAnotaciones } from '../services/vaciaAnotaciones';
import * as offlineQueue from '../utils/scoringOfflineQueue';
import { clasificaLaCola } from '../utils/colaDePartidaRapida';

/**
 * El vaciado de lo guardado en la partida rápida, de `useQuickMatchScoring`.
 * Lo dispara el sondeo al responder, por `vaciarRef`, que este hook rellena
 * en un efecto: quien lo llama decide en qué punto de sus efectos corre.
 */
export const useVaciadoDePartidaRapida = ({
  quickMatchId,
  currentUserId,
  escribiendoRef,
  vaciarRef,
  idVigenteRef,
  fetchQuickMatch,
  pintaElGolpe,
  setDiscrepancias,
  setPerdidos,
  setPendientes,
  setAvisoDelVaciado,
}) => {
  /**
   * Vacía lo guardado. Lo dispara el sondeo al responder: si responde, hay
   * conexión, y no hace falta deducir un estado global de la red.
   */
  const vaciaLoGuardado = useCallback(
    async (partida) => {
      if (!quickMatchId) return;
      // Una vez a la vez: un golpe no puede enviarse por duplicado
      if (escribiendoRef.current) return;
      escribiendoRef.current = true;

      try {
        // Todo sale de la respuesta, no del estado: cuando el primer sondeo
        // dispara el vaciado, `quickMatch` todavia es null y `myParticipant`
        // seria null, asi que un golpe propio se enviaria como proxy
        const anotadosEnElServidor = partida?.holeScores ?? [];
        const miParticipanteId = partida?.participants?.find(
          (p) => p.userId === currentUserId
        )?.participantId;

        // Primero se clasifica la cola ENTERA, y solo despues se envia. Al
        // reves, un envio que se atasca corta el bucle antes de mirar los
        // hoyos que vienen detras, y el aviso de un conflicto que el jugador
        // estaba leyendo se cerraria solo
        const { enConflicto, porEnviar, elDiscoNoBorra } = clasificaLaCola({
          entradas: offlineQueue.getByMatch(quickMatchId, currentUserId),
          anotadosEnElServidor,
          partida,
          miParticipanteId,
          borra: (entrada) =>
            offlineQueue.remove(quickMatchId, entrada.holeNumber, entrada.participantId, entrada.userId ?? null),
        });
        setDiscrepancias(enConflicto);

        // El envío, la decisión y el borrado los hace el bucle único
        // (FE #551). Aquí solo se dice CÓMO se manda una anotación de partida
        // rápida —propia o por delegación— y quién avisa en pantalla. Cuando
        // esto era un bucle propio le faltaba la tercera rama: un error de la
        // propia anotación —una huérfana sin participante, que el caso de uso
        // rechaza antes de enviar— se tomaba por «reintentar luego» y atascaba
        // la cola entera en cada sondeo, para siempre
        const { llegaron, paroPor } = elDiscoNoBorra
          ? { llegaron: 0, paroPor: PARO.NO_SE_PUDO_BORRAR }
          : await vaciaAnotaciones({
              entradas: porEnviar,
              manda: async (entrada) => {
                const golpe = entrada.participantId === miParticipanteId
                  ? await submitQuickMatchHoleScoreUseCase.execute(
                    quickMatchId,
                    entrada.holeNumber,
                    entrada.scoreData.score
                  )
                  : await submitQuickMatchProxyHoleScoreUseCase.execute(
                    quickMatchId,
                    entrada.participantId,
                    entrada.holeNumber,
                    entrada.scoreData.score
                  );
                pintaElGolpe(golpe);
              },
              alDescartar: (entrada) => {
                // Solo si la pantalla sigue en esta partida: el envío tarda, y en
                // ese rato se puede haber cambiado de partida. Los golpes de la
                // vieja hay que seguir mandándolos —son reales—, pero su aviso no
                // se pinta encima de la nueva
                if (quickMatchId !== idVigenteRef.current) return;
                // El aviso en pantalla, para poder decir qué hoyos repetir. Lo
                // pone el bucle antes de tocar el disco: es lo único que se le
                // puede enseñar a alguien cuyo móvil está lleno, que es justo
                // cuando más falta hace
                setPerdidos((antes) =>
                  antes.some(
                    (x) => x.holeNumber === entrada.holeNumber
                      && x.participantId === entrada.participantId
                  )
                    ? antes
                    : [...antes, { holeNumber: entrada.holeNumber, participantId: entrada.participantId }]
                );
              },
              dueñoSiNoLoTiene: currentUserId ?? null,
            });

        // Lo mismo con todo lo que se pinta después del envío: sin esto, el
        // contador y el aviso de la partida anterior aterrizaban en la nueva
        if (quickMatchId !== idVigenteRef.current) return;
        setPendientes(offlineQueue.size(quickMatchId, currentUserId));
        // Si el bucle paró porque el móvil no admite escrituras, se dice: el
        // contador no va a bajar y nadie más va a vaciar esta partida. Lo
        // quita una pasada que termina sin pararse, no una que paró por la
        // red: esa no ha llegado a saber nada del disco
        setAvisoDelVaciado((antes) => avisoTrasElVaciado(antes, paroPor));

        // Algo LLEGÓ al servidor —se haya podido borrar de la cola o no— y la
        // foto que hay en memoria es de ANTES del envío, así que no lo trae:
        // sin volver a pedirla, la casilla vuelve a decir «Anotar» durante un
        // minuto y el jugador anota el mismo hoyo dos veces. Por `llegaron` y
        // no por `enviadas`: con el móvil lleno el golpe está en el servidor y
        // sigue en la cola, y es justo entonces cuando más falta hace la foto
        // nueva. Cada golpe ya se pintó al llegar, pero con su hoyo solo: la
        // clasificación sale de aquí. El cerrojo sigue puesto, de modo que este sondeo no vuelve a
        // vaciar y no hay vuelta sin fin
        if (llegaron > 0) await fetchQuickMatch();
      } finally {
        escribiendoRef.current = false;
      }
    },
    [quickMatchId, currentUserId, fetchQuickMatch, pintaElGolpe, escribiendoRef, idVigenteRef, setDiscrepancias, setPerdidos, setPendientes, setAvisoDelVaciado]
  );

  // La ref se asigna en un efecto, no durante el render. El sondeo la lee
  // despues de su `await`, para entonces este efecto ya ha corrido
  useEffect(() => {
    vaciarRef.current = vaciaLoGuardado;
  }, [vaciaLoGuardado, vaciarRef]);
};
