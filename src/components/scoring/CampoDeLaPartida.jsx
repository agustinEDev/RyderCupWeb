import { MapPin } from 'lucide-react';

/**
 * El campo donde se juega, bajo el título de la anotación (16 oct). Igual en
 * las tres (Ryder, stroke play y partida rápida); sin nombre, nada.
 */
const CampoDeLaPartida = ({ nombre }) =>
  nombre ? (
    <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-gray-500" data-testid="campo-de-la-partida">
      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{nombre}</span>
    </p>
  ) : null;

export default CampoDeLaPartida;
