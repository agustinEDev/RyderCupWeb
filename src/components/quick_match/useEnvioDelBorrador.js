import { useRef, useState } from 'react';
import { createAndStartQuickMatchUseCase } from '../../composition';
import { esFalloDeRed, motivoDelError } from '../../utils/sinCobertura';
import { idAleatorio } from '../../utils/idAleatorio';
import customToast from '../../utils/toast';

// Por qué no se pudo empezar, por el código del servidor (FE #848): todo se
// comprueba al confirmar, así que el motivo se dice en el resumen
const MOTIVO_POR_CODIGO = {
  403: 'create.errors.notFriends',
  404: 'create.errors.notFound',
  409: 'create.errors.conflict',
  422: 'create.errors.invalid',
};

// Pudo llegar: sin red, cortada por tiempo o un 5xx. Un fallo en el propio
// móvil antes de mandar nada (o un 4xx) dice que no se creó
const pudoLlegar = (err) =>
  esFalloDeRed(err) || err?.name === 'AbortError' || err?.status >= 500;

// El aviso de un fallo al empezar. Los nuestros, por clave (cambian de idioma
// con la página); solo el motivo que manda el servidor va como texto (revisor)
const avisoDelFallo = (err) => {
  const motivo = MOTIVO_POR_CODIGO[err?.status];
  if (motivo) return { clave: motivo };
  const deLaRegla = motivoDelError(err);
  if (deLaRegla === 'sinConexion')
    return { clave: 'sinConexion.mensaje', comun: true };
  if (deLaRegla === 'generico') return { clave: 'create.errors.generic' };
  return { texto: deLaRegla.delServidor };
};

/**
 * «Confirmar e iniciar» del asistente de partida rápida: crea, inicia y fija
 * los hándicaps en una sola petición, con un id por intento para no crear dos.
 *
 * @param {Object} opciones
 * @param {() => Object} opciones.armaLaPeticion - El cuerpo, sin el id; se
 *   llama al confirmar (si lanza, es un fallo más)
 * @param {(id: string) => void} opciones.onStarted - Con la partida empezada
 * @param {Function} opciones.t - El de quickMatch
 * @param {Function} opciones.ponElAviso - Pone el aviso tal cual
 * @returns {{ isProcessing: boolean, handleStart: () => Promise<void> }}
 */
export const useEnvioDelBorrador = ({
  armaLaPeticion,
  onStarted,
  t,
  ponElAviso,
}) => {
  // El id del último intento y lo que se mandó: reintentar LO MISMO tras un
  // fallo reusa el id —si la respuesta se perdió, el servidor devuelve la que
  // ya creó—; un cambio en el borrador estrena uno, salvo que la partida
  // pudiera haberse creado ya (`idDelIntento`)
  const ultimoIntento = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Tras un fallo SIN respuesta (sin red, 5xx, tiempo agotado) la partida
  // pudo crearse: el id se conserva aunque cambie el borrador, y el servidor
  // devuelve la que ya hay en vez de crear otra. Tras un rechazo claro (4xx)
  // no se creó nada, y un borrador distinto estrena id, salvo que un intento
  // anterior ya dejara la duda: esa solo se va al salir bien
  const idDelIntento = (peticion) => {
    const firma = JSON.stringify(peticion);
    const previo = ultimoIntento.current;
    if (!previo || (previo.firma !== firma && !previo.quizaCreada)) {
      ultimoIntento.current = { firma, id: idAleatorio(), quizaCreada: false };
    }
    return ultimoIntento.current.id;
  };

  const handleStart = async () => {
    setIsProcessing(true);
    ponElAviso(null);
    try {
      const peticion = armaLaPeticion();
      const quickMatchId = idDelIntento(peticion);
      // Con el id de un intento que quizá se creó y el borrador cambiado, el
      // servidor devuelve la que ya hay: se dice que valió lo de antes
      const cambiado =
        ultimoIntento.current.quizaCreada &&
        ultimoIntento.current.firma !== JSON.stringify(peticion);
      const started = await createAndStartQuickMatchUseCase.execute({
        quickMatchId,
        ...peticion,
      });
      // Ya existe: si lo de después falla, reintentar no puede crear otra
      ultimoIntento.current.quizaCreada = true;
      if (cambiado) customToast.info(t('create.alreadyCreated'));
      onStarted(started.id);
      // Todo bien: ya no hay duda que arrastrar
      ultimoIntento.current = null;
    } catch (err) {
      // La duda no se borra con un fallo posterior: un 4xx o un fallo en el
      // móvil hablan de ESTE intento, no de si se creó uno anterior
      if (ultimoIntento.current)
        ultimoIntento.current.quizaCreada ||= pudoLlegar(err);
      ponElAviso(avisoDelFallo(err));
    } finally {
      setIsProcessing(false);
    }
  };

  return { isProcessing, handleStart };
};
