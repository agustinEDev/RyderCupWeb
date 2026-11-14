import { useState, useCallback, useMemo } from 'react';

/**
 * La agenda que leyó su sección en la ficha de una competición: las sesiones y
 * el reparto. La agenda y la sección de campos cargan cada una los suyos; la
 * ficha solo recibe lo leído.
 */
export const useAgendaDeLaFicha = () => {
  // La agenda que leyó su sección: sesiones y reparto. null mientras no se sabe
  const [agendaLeida, setAgendaLeida] = useState(null);
  // Si la última lectura de la agenda falló: con una buena ya leída, se sigue
  // con ella; sin ninguna, el diálogo de apuntarse lo dice (code-review)
  const [agendaFallo, setAgendaFallo] = useState(false);
  const recibirAgenda = useCallback((leida, fallo = false) => {
    if (leida) {
      setAgendaLeida(leida);
      setAgendaFallo(false);
    } else if (fallo) {
      setAgendaFallo(true);
    }
  }, []);
  // Las franjas de la agenda, una vez por lectura: el diálogo las ordena
  const franjasDeLaAgenda = useMemo(
    () => (agendaLeida?.rounds ?? []).filter((r) => r.teeSheet),
    [agendaLeida],
  );
  return { agendaLeida, agendaFallo, recibirAgenda, franjasDeLaAgenda };
};
