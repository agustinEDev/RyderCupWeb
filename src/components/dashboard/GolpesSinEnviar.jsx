import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ChevronRight, CloudOff } from 'lucide-react';

import { COLA_VACIADA } from '../../services/vaciadoDeLaCola';
import * as golpesPerdidos from '../../utils/golpesPerdidos';
import { resumenPorPartida } from '../../utils/scoringOfflineQueue';

/**
 * Lo que quedó sin enviar, y lo que ya no se pudo guardar (FE #521).
 *
 * Vive en el panel porque tiene que verse SIN estar en la partida a la que
 * pertenecen esos golpes: quien los dejó ahí es precisamente quien no va a
 * volver a abrirla. Y no se enseña nada cuando no hay nada, que es lo normal.
 *
 * Quien lo monta le pasa `key={userId}`: si se cambia de cuenta sin recargar,
 * el componente se rehace y vuelve a leer lo que corresponde a la nueva. Un
 * efecto que lo releyera haría lo mismo a costa de un render de más.
 */
const GolpesSinEnviar = ({ userId = null }) => {
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');

  // Con inicializador perezoso y no dentro de un efecto: leer el
  // almacenamiento al montar es dar el estado inicial, no sincronizar nada
  const [pendientes, setPendientes] = useState(() => resumenPorPartida(userId));
  const [perdidos, setPerdidos] = useState(() => golpesPerdidos.pendientes(userId));

  const relee = useCallback(() => {
    setPendientes(resumenPorPartida(userId));
    setPerdidos(golpesPerdidos.pendientes(userId));
  }, [userId]);

  useEffect(() => {
    // El vaciado corre por su cuenta, así que este aviso se entera por él y no
    // adivinando: sin esto se quedaría contando golpes que ya han llegado
    window.addEventListener(COLA_VACIADA, relee);
    return () => window.removeEventListener(COLA_VACIADA, relee);
  }, [relee]);

  if (pendientes.length === 0 && perdidos.length === 0) return null;

  const abre = (partida) => {
    navigate(
      partida.esPartidaRapida
        ? `/quick-matches/${partida.matchId}/scoring`
        : `/player/matches/${partida.matchId}/scoring`
    );
  };

  // Los perdidos, agrupados por la partida a la que pertenecen: con avisos de
  // dos partidas, una lista mezclada y dos botones iguales no dejan saber cuál
  // quita qué
  const perdidosPorPartida = [
    ...perdidos.reduce((mapa, aviso) => {
      mapa.set(aviso.matchId, [...(mapa.get(aviso.matchId) ?? []), aviso]);
      return mapa;
    }, new Map()),
  ];

  const nombreDe = (algo) => algo.matchName || t('golpesSinEnviar.partidaSinNombre');

  return (
    /* `px-4` como el resto de bloques del panel: sin él estas tarjetas van de
       borde a borde y desalinean la columna entera */
    <div className="mb-4 space-y-2 px-4" data-testid="golpes-sin-enviar">
      {pendientes.map((partida) => (
        <button
          key={partida.matchId}
          type="button"
          onClick={() => abre(partida)}
          className="flex w-full items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left active:bg-amber-100"
        >
          <CloudOff className="h-5 w-5 flex-shrink-0 text-amber-600" aria-hidden="true" />
          {/* `min-w-0` para que un nombre largo se recorte en vez de empujar la
              flecha fuera de la tarjeta */}
          <span className="min-w-0 flex-1 text-sm text-amber-900">
            {t('golpesSinEnviar.aviso', { count: partida.cuantas, partida: nombreDe(partida) })}
          </span>
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-amber-600" aria-hidden="true" />
        </button>
      ))}

      {perdidosPorPartida.map(([matchId, delGrupo]) => (
        <div key={matchId} className="rounded-lg border border-red-200 bg-red-50 p-3" role="alert">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-red-900">
                {t('golpesSinEnviar.perdidos', {
                  count: delGrupo.length,
                  partida: nombreDe(delGrupo[0]),
                })}
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-red-800">
                {delGrupo.map((aviso) => (
                  <li key={`${aviso.matchId}-${aviso.holeNumber}`}>
                    {t('golpesSinEnviar.perdido', { hoyo: aviso.holeNumber })}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  golpesPerdidos.olvidaLosDe(matchId, userId);
                  relee();
                }}
                aria-label={t('golpesSinEnviar.descartarDe', { partida: nombreDe(delGrupo[0]) })}
                className="mt-2 text-xs font-medium text-red-700 underline active:text-red-900"
              >
                {t('golpesSinEnviar.entendido')}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GolpesSinEnviar;
