import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getScoringViewUseCase, withdrawMatchPlayerUseCase } from '../../composition';
import { opcionesDeRetirada } from '../../domain/services/retiradaDelFourball';

/**
 * El organizador retira o devuelve a un jugador de un fourball desde el
 * detalle del partido del calendario (25 oct 2026, F10; RyderCupAM#665): por si
 * ni el jugador ni su pareja tienen la app a mano.
 *
 * Lee la vista de anotar, que es la que trae el formato y los retirados (el
 * detalle del calendario no los trae). Qué se ofrece por jugador sale de
 * `opcionesDeRetirada` mirado desde ese jugador: retirarle es lo que él podría
 * hacer consigo mismo, y deshacerlo, volver.
 */
const RetiradaPorElOrganizador = ({ matchId }) => {
  const { t } = useTranslation('scoring');
  const [vista, setVista] = useState(null);
  const [porConfirmar, setPorConfirmar] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [fallo, setFallo] = useState(null);

  // Sube tras retirar o deshacer, para volver a leer la vista
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    getScoringViewUseCase
      .execute(matchId)
      .then((leida) => {
        if (vigente) setVista(leida);
      })
      .catch(() => {
        // Sin la vista no se ofrece nada: el resto del detalle sigue
        if (vigente) setVista(null);
      });
    return () => {
      vigente = false;
    };
  }, [matchId, version]);

  const jugadores = (vista?.players ?? []).map((p) => ({ ...p, puede: opcionesDeRetirada(vista, p.userId) }));
  const conAlgo = jugadores.filter((p) => p.puede.retirarme || p.puede.volver);
  // Con un rechazo, el aviso se queda aunque la vista nueva ya no ofrezca nada
  if (conAlgo.length === 0 && !fallo) return null;

  const accion = async (playerId, deshacer) => {
    setPorConfirmar(null);
    setEnviando(true);
    setFallo(null);
    try {
      await withdrawMatchPlayerUseCase.execute(matchId, playerId, { deshacer });
      setVersion((v) => v + 1);
    } catch (err) {
      const motivo = err?.errorCode === 'WITHDRAWAL_NOT_ALLOWED' ? err?.data?.reason : null;
      setFallo(motivo ? `withdraw.errors.${motivo}` : 'withdraw.failed');
      // El rechazo dice que la vista que había ya no vale (/code-review)
      setVersion((v) => v + 1);
    } finally {
      setEnviando(false);
    }
  };

  const boton = 'min-h-11 px-3 py-2 rounded-lg text-sm font-medium border disabled:opacity-40';

  return (
    <section data-testid="retirada-por-el-organizador" className="rounded-lg border border-gray-200 p-4 space-y-2">
      <h4 className="font-semibold text-gray-800">{t('withdraw.organizerTitle')}</h4>
      {fallo && (
        <p role="alert" className="text-sm text-red-600">
          {t(fallo)}
        </p>
      )}
      {conAlgo.map((p) =>
        porConfirmar === p.userId ? (
          <div key={p.userId} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-700">{t('withdraw.confirmTitle')}</span>
            <button
              type="button"
              disabled={enviando}
              onClick={() => accion(p.userId, false)}
              className={`${boton} bg-red-600 border-red-600 text-white`}
            >
              {t('withdraw.confirmYes')}
            </button>
            <button type="button" onClick={() => setPorConfirmar(null)} className={`${boton} bg-white border-gray-300`}>
              {t('withdraw.cancel')}
            </button>
          </div>
        ) : p.puede.volver ? (
          <button
            key={p.userId}
            type="button"
            disabled={enviando}
            onClick={() => accion(p.userId, true)}
            className={`${boton} w-full bg-white border-gray-300 text-gray-700`}
          >
            {t('withdraw.organizerUndo', { nombre: p.userName })}
          </button>
        ) : (
          <button
            key={p.userId}
            type="button"
            disabled={enviando}
            onClick={() => setPorConfirmar(p.userId)}
            className={`${boton} w-full bg-white border-red-200 text-red-600`}
          >
            {t('withdraw.organizerWithdraw', { nombre: p.userName })}
          </button>
        )
      )}
    </section>
  );
};

export default RetiradaPorElOrganizador;
