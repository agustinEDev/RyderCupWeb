import { useState, useCallback, useMemo, useRef } from 'react';
import * as golpesPerdidos from '../utils/golpesPerdidos';
import { SIN_HOYOS, turnosDeLosNoGuardados } from '../utils/vistaDeLaAnotacion';

/**
 * Los hoyos de la anotación de competición que no se pudieron guardar, de
 * `useScoring` (FE #622), y el turno en que cada golpe quedó a salvo.
 */
export const useNoGuardados = (matchId) => {
  // Los hoyos que no se pudieron guardar (FE #622): por partido, y en cada hoyo
  // el turno del último fallo y qué golpes se perdieron, cada uno con el turno
  // en que se perdió. Vivía en el mismo estado que los fallos de carga, y cada
  // vista buena lo retiraba: con cobertura, el jugador muchas veces no llegaba a
  // verlo. Un golpe se retira SOLO cuando el jugador lo vuelve a anotar y queda
  // a salvo. Por partido, porque la ruta no lleva `key`: el hook se reutiliza al
  // ir de uno a otro, y al volver los golpes perdidos siguen perdidos
  const [noGuardados, setNoGuardados] = useState(SIN_HOYOS);
  // Lo mismo que `noGuardados`, leído sin esperar al render: se consulta al
  // terminar un envío
  const noGuardadosRef = useRef(SIN_HOYOS);
  // Y el último turno en que cada golpe quedó a salvo, por partido y hoyo: un
  // envío ANTERIOR que falla tarde no puede dar por perdido un golpe que una
  // anotación posterior ya guardó
  const aSalvoRef = useRef({});

  // Lo que hace falta para seguir UNA anotación: se pide al empezar el envío,
  // con su partido, su hoyo, su turno y los golpes que tocó el jugador
  const seguimientoDe = useCallback(
    ({
      matchId: partido,
      holeNumber,
      currentUserId,
      estaAnotacion,
      golpesTocados,
    }) => {
      // Siempre en el partido de ESTE envío, aunque termine con el jugador ya en
      // otro: la lista va por partido, así que lo apuntado o retirado se queda en
      // el suyo y la pantalla del otro no lo ve. Al volver, sigue siendo verdad
      const hoyosNoGuardados = () =>
        noGuardadosRef.current[partido] ?? SIN_HOYOS;
      const ponNoGuardados = (hoyos) => {
        noGuardadosRef.current = {
          ...noGuardadosRef.current,
          [partido]: hoyos,
        };
        setNoGuardados(noGuardadosRef.current);
      };
      const aSalvoDesde = (golpe) =>
        aSalvoRef.current[partido]?.[holeNumber]?.[golpe] ?? 0;
      // Los golpes tocados se dan por perdidos, salvo los que una anotación
      // posterior ya dejó a salvo
      const avisaQueNoSeGuardo = () => {
        const perdidos = golpesTocados.filter(
          (g) => aSalvoDesde(g) < estaAnotacion,
        );
        if (perdidos.length === 0) return;
        const golpes = { ...hoyosNoGuardados()[holeNumber]?.golpes };
        for (const g of perdidos)
          golpes[g] = Math.max(golpes[g] ?? 0, estaAnotacion);
        ponNoGuardados({
          ...hoyosNoGuardados(),
          [holeNumber]: { turno: estaAnotacion, golpes },
        });
      };
      const hayUnFalloPosterior = () =>
        Object.values(hoyosNoGuardados()[holeNumber]?.golpes ?? {}).some(
          (turno) => turno > estaAnotacion,
        );

      // El aviso de «no se pudo guardar» de este hoyo se retira, pero SOLO
      // cuando el reemplazo está a salvo: enviado, o guardado en la cola. Se
      // hacía aquí arriba y era un error — si el reemplazo lo rechazan también,
      // o el móvil no tiene sitio para encolarlo, el jugador se quedaba sin
      // golpe Y sin aviso, que es justo lo que esta issue existe para impedir.
      // Y de los golpes no guardados, solo los que el jugador volvió a anotar en
      // ESTA anotación, y si se perdieron antes: una corrección posterior que no
      // se guardó sigue sin estar en ningún sitio (FE #622)
      const yaNoSePierde = () => {
        // Del aviso de rechazados, solo los golpes que se han vuelto a anotar (FE #813)
        golpesPerdidos.olvidaEl(
          partido,
          holeNumber,
          currentUserId,
          undefined,
          golpesTocados,
        );
        const delHoyo = { ...aSalvoRef.current[partido]?.[holeNumber] };
        for (const g of golpesTocados)
          delHoyo[g] = Math.max(delHoyo[g] ?? 0, estaAnotacion);
        aSalvoRef.current = {
          ...aSalvoRef.current,
          [partido]: { ...aSalvoRef.current[partido], [holeNumber]: delHoyo },
        };
        const pendiente = hoyosNoGuardados()[holeNumber];
        if (!pendiente) return;
        const quedan = Object.entries(pendiente.golpes).filter(
          ([g, turno]) => !(golpesTocados.includes(g) && turno < estaAnotacion),
        );
        if (quedan.length === Object.keys(pendiente.golpes).length) return;
        const resto = { ...hoyosNoGuardados() };
        if (quedan.length > 0)
          resto[holeNumber] = {
            ...pendiente,
            golpes: Object.fromEntries(quedan),
          };
        else delete resto[holeNumber];
        ponNoGuardados(resto);
      };

      return { avisaQueNoSeGuardo, hayUnFalloPosterior, yaNoSePierde };
    },
    [],
  );

  // Hacia fuera, los de este partido (FE #622)
  const turnosNoGuardados = useMemo(
    () => turnosDeLosNoGuardados(noGuardados[matchId]),
    [noGuardados, matchId],
  );

  return { noGuardados: turnosNoGuardados, seguimientoDe };
};
