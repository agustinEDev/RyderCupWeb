import { useState } from 'react';

import ModalShell from '../ui/ModalShell';

/**
 * Cubrir el puesto de capitán de un equipo (FE #692).
 *
 * Sale cuando un capitán se dio de baja tras el reparto y no había subcapitán
 * que ascendiera: repartir otra vez pide los dos y nombrarlos ya no se puede
 * con equipos (RyderCupAm#320), así que sin esto la competición se atasca.
 *
 * Se elige entre los de ese equipo que siguen inscritos: quien se retiró sigue
 * en la lista del reparto —una baja no la toca— pero ya no capitanea nada.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {'A'|'B'} props.team
 * @param {string} props.teamName
 * @param {{userId: string, name: string}[]} props.players
 * @param {(playerId: string) => void} props.onConfirm
 * @param {() => void} props.onClose
 * @param {boolean} props.isLoading
 * @param {Function} props.t
 */
const FillCaptainModal = ({ isOpen, teamName, players, onConfirm, onClose, isLoading, t }) => {
  const [elegido, setElegido] = useState('');
  const disponibles = players || [];

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      testId="modal-cubrir-capitan"
      labelledBy="cubrir-capitan-titulo"
      closeOnBackdrop={false}
      closeOnEscape={!isLoading}
      busy={isLoading}
    >
      <div className="px-6 pt-6 pb-2">
        <h2 id="cubrir-capitan-titulo" className="text-xl font-semibold text-gray-900">
          {t('teams.fillCaptainTitle', { team: teamName })}
        </h2>
        <p className="mt-1 text-sm text-gray-600">{t('teams.fillCaptainExplanation')}</p>
      </div>

      <div className="px-6 py-4">
        {disponibles.length === 0 ? (
          <p className="text-sm text-red-700">{t('teams.fillCaptainNobody')}</p>
        ) : (
          <select
            value={elegido}
            onChange={(e) => setElegido(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">{t('teams.fillCaptainChoose')}</option>
            {disponibles.map((jugador) => (
              <option key={jugador.userId} value={jugador.userId}>
                {jugador.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 px-6 pb-6 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 sm:w-auto"
        >
          {t('teams.fillCaptainCancel')}
        </button>
        <button
          type="button"
          onClick={() => onConfirm(elegido)}
          disabled={!elegido || isLoading}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 sm:w-auto"
        >
          {t('teams.fillCaptainConfirm')}
        </button>
      </div>
    </ModalShell>
  );
};

export default FillCaptainModal;
