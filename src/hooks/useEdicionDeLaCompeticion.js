import { useEffect, useEffectEvent, useRef, useState } from 'react';
import {
  getCompetitionDetailUseCase,
  getCompetitionGolfCoursesUseCase,
} from '../composition';
import { nombresPorDefectoDeLosEquipos } from '../pages/nombresPorDefectoDeLosEquipos';
import { leeVecinos } from './usePaisesDeLaCompeticion';
import {
  soloSePuedenEditarLasFechas,
  seEditaLaCompeticion,
} from '../domain/services/edicionDeLaCompeticion';
import { aCamposDeLaCompeticion } from '../utils/camposDeLaCompeticion';
import { diasDelTorneo } from '../utils/ajustesDeStrokePlay';
import { CUPO_POR_DEFECTO } from '../utils/cupoDeJugadores';
import { registraElFallo } from '../utils/registraElFallo';
import customToast from '../utils/toast';
import {
  formularioDeLaEdicion,
  vecinosDelSegundoNivel,
} from '../utils/formularioDeLaCompeticion';

// Los países guardados: el primero es el principal y los demás, los adyacentes
const paisesGuardados = (competition) => {
  // Extract main country code from location
  // The mapper returns location as a string or we need to extract from countries array
  let mainCountryCode = null;
  if (competition.countries && competition.countries.length > 0) {
    // First country in array is the main country
    mainCountryCode = competition.countries[0].code;
  }

  // Prepare adjacent countries (all countries except the first one)
  const adjacentCountriesArray = competition.countries?.slice(1) || [];
  return {
    mainCountryCode,
    adjacentCountry1: adjacentCountriesArray[0]?.code || '',
    adjacentCountry2: adjacentCountriesArray[1]?.code || '',
  };
};

// Fetch adjacent countries lists if needed. Sin país principal la lista del
// primer nivel no se toca, y sin adyacente tampoco la del segundo
const leeLosVecinos = async (mainCountryCode, adjacentCountry1) => {
  const vecinos1 = mainCountryCode ? await leeVecinos(mainCountryCode) : null;
  const vecinos2 = adjacentCountry1
    ? vecinosDelSegundoNivel(
        vecinos1 ?? [],
        await leeVecinos(adjacentCountry1),
        mainCountryCode,
        adjacentCountry1,
      )
    : null;
  return { vecinos1, vecinos2 };
};

// Fetch golf courses for this competition; sin poder leerlos, ninguno
const leeLosCampos = async (competitionId, competition) => {
  try {
    const coursesResult =
      await getCompetitionGolfCoursesUseCase.execute(competitionId);

    // Map the result to the format expected by formData
    if (Array.isArray(coursesResult)) {
      return aCamposDeLaCompeticion(coursesResult).map((campo) => ({
        countryCode: campo.countryCode || competition.main_country,
        course: {
          id: campo.id,
          name: campo.name,
          approvalStatus: campo.approvalStatus,
        },
      }));
    }
  } catch (error) {
    registraElFallo(
      'CreateCompetition.error-loading-golf-courses',
      'Error loading golf courses:',
      error,
    );
  }
  return [];
};

// Todo lo que hace falta para editar una competición, leído de una vez: la
// competición, los vecinos de sus países y sus campos. Una cerrada vuelve sin
// lo demás: no se edita
const leeLaCompeticionParaEditar = async (competitionId) => {
  // Fetch competition details
  const competition = await getCompetitionDetailUseCase.execute(competitionId);

  // Por URL se llegaba al formulario de una cerrada, y solo al guardar
  // fallaba, con el estado sin traducir (FE #710). La misma regla que
  // ofrece «Editar» en la ficha
  // Cerrada por el plazo (no por el organizador), se mueve: solo las fechas
  // (15 nov 2026, RyderCupAm #865)
  const soloFechas = soloSePuedenEditarLasFechas(competition);
  if (!seEditaLaCompeticion(competition)) {
    return { competition, editable: false };
  }

  const paises = paisesGuardados(competition);
  const vecinos = await leeLosVecinos(
    paises.mainCountryCode,
    paises.adjacentCountry1,
  );
  const golfCoursesData = await leeLosCampos(competitionId, competition);

  return {
    competition,
    editable: true,
    soloFechas,
    ...paises,
    ...vecinos,
    golfCoursesData,
  };
};

/**
 * La competición que se edita: se lee al llegar los países y rellena el
 * formulario y los vecinos. Devuelve lo que la página necesita de ella: si
 * se está cargando, si solo se cambian las fechas, cuántos hay inscritos y lo
 * guardado (cupo, ajustes y días) contra lo que se compara al enviar.
 */
export const useEdicionDeLaCompeticion = ({
  competitionId,
  allCountries,
  t,
  idioma,
  navigate,
  setFormData,
  setAdjacentCountries1,
  setAdjacentCountries2,
  olvidaLosVecinosPedidos,
}) => {
  const [loadingCompetition, setLoadingCompetition] = useState(false);
  // Cerrada por el plazo de inscripción: solo se cambian las fechas, y el
  // servidor la reabre si el plazo nuevo queda por delante (RyderCupAm #865)
  const [soloFechas, setSoloFechas] = useState(false);
  // Vaciar el campo en edición no puede recortar el cupo de una competición con
  // gente ya aprobada: se conserva el que se cargó (`/code-review`)
  const cupoCargado = useRef(CUPO_POR_DEFECTO);
  // Al editar un stroke play: los ajustes y los días guardados. De ellos sale qué
  // ha cambiado (el PATCH lleva solo eso) y qué petición va primero (FE #824)
  const ajustesCargados = useRef(null);
  const diasCargados = useRef(null);
  // Cuántos hay ya dentro, al editar: el cupo no puede bajar de ahí (FE #662).
  // Con la competición de la que son: crear y editar montan este componente en
  // el mismo sitio, y al ir de editar una a crear otra se arrastraba el mínimo
  const [inscritosDe, setInscritosDe] = useState({ de: null, cuantos: 0 });
  const inscritos =
    competitionId && inscritosDe.de === competitionId ? inscritosDe.cuantos : 0;

  /**
   * Load competition data when in edit mode
   *
   * Lo que llega se aplica con los `t`, idioma y países del momento en que
   * llega (eventos del efecto): cambiar de idioma no la vuelve a pedir.
   *
   * No usa `useCargaCancelableEffect`: su espera sale ya puesta en el mismo
   * pintado en que llegan los países, y aquí sale con el efecto, un pintado
   * después, como siempre
   */
  const aplicaLaEdicion = useEffectEvent((datos) => {
    const { competition } = datos;
    if (!datos.editable) {
      customToast.error(t('edit.notEditable'));
      navigate(`/competitions/${competitionId}`, { replace: true });
      return;
    }

    const formDataToSet = formularioDeLaEdicion(datos, {
      equipos: nombresPorDefectoDeLosEquipos(t),
      idioma,
      allCountries,
    });

    // Los vecinos de esta competición: lo que se pidiera antes ya no vale
    if (datos.vecinos1) {
      olvidaLosVecinosPedidos(1);
      setAdjacentCountries1(datos.vecinos1);
    }
    if (datos.vecinos2) {
      olvidaLosVecinosPedidos(2);
      setAdjacentCountries2(datos.vecinos2);
    }
    setSoloFechas(datos.soloFechas === true);
    // Lo que había guardado: vaciar el campo no puede recortarlo
    cupoCargado.current = formDataToSet.numberOfPlayers;
    ajustesCargados.current = competition.strokePlay ?? null;
    diasCargados.current = diasDelTorneo(
      competition.startDate,
      competition.endDate,
    );
    setInscritosDe({
      de: competitionId,
      cuantos: competition.enrolledCount || 0,
    });
    setFormData(formDataToSet);
  });
  const avisaDelFalloAlEditar = useEffectEvent((error) => {
    console.error('Error loading competition:', error);
    customToast.error(t('edit.errorLoading'));
    navigate('/competitions');
  });
  useEffect(() => {
    // Pasando de editar una a editar otra el formulario no se desmonta: lo que
    // llegue tarde de la anterior no redirige, ni avisa, ni pisa el formulario
    // ni los vecinos (CodeRabbit en la #722)
    let vigente = true;
    const loadCompetitionData = async () => {
      if (!competitionId || !allCountries.length) return;

      setLoadingCompetition(true);
      try {
        const datos = await leeLaCompeticionParaEditar(competitionId);
        if (vigente) aplicaLaEdicion(datos);
      } catch (error) {
        if (vigente) avisaDelFalloAlEditar(error);
      } finally {
        if (vigente) setLoadingCompetition(false);
      }
    };

    loadCompetitionData();
    return () => {
      vigente = false;
    };
  }, [competitionId, allCountries]);

  return {
    loadingCompetition,
    soloFechas,
    inscritos,
    cupoCargado,
    ajustesCargados,
    diasCargados,
  };
};
