import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ModalShell from '../ui/ModalShell';

/**
 * La retirada de un jugador de un fourball de torneo (25 oct 2026, F2 y F3;
 * regla en RyderCupAM#665). Qué botones salen lo decide `opcionesDeRetirada`.
 *
 * Retirar pide confirmación: cambia lo que cuenta y quién marca a quién.
 * Deshacer no: devuelve al jugador y lo cerrado sin él se queda como está.
 *
 * @param {object} props.opciones - De `opcionesDeRetirada`
 * @param {string} props.yo - El id de quien mira
 * @param {(playerId: string, opciones: {deshacer: boolean}) => void} props.onRetirar
 * @param {boolean} props.enviando
 */
const RetiradaDelFourball = ({ opciones, yo, onRetirar, enviando }) => {
  const { t } = useTranslation('scoring');
  // A quién se va a retirar mientras se confirma
  const [porConfirmar, setPorConfirmar] = useState(null);
  const { pareja, retirarme, retirarPareja, volver, deshacerPareja } = opciones;
  if (!retirarme && !retirarPareja && !volver && !deshacerPareja) return null;

  const boton =
    'w-full min-h-11 px-4 py-2 rounded-lg text-sm font-medium border disabled:opacity-40';

  return (
    <div data-testid="retirada-del-fourball" className="space-y-2">
      {volver && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm space-y-3">
          <p className="font-medium text-amber-900">{t('withdraw.youAreWithdrawn')}</p>
          <button
            type="button"
            disabled={enviando}
            onClick={() => onRetirar(yo, { deshacer: true })}
            className={`${boton} bg-white border-amber-300 text-amber-900 hover:bg-amber-100`}
          >
            {t('withdraw.comeBack')}
          </button>
        </div>
      )}
      {deshacerPareja && pareja && (
        <button
          type="button"
          disabled={enviando}
          onClick={() => onRetirar(pareja.userId, { deshacer: true })}
          className={`${boton} bg-white border-gray-300 text-gray-700 hover:bg-gray-50`}
        >
          {t('withdraw.undoPartner', { nombre: pareja.userName })}
        </button>
      )}
      {retirarPareja && pareja && (
        <button
          type="button"
          disabled={enviando}
          onClick={() => setPorConfirmar(pareja.userId)}
          className={`${boton} bg-white border-red-200 text-red-600 hover:bg-red-50`}
        >
          {t('withdraw.withdrawPartner', { nombre: pareja.userName })}
        </button>
      )}
      {retirarme && (
        <button
          type="button"
          disabled={enviando}
          onClick={() => setPorConfirmar(yo)}
          className={`${boton} bg-white border-red-200 text-red-600 hover:bg-red-50`}
        >
          {t('withdraw.withdrawMe')}
        </button>
      )}

      <ModalShell
        isOpen={porConfirmar !== null}
        onClose={() => setPorConfirmar(null)}
        testId="retirada-confirmacion"
        labelledBy="retirada-titulo"
        describedBy="retirada-mensaje"
      >
        <h2 id="retirada-titulo" className="text-lg font-semibold text-gray-900 mb-2">
          {t('withdraw.confirmTitle')}
        </h2>
        <p id="retirada-mensaje" className="text-sm text-gray-600 mb-4">
          {t('withdraw.confirmMessage')}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => setPorConfirmar(null)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            {t('withdraw.cancel')}
          </button>
          <button
            type="button"
            disabled={enviando}
            onClick={() => {
              const quien = porConfirmar;
              setPorConfirmar(null);
              onRetirar(quien, { deshacer: false });
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
          >
            {t('withdraw.confirmYes')}
          </button>
        </div>
      </ModalShell>
    </div>
  );
};

export default RetiradaDelFourball;
