import { formatCountryName } from '../services/countries';

/**
 * Los países de una competición, en el idioma de la aplicación.
 *
 * No se usa `competition.location`, que es el texto que arma el backend
 * uniendo `name_en`: en una aplicación en español la tarjeta decía «Spain,
 * France» mientras la bandera de dos líneas más abajo decía «España, Francia»
 * —dos textos del mismo dato en idiomas distintos, en la misma tarjeta
 * (FE #513)—.
 *
 * Se cae a ese texto cuando no vienen los países: en inglés, pero mejor eso que
 * dejar el hueco vacío.
 */
export const ubicacionDe = (competition, idioma) => {
  const nombres = (competition?.countries ?? [])
    .map((country) => formatCountryName(country, idioma))
    .filter(Boolean);

  return nombres.length ? nombres.join(', ') : competition?.location || '';
};

export default ubicacionDe;
