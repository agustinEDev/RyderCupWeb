import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getGolfCourseUseCase, getQuickMatchUseCase } from '../../composition';
import { esFalloDeRed } from '../../utils/sinCobertura';
import { borradorParaRepetir } from '../../utils/borradorParaRepetir';
import customToast from '../../utils/toast';
import { leeTodosLosAmigos } from './leeTodosLosAmigos';

// El campo ya no está (o ya no lo puede ver): eso, y solo eso, es «elige otro»
const CAMPO_QUE_YA_NO_ESTA = new Set([403, 404]);

const leeElCampo = (id) =>
  getGolfCourseUseCase.execute(id).catch((err) => {
    if (CAMPO_QUE_YA_NO_ESTA.has(err?.status)) return null;
    throw err;
  });

/**
 * Repetir una partida rápida (FE #1021): pide el campo y los amigos de hoy
 * (y la partida, si solo llega su id, como desde Inicio), monta el borrador y
 * lo deja listo para abrir el asistente con él.
 *
 * Sin red no se abre nada a medias: se dice, como en el resto de la
 * aplicación (R14). Un campo que ya no está (404/403) lo avisa el borrador y
 * empieza por elegir otro (R8); cualquier otro fallo del servidor es el aviso
 * genérico, sin descartar nada (revisor).
 *
 * @param {Object|null} currentUser Quien repite
 * @returns {{borrador: Object|null, preparando: boolean, repetir: Function, cierra: Function}}
 */
export const useRepetirPartida = (currentUser) => {
  const { t } = useTranslation('quickMatch');
  const { t: tComun } = useTranslation('common');
  const [borrador, setBorrador] = useState(null);
  // Mientras, el botón se desactiva: dos toques seguidos preparan uno solo
  const [preparando, setPreparando] = useState(false);

  const repetir = useCallback(
    async (partidaOResumen) => {
      if (!currentUser?.id) return;
      setPreparando(true);
      let leido;
      try {
        const partida = partidaOResumen.participants
          ? partidaOResumen
          : await getQuickMatchUseCase.execute(partidaOResumen.id);
        const [campo, amigos] = await Promise.all([
          leeElCampo(partida.golfCourseId),
          leeTodosLosAmigos(currentUser.id),
        ]);
        leido = { partida, campo, amigos };
      } catch (err) {
        customToast.error(esFalloDeRed(err) ? tComun('sinConexion.mensaje') : t('create.errors.generic'));
      } finally {
        setPreparando(false);
      }
      if (!leido) return;
      // Aparte: un fallo aquí sería de los datos o del código, no de la red, y
      // no debe salir como «sin conexión»; pero tampoco callado (`/code-review`)
      try {
        setBorrador(borradorParaRepetir({ ...leido, yo: currentUser }));
      } catch {
        customToast.error(t('create.errors.generic'));
      }
    },
    [currentUser, t, tComun]
  );

  const cierra = useCallback(() => setBorrador(null), []);

  return { borrador, preparando, repetir, cierra };
};
