import { useMemo, useRef, useState } from 'react';
import { useCargaCancelableEffect } from './useCargaCancelableEffect';
import {
  fetchCountriesUseCase,
  getAdjacentCountriesUseCase,
} from '../composition';
import { sortCountriesByName } from '../services/countries';
import { registraElFallo } from '../utils/registraElFallo';
import { leeVecinos } from '../utils/vecinosDelPais';
import {
  aPaises,
  vecinosDelSegundoNivel,
  alElegirPais,
  alVaciarPais,
  alCambiarAdyacente1,
  alCambiarAdyacente2,
  esElMismoPais,
  alQuitarAdyacente1,
  alQuitarAdyacente2,
} from '../utils/formularioDeLaCompeticion';

/**
 * Los países del formulario de competición: todos (una vez) y los vecinos del
 * principal y del adyacente, con lo que pasa al elegir, cambiar o quitar cada
 * uno. Solo se aplica la última petición de vecinos de cada nivel.
 *
 * @param {{idioma: string, formData: object, setFormData: Function}} opciones
 */
export const usePaisesDeLaCompeticion = ({ idioma, formData, setFormData }) => {
  // Countries data
  const [allCountries, setAllCountries] = useState([]);
  const [adjacentCountries1, setAdjacentCountries1] = useState([]);
  const [adjacentCountries2, setAdjacentCountries2] = useState([]);

  // Los dos desplegables se pintan en el idioma activo, así que se ordenan por
  // él. La segunda lista además se construye concatenando dos, de modo que sin
  // esto no sale ordenada en ningún idioma.
  const sortedAdjacentCountries1 = useMemo(
    () => sortCountriesByName(adjacentCountries1, idioma),
    [adjacentCountries1, idioma],
  );
  const sortedAdjacentCountries2 = useMemo(
    () => sortCountriesByName(adjacentCountries2, idioma),
    [adjacentCountries2, idioma],
  );

  // Todos los países, una vez
  useCargaCancelableEffect(() => fetchCountriesUseCase.execute(), [], {
    alCargar: (data) => setAllCountries(aPaises(data)),
    alFallar: (error) => {
      registraElFallo(
        'CreateCompetition.error-fetching-countries',
        'Error fetching countries:',
        error,
      );
      setAllCountries([]);
    },
  });

  // Cuál es la última petición de vecinos de cada nivel: la que llegue después
  // de otra más nueva (se cambió de país antes de que respondiera) no pisa la
  // lista. También cuentan como más nuevas vaciar la lista y la carga de la
  // edición, que trae las suyas
  const vecinosPedidos = useRef({ 1: 0, 2: 0 });
  const olvidaLosVecinosPedidos = (...niveles) => {
    for (const nivel of niveles) vecinosPedidos.current[nivel] += 1;
  };

  // Los vecinos para los selectores de país adyacente: el nivel 1 son los del
  // principal y el 2, los del tercer país. Solo se aplica la última petición
  // de cada nivel
  const fetchAdjacentCountries = async (countryId, level, context = {}) => {
    olvidaLosVecinosPedidos(level);
    const peticion = vecinosPedidos.current[level];
    const mappedData = await leeVecinos(getAdjacentCountriesUseCase, countryId);
    if (peticion !== vecinosPedidos.current[level]) return;

    if (level === 1) {
      setAdjacentCountries1(mappedData);
    } else if (level === 2) {
      const {
        currentAdjacentCountries1 = [],
        mainCountryCode = null,
        adjacentCountry1Code = null,
      } = context;
      setAdjacentCountries2(
        vecinosDelSegundoNivel(
          currentAdjacentCountries1,
          mappedData,
          mainCountryCode,
          adjacentCountry1Code,
        ),
      );
    }
  };

  const handleCountrySelect = (country) => {
    setFormData((prev) => alElegirPais(prev, country));
    // Los vecinos del tercer país eran del principal anterior: si llegan tarde,
    // tampoco valen
    olvidaLosVecinosPedidos(2);
    setAdjacentCountries1([]);
    setAdjacentCountries2([]);
    fetchAdjacentCountries(country.code, 1);
  };

  // El autocompletado avisa con el código, o '' al vaciarlo
  const alCambiarElPais = (code) => {
    const selectedCountry = allCountries.find((c) => c.code === code);
    if (selectedCountry) {
      handleCountrySelect(selectedCountry);
    } else {
      setFormData(alVaciarPais);
    }
  };

  const handleAddAdjacentCountry1 = () => {
    if (formData.country) {
      setFormData((prev) => ({ ...prev, showAdjacentCountry1: true }));
    }
  };

  const handleAdjacentCountry1Change = (e) => {
    const countryId = e.target.value;
    // El mismo otra vez no cambia nada (como `alCambiarAdyacente1`): ni se
    // vacían ni se vuelven a pedir los vecinos del tercer país
    if (esElMismoPais(formData, 'adjacentCountry1', countryId)) return;
    setFormData((prev) => alCambiarAdyacente1(prev, countryId));
    // Los vecinos del tercer país eran del adyacente anterior: ni se enseñan
    // mientras llegan los del nuevo ni, si llegan tarde, valen
    olvidaLosVecinosPedidos(2);
    setAdjacentCountries2([]);
    if (countryId) {
      fetchAdjacentCountries(countryId, 2, {
        currentAdjacentCountries1: adjacentCountries1,
        mainCountryCode: formData.country?.code,
        adjacentCountry1Code: countryId,
      });
    }
  };

  const handleAddAdjacentCountry2 = () => {
    if (formData.adjacentCountry1) {
      setFormData((prev) => ({
        ...prev,
        showAdjacentCountry2: true,
      }));
    }
  };

  const handleRemoveAdjacentCountry1 = () => {
    setFormData(alQuitarAdyacente1);
    olvidaLosVecinosPedidos(2);
    setAdjacentCountries2([]);
  };

  // El tercer país elegido, o ninguno: los campos del anterior se van
  const handleAdjacentCountry2Change = (e) => {
    const countryId = e.target.value;
    setFormData((prev) => alCambiarAdyacente2(prev, countryId));
  };

  const handleRemoveAdjacentCountry2 = () => {
    setFormData(alQuitarAdyacente2);
  };

  return {
    allCountries,
    adjacentCountries1,
    adjacentCountries2,
    setAdjacentCountries1,
    setAdjacentCountries2,
    olvidaLosVecinosPedidos,
    // Lo que necesitan los selectores de país
    selectores: {
      allCountries,
      adjacentCountries1,
      adjacentCountries2,
      sortedAdjacentCountries1,
      sortedAdjacentCountries2,
      onElegirPais: alCambiarElPais,
      onAnadirAdyacente1: handleAddAdjacentCountry1,
      onCambiarAdyacente1: handleAdjacentCountry1Change,
      onQuitarAdyacente1: handleRemoveAdjacentCountry1,
      onAnadirAdyacente2: handleAddAdjacentCountry2,
      onCambiarAdyacente2: handleAdjacentCountry2Change,
      onQuitarAdyacente2: handleRemoveAdjacentCountry2,
    },
  };
};
