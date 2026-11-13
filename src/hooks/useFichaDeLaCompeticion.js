import { useState, useEffect, useCallback, useRef } from 'react';
import customToast from '../utils/toast';
import { seEstaCerrandoLaSesion } from '../utils/cierreDeEstaCarga';
import { getCompetitionDetailUseCase, listEnrollmentsUseCase } from '../composition';
import { useLaMasNueva } from './useLaMasNueva';

/**
 * La ficha de una competición y sus inscripciones, tal como las lee
 * `pages/CompetitionDetail`: la carga con la espera de pantalla completa y los
 * guardas de las relecturas (el id vigente y la lectura más nueva).
 */
export const useFichaDeLaCompeticion = ({ id, userId, t, navigate }) => {
  const [competition, setCompetition] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [isLoadingCompetition, setIsLoadingCompetition] = useState(true);
  // Si la lista de inscripciones no llegó, el modal no puede decir cuántos pierden
  // su plaza: «no hay nadie más» sería afirmar lo que no se ha comprobado
  const [inscripcionesSinCargar, setInscripcionesSinCargar] = useState(false);
  // Para releer los hándicaps sin pisar otra competición (FE #824, PR 5)
  const idActual = useRef(id);
  // Lecturas que pueden cruzarse (el sondeo, los botones de la tarjeta y la
  // ficha tras un cambio de estado): una vieja no pisa a otra más nueva
  const lecturasDeLaFicha = useLaMasNueva();
  const lecturasDeInscripciones = useLaMasNueva();
  useEffect(() => {
    idActual.current = id;
  }, [id]);

  // Por el id y no por el objeto: refrescar la sesión crea un `user` nuevo con el
  // mismo id, y la ficha se recargaba entera tras apuntarse (CodeRabbit, #720)
  const loadCompetition = useCallback(async () => {
    if (!userId) return;

    // Con atrás y adelante entre dos fichas la página no se desmonta: la carga de
    // la anterior puede llegar después. Si ya no es la de la pantalla, ni pinta, ni
    // quita la espera de la nueva, ni manda a la lista (CodeRabbit, FE #1106)
    const deEsta = id;
    const sigueEnPantalla = () => deEsta === idActual.current;
    const turnoDeLaFicha = lecturasDeLaFicha.turno();
    const turnoDeLaLista = lecturasDeInscripciones.turno();

    setIsLoadingCompetition(true);
    try {
      const data = await getCompetitionDetailUseCase.execute(deEsta);
      if (!sigueEnPantalla()) return;
      if (lecturasDeLaFicha.aplicar(turnoDeLaFicha)) setCompetition(data);

      // Load enrollments for all authenticated users (approved players visible to everyone)
      try {
        const enrollmentsData = await listEnrollmentsUseCase.execute(deEsta);
        if (sigueEnPantalla() && lecturasDeInscripciones.aplicar(turnoDeLaLista)) {
          setEnrollments(enrollmentsData);
          setInscripcionesSinCargar(false);
        }
      } catch {
        if (sigueEnPantalla() && lecturasDeInscripciones.aplicar(turnoDeLaLista)) {
          setEnrollments([]);
          setInscripcionesSinCargar(true);
        }
      }
    } catch (error) {
      if (!sigueEnPantalla()) return;
      console.error('Error loading competition:', error);
      // Falló porque se está cerrando la sesión: la redirección al login llega ya; ir a la
      // lista solo enseñaba otro fallo (A2, 8 nov 2026)
      if (seEstaCerrandoLaSesion()) return;
      customToast.error(error.message || t('detail.failedToLoadCompetition'));
      navigate('/competitions');
    } finally {
      if (sigueEnPantalla()) setIsLoadingCompetition(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userId, navigate]);

  useEffect(() => {
    if (userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
      loadCompetition();
    }
  }, [id, userId, loadCompetition]);

  return {
    competition,
    setCompetition,
    enrollments,
    setEnrollments,
    isLoadingCompetition,
    inscripcionesSinCargar,
    loadCompetition,
    idActual,
    lecturasDeLaFicha,
    lecturasDeInscripciones,
  };
};
