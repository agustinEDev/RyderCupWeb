import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getGolfCourseUseCase } from '../../composition';
import { esFalloDeRed } from '../../utils/sinCobertura';
import { borradorParaRepetir } from '../../utils/borradorParaRepetir';
import customToast from '../../utils/toast';
import { leeTodosLosAmigos } from './leeTodosLosAmigos';

/**
 * Repetir una partida rápida (FE #1021): pide el campo y los amigos de hoy,
 * monta el borrador y lo deja listo para abrir el asistente con él.
 *
 * Sin red no se abre nada a medias: se dice, como en el resto de la
 * aplicación (R14). Un campo que ya no se puede leer cuenta como que ya no
 * está: el borrador lo avisa y empieza por elegir otro (R8).
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
    async (partida) => {
      if (!currentUser?.id) return;
      setPreparando(true);
      try {
        const [campo, amigos] = await Promise.all([
          getGolfCourseUseCase.execute(partida.golfCourseId).catch((err) => {
            if (esFalloDeRed(err)) throw err;
            return null;
          }),
          leeTodosLosAmigos(currentUser.id),
        ]);
        setBorrador(borradorParaRepetir({ partida, yo: currentUser, amigos, campo }));
      } catch (err) {
        customToast.error(esFalloDeRed(err) ? tComun('sinConexion.mensaje') : t('create.errors.generic'));
      } finally {
        setPreparando(false);
      }
    },
    [currentUser, t, tComun]
  );

  const cierra = useCallback(() => setBorrador(null), []);

  return { borrador, preparando, repetir, cierra };
};
