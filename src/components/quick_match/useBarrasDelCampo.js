import { useEffect, useMemo, useState } from 'react';
import { useCargaCancelableEffect } from '../../hooks/useCargaCancelableEffect';
import {
  getGolfCourseUseCase,
  listMyQuickMatchesUseCase,
} from '../../composition';
import { barraPorDefecto, ultimasBarras } from '../../utils/barraPorDefecto';
import { NO_TEE_KEY, teeKey } from './createQuickMatchModalConstants';

// Cuánto se espera a tus partidas antes de sugerir la barra por tu género
export const ESPERA_DE_TUS_PARTIDAS_MS = 2000;

// Al repetir con el aviso de que tu barra ya no vale, no se marca ninguna: el
// aviso pide elegirla (Agustín, 4 nov 2026). Solo en el campo copiado
const hayAvisoDeTuBarra = (avisosDelBorrador, selectedCourse, copia) =>
  avisosDelBorrador.some(
    (a) => a.propia && (a.tipo === 'barra' || a.tipo === 'sinBarra'),
  ) && selectedCourse?.id === copia?.selectedCourse?.id;

/**
 * Tus partidas rápidas en el campo elegido, para saber qué barra llevó cada
 * uno la última vez (FE #1025). Solo las 5 últimas de ese campo (Agustín,
 * 4 nov 2026): antes se bajaban las 50 últimas al abrir. Sin poder leerlas
 * (sin red), por tu género.
 *
 * Todo va por ELECCIÓN de campo, no por campo: volver al mismo cuenta como
 * otra, con su petición y sus 2 s (revisor). La respuesta de una elección
 * anterior se descarta (`vigente`) y, mientras no llega la de la actual, no
 * hay partidas (`partidasDe.eleccion`)
 *
 * @returns {{ misPartidas: Array|null, plazoAgotado: boolean }} `null` hasta
 *   que llegan; `plazoAgotado`, si pasaron 2 s sin respuesta
 */
const useTusPartidasEnElCampo = (campoElegido, eleccionDeCampo) => {
  const [partidasDe, setPartidasDe] = useState({
    eleccion: null,
    partidas: null,
  });
  const misPartidas =
    campoElegido && partidasDe.eleccion === eleccionDeCampo
      ? partidasDe.partidas
      : null;
  // Sin respuesta en 2 s desde que se elige el campo (poca cobertura), se
  // sugiere por tu género: la barra no se queda sin marcar esperando
  const [plazoAgotadoEn, setPlazoAgotadoEn] = useState(null);
  const plazoAgotado =
    campoElegido !== null && plazoAgotadoEn === eleccionDeCampo;
  useEffect(() => {
    if (!campoElegido) return undefined;
    let vigente = true;
    const eleccion = eleccionDeCampo;
    const plazo = setTimeout(
      () => setPlazoAgotadoEn(eleccion),
      ESPERA_DE_TUS_PARTIDAS_MS,
    );
    Promise.resolve()
      .then(() =>
        listMyQuickMatchesUseCase.execute({
          page: 1,
          limit: 5,
          golfCourseId: campoElegido,
        }),
      )
      .then((r) => {
        if (vigente)
          setPartidasDe({ eleccion, partidas: r?.quickMatches ?? [] });
      })
      .catch(() => {
        if (vigente) setPartidasDe({ eleccion, partidas: [] });
      })
      // Con la respuesta, el plazo ya no hace falta (`/code-review`)
      .finally(() => clearTimeout(plazo));
    return () => {
      vigente = false;
      clearTimeout(plazo);
    };
  }, [campoElegido, eleccionDeCampo]);
  return { misPartidas, plazoAgotado };
};

/**
 * Las barras del campo elegido en el asistente de partida rápida y la de
 * quien crea: la carga de la ficha del campo (con su procedencia), la barra
 * sugerida y la de cada amigo según vuestras últimas partidas allí.
 *
 * El campo vive en el asistente (lo usan todos los pasos); aquí se elige con
 * `eligeCampo`, que cuenta cada elección. El aviso también es del asistente:
 * llega `error`/`setError` porque marcar la sugerida quita el de «elige tu
 * barra».
 *
 * @param {Object} opciones
 * @param {Object|null} opciones.selectedCourse - El campo elegido
 * @param {Function} opciones.setSelectedCourse
 * @param {Object|null} opciones.copia - Lo copiado al repetir, o `null`
 * @param {Array} opciones.avisosDelBorrador - Lo que no se pudo copiar
 * @param {Object|null} opciones.currentUser - Quien crea
 * @param {Object|null} opciones.error - El aviso del asistente
 * @param {Function} opciones.setError
 */
export const useBarrasDelCampo = ({
  selectedCourse,
  setSelectedCourse,
  copia,
  avisosDelBorrador,
  currentUser,
  error,
  setError,
}) => {
  const [courseTees, setCourseTees] = useState([]);
  // Lo dice la ficha completa del campo, que es la que trae su procedencia
  const [courseFromRfeg, setCourseFromRfeg] = useState(false);
  const [creatorTeeKey, setCreatorTeeKey] = useState(
    copia?.creatorTeeKey ?? NO_TEE_KEY,
  );
  // De qué campo son la barra elegida, las barras y la cita de la RFEG. Al
  // cambiar de campo (también a ninguno) se ajusta durante el render, no en un
  // efecto: la barra elegida ya no vale y la cita no es de este campo. Las
  // barras del anterior siguen a la vista mientras llegan las del nuevo; sin
  // campo, ninguna. La copiada al repetir es del campo con el que se abre, así
  // que no se borra
  const campoActual = selectedCourse?.id ?? null;
  const [campoDeLaBarra, setCampoDeLaBarra] = useState(campoActual);
  if (campoActual !== campoDeLaBarra) {
    setCampoDeLaBarra(campoActual);
    setCreatorTeeKey(NO_TEE_KEY);
    setCourseFromRfeg(false);
    if (!campoActual) setCourseTees([]);
  }
  // Las barras del campo, con su procedencia. Lo de un campo anterior que
  // llegue tarde no se aplica
  const { cargando: teesLoading } = useCargaCancelableEffect(
    () => getGolfCourseUseCase.execute(campoActual),
    [campoActual],
    {
      activa: Boolean(campoActual),
      alCargar: (course) => {
        setCourseTees(course.tees || []);
        setCourseFromRfeg(course.isFromRfeg?.() === true);
      },
      alFallar: () => setCourseTees([]),
    },
  );

  const [eleccionDeCampo, setEleccionDeCampo] = useState(0);
  const eligeCampo = (campo) => {
    setSelectedCourse(campo);
    setEleccionDeCampo((n) => n + 1);
  };
  const { misPartidas, plazoAgotado } = useTusPartidasEnElCampo(
    campoActual,
    eleccionDeCampo,
  );
  const ultimas = useMemo(
    () => ultimasBarras(misPartidas, selectedCourse?.id),
    [misPartidas, selectedCourse?.id],
  );
  // La que sale elegida: la de la última vez en ese campo; si no, la de tu
  // género. Solo si no hay ninguna elegida: la copiada al repetir (P7) o la
  // que hayas tocado tú mandan
  const barraSugerida = barraPorDefecto({
    tees: courseTees,
    genero: currentUser?.gender ?? null,
    ultima: ultimas.get(currentUser?.id) ?? null,
  });
  // La sugerida no se marca hasta saber tus partidas (o agotar el plazo), y en
  // cuanto se marca se fija: así no salta delante de ti cuando llegan tarde,
  // ni viaja una distinta de la que enseña el resumen (revisor, 4 nov 2026).
  // Ajuste durante el render (no en un efecto); al cambiar de campo vuelve a
  // `NO_TEE_KEY` y se sugiere otra vez
  const sugerenciaLista =
    !teesLoading &&
    !hayAvisoDeTuBarra(avisosDelBorrador, selectedCourse, copia) &&
    (misPartidas !== null || plazoAgotado);
  if (
    creatorTeeKey === NO_TEE_KEY &&
    sugerenciaLista &&
    barraSugerida !== NO_TEE_KEY
  ) {
    setCreatorTeeKey(barraSugerida);
    // Si ya se pidió elegirla, el aviso sobra: ya hay una (/code-review). Solo
    // si es ese, para no encolar nada durante el render sin motivo. Es un
    // ajuste durante el render: solo vale porque `setError` es del mismo
    // componente que usa este hook (el asistente, con `useAvisoDelAsistente`);
    // con el de un padre, React avisaría de actualizar otro componente
    if (error?.clave === 'create.course.errorTeeRequired') setError(null);
  }
  // La de cada amigo, para preelegirla al añadirlo (P8)
  const barraDeAmigo = (userId) => {
    const ultima = ultimas.get(userId);
    return ultima &&
      courseTees.some((t) => teeKey(t.color, t.gender) === ultima)
      ? ultima
      : NO_TEE_KEY;
  };

  return {
    courseTees,
    courseFromRfeg,
    teesLoading,
    creatorTeeKey,
    setCreatorTeeKey,
    eligeCampo,
    barraDeAmigo,
  };
};
