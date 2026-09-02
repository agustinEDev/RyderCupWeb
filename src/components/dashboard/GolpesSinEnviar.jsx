import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ChevronRight, CloudOff } from 'lucide-react';

import { COLA_VACIADA } from '../../services/vaciadoDeLaCola';
import * as golpesPerdidos from '../../utils/golpesPerdidos';
import * as offlineQueue from '../../utils/scoringOfflineQueue';
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
  // QUÉ partidas no se pudieron descartar, no si alguna ni cuál la última: el
  // aviso va en su tarjeta, y con un solo identificador el descarte que salía
  // bien en otra partida borraba el aviso de la que había fallado
  const [noSePudoDescartar, setNoSePudoDescartar] = useState(() => new Set());

  const apunta = (matchId, fallo) =>
    setNoSePudoDescartar((antes) => {
      if (antes.has(matchId) === fallo) return antes;
      const ahora = new Set(antes);
      if (fallo) ahora.add(matchId);
      else ahora.delete(matchId);
      return ahora;
    });

  // Los perdidos, agrupados por la partida a la que pertenecen: con avisos de
  // dos partidas, una lista mezclada y dos botones iguales no dejan saber cuál
  // quita qué
  /**
   * Relee dejando el foco donde se pueda: si el aviso que se acaba de quitar
   * era el último, el componente entero deja de existir y el foco caería a
   * `<body>`, con lo que quien navega con teclado o lector se queda en la nada.
   *
   * @param {boolean} quedaAlgoQueVer - Decidido ANTES de repintar
   */
  const releeYDevuelveElFoco = (quedaAlgoQueVer) => {
    const destino = quedaAlgoQueVer
      ? contenedorRef.current
      : contenedorRef.current?.parentElement;
    relee();
    if (!destino) return;
    // El padre no es enfocable por sí mismo; se le da un destino de foco sin
    // meterlo en el orden de tabulación
    if (!destino.hasAttribute('tabindex')) destino.tabIndex = -1;
    destino.focus();
  };

  /**
   * Tirar lo guardado de una partida que ya no existe. Solo por decisión
   * expresa: el aviso dice que se pierden, y esto es lo que lo cumple.
   */
  const descarta = (partida) => {
    // Si el almacenamiento no admite la escritura, el aviso sigue ahí: callarlo
    // deja un botón que no hace nada y no dice por qué. Por partida y no un
    // aviso para todas: con dos tarjetas, el fallo de una salía debajo de las
    // dos, incluida la que nadie tocó
    if (!offlineQueue.olvidaLasDe(partida.matchId, userId)) {
      apunta(partida.matchId, true);
      return;
    }
    apunta(partida.matchId, false);
    releeYDevuelveElFoco(pendientes.length > 1 || perdidos.length > 0);
  };

  const hoyosDe = (avisos) =>
    [...new Set(avisos.map((a) => a.holeNumber))].sort((a, b) => a - b);

  const perdidosPorPartida = useMemo(() => {
    const mapa = new Map();
    for (const aviso of perdidos) {
      const delGrupo = mapa.get(aviso.matchId);
      if (delGrupo) delGrupo.push(aviso);
      else mapa.set(aviso.matchId, [aviso]);
    }
    return [...mapa];
  }, [perdidos]);

  // Dónde devolver el foco al quitar un aviso: sin esto, desmontar el bloque
  // que contiene el botón pulsado deja el foco en `<body>` y quien navega con
  // teclado o lector de pantalla se queda en la nada, con avisos todavía en
  // pantalla
  const contenedorRef = useRef(null);

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


  /**
   * Cómo se nombra una partida en el aviso. Tres formas y no una, porque en
   * una jornada se juegan VARIOS partidos en el mismo campo: solo con el campo
   * salían dos avisos idénticos y no se sabía cuál mirar. Lo redacta la
   * traducción con los datos crudos, no el almacenamiento
   */
  const nombreDe = (algo) => {
    if (algo.matchNumber != null && algo.matchName) {
      return t('golpesSinEnviar.partidaConNumero', {
        numero: algo.matchNumber,
        campo: algo.matchName,
      });
    }
    if (algo.matchNumber != null) {
      return t('golpesSinEnviar.soloNumero', { numero: algo.matchNumber });
    }
    return algo.matchName || t('golpesSinEnviar.partidaSinNombre');
  };

  return (
    /* `px-4` como el resto de bloques del panel: sin él estas tarjetas van de
       borde a borde y desalinean la columna entera */
    <div
      ref={contenedorRef}
      tabIndex={-1}
      className="mb-4 space-y-2 px-4"
      data-testid="golpes-sin-enviar"
    >
      {/* El anuncio lo da el bloque UNA vez, como el resto del panel: un
          `role="alert"` por partida monta varios a la vez y se interrumpen
          entre ellos, y creados ya con su texto dentro hay lectores que no
          anuncian ninguno. `polite` y no `assertive` porque esto se lee en el
          panel, no en mitad de una tarea */}
      <span role="status" aria-live="polite" className="sr-only">
        {t('golpesSinEnviar.resumen', {
          sinEnviar: pendientes.reduce((suma, p) => suma + p.cuantas, 0),
          // Hoyos, como lo que se ve: por avisos, cuatro jugadores del mismo
          // hoyo se anunciaban como cuatro fallos sobre una lista de uno
          perdidos: perdidosPorPartida.reduce(
            (suma, [, delGrupo]) => suma + hoyosDe(delGrupo).length,
            0
          ),
        })}
      </span>
      {pendientes.map((partida) => partida.desaparecida ? (
        /* Esa partida ya no está en el servidor, así que sus golpes no los
           puede mandar nadie: la de partida rápida solo la vacía su propia
           pantalla, que es la que responde 404. No es un botón que navegue
           —llevaba a la pantalla de una partida que no existe— y no se borra
           solo: se ofrece, y decide quien lo anotó (FE #557) */
        <div
          key={partida.matchId}
          className="rounded-lg border border-amber-200 bg-amber-50 p-3"
        >
          <div className="flex items-start gap-3">
            <CloudOff className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-amber-900">
                {t('golpesSinEnviar.desaparecida', {
                  count: partida.cuantas,
                  partida: nombreDe(partida),
                })}
              </p>
              {/* Abrir la partida sigue estando: su pantalla es la única que
                  puede enviar esos golpes o retirar la marca si aquel 404 lo
                  dio un portal cautivo. Sin ella, la única salida que ofrecía
                  el aviso era borrarlos para siempre */}
              <div className="mt-2 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => abre(partida)}
                  className="min-h-11 px-1 py-2 text-xs font-medium text-amber-800 underline active:text-amber-900"
                >
                  {t('golpesSinEnviar.abrir')}
                </button>
                {/* Sin sesión resuelta no se ofrece: `olvidaLasDe` solo se
                    llevaría las anotaciones sin dueño, diría que sí, y la
                    tarjeta se repintaría igual — un botón que dice haber hecho
                    algo y no hizo nada */}
                {userId != null && (
                  <button
                    type="button"
                    onClick={() => descarta(partida)}
                    /* Su propio texto, y no el del botón gemelo: aquel dice
                       «quitar el aviso» y esto tira los golpes. Y el nombre
                       accesible empieza por lo que se lee en pantalla, o el
                       control por voz no lo activa */
                    aria-label={t('golpesSinEnviar.descartarYPerderDe', {
                      partida: nombreDe(partida),
                    })}
                    className="min-h-11 px-1 py-2 text-xs font-medium text-amber-800 underline active:text-amber-900"
                  >
                    {t('golpesSinEnviar.descartar')}
                  </button>
                )}
              </div>
              {noSePudoDescartar.has(partida.matchId) && (
                <p className="mt-1 text-xs text-amber-800">
                  {t('golpesSinEnviar.noSePudoDescartar')}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
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
        <div key={matchId} className="rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-red-900">
                {/* Cuenta HOYOS, como la lista de abajo: por avisos decía
                    «4 golpes» sobre una lista de un solo hoyo */}
                {t('golpesSinEnviar.perdidos', {
                  count: hoyosDe(delGrupo).length,
                  partida: nombreDe(delGrupo[0]),
                })}
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-red-800">
                {/* Por HOYO, no por aviso: en una partida rápida de cuatro
                    hay un aviso por jugador del mismo hoyo, y por aviso
                    salían cuatro líneas «Hoyo 7» iguales —y claves repetidas
                    si además había una huérfana y una con dueño—. Lo que hay
                    que repetir es el hoyo, una vez */}
                {hoyosDe(delGrupo).map((hoyo) => (
                  <li key={hoyo}>{t('golpesSinEnviar.perdido', { hoyo })}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  // Si el almacenamiento no admite la escritura —un móvil sin
                  // espacio, que es el estado que produjo el rechazo— el aviso
                  // sigue ahí. Callarlo deja un botón que no hace nada y no
                  // dice por qué; se avisa y no se relee, para no repintar lo
                  // mismo fingiendo que pasó algo
                  if (!golpesPerdidos.olvidaLosDe(matchId, userId)) {
                    apunta(matchId, true);
                    return;
                  }
                  apunta(matchId, false);
                  releeYDevuelveElFoco(
                    pendientes.length > 0 || perdidos.length > delGrupo.length
                  );
                }}
                aria-label={t('golpesSinEnviar.descartarDe', { partida: nombreDe(delGrupo[0]) })}
                className="mt-2 min-h-11 px-1 py-2 text-xs font-medium text-red-700 underline active:text-red-900"
              >
                {t('golpesSinEnviar.entendido')}
              </button>
              {noSePudoDescartar.has(matchId) && (
                <p className="mt-1 text-xs text-red-800">
                  {t('golpesSinEnviar.noSePudoDescartar')}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GolpesSinEnviar;
