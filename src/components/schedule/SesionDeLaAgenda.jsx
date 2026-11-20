import { Link } from 'react-router';
import { Mail, RotateCcw } from 'lucide-react';
import RoundCard from './RoundCard';

/**
 * Una sesión de la agenda (`SchedulePage`): los botones de su sobre, si tocan,
 * y su tarjeta. Qué botones salen lo decide `botonesDeLosSobres`; el resto de
 * props van tal cual a `RoundCard`. Sin estado ni efectos.
 */
const SesionDeLaAgenda = ({
  round,
  competitionId,
  botones,
  onRehacerSobres,
  tComp,
  ...propsDeLaTarjeta
}) => (
  <div className="space-y-2">
    {/* El sobre del capitán para ESTA sesión (FE #655). Aquí y no en la
        ficha porque el sobre es de una sesión, no de la competición; esta
        pantalla la ven también los capitanes que no organizan, por la ruta
        pública */}
    {botones.abrirSobre && (
      <Link
        to={`/competitions/${competitionId}/rounds/${round.id}/envelope`}
        data-testid={`ir-al-sobre-${round.id}`}
        className="flex items-center justify-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-700"
      >
        <Mail className="h-4 w-4" />
        {tComp('envelope.open')}
      </Link>
    )}
    {/* Rehacer el proceso entero es cosa del organizador */}
    {botones.rehacerSobres && (
      <button
        type="button"
        data-testid={`rehacer-sobres-${round.id}`}
        onClick={() => onRehacerSobres(round.id)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
      >
        <RotateCcw className="h-4 w-4" />
        {tComp('envelope.reset')}
      </button>
    )}
    <RoundCard round={round} {...propsDeLaTarjeta} />
  </div>
);

export default SesionDeLaAgenda;
