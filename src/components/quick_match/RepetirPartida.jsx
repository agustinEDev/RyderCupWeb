import { lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { RotateCcw } from 'lucide-react';
import { useRepetirPartida } from './useRepetirPartida';

// Como en la barra inferior: el asistente solo se baja cuando hace falta
const CreateQuickMatchModal = lazy(() => import('./CreateQuickMatchModal'));

/**
 * El icono ↻ «Repetir» de una partida rápida que ya acabó (FE #1021).
 *
 * @param {Object} props
 * @param {Object} props.partida La partida (o solo su `id` y su `name`)
 * @param {Function} props.onRepetir
 * @param {boolean} [props.preparando]
 */
export const IconoRepetir = ({ partida, onRepetir, preparando = false }) => {
  const { t } = useTranslation('quickMatch');
  const nombre = partida.name
    ? t('create.repetir.botonDe', { nombre: partida.name })
    : t('create.repetir.boton');
  return (
    <button
      type="button"
      onClick={() => onRepetir(partida)}
      disabled={preparando}
      aria-label={nombre}
      title={nombre}
      data-testid={`repetir-partida-${partida.id}`}
      className="p-3 rounded-lg flex items-center justify-center text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
    >
      <RotateCcw className="w-4 h-4" aria-hidden="true" />
    </button>
  );
};

/**
 * El asistente abierto con el borrador de repetir. Se pinta en `body`: dentro
 * de una tarjeta, su capa quedaba debajo de las tarjetas siguientes y de la
 * barra inferior (revisor). Al empezar, se va a anotar la nueva.
 *
 * @param {Object} props
 * @param {Object|null} props.borrador
 * @param {Object} props.usuario
 * @param {Function} props.cierra
 */
export const AsistenteDeRepetir = ({ borrador, usuario, cierra }) => {
  const navigate = useNavigate();
  if (!borrador) return null;
  const alEmpezar = (quickMatchId) => {
    cierra();
    navigate(`/quick-matches/${quickMatchId}/scoring`);
  };
  return createPortal(
    <Suspense fallback={null}>
      <CreateQuickMatchModal
        onClose={cierra}
        onStarted={alEmpezar}
        currentUser={usuario}
        borrador={borrador}
      />
    </Suspense>,
    document.body,
  );
};

/**
 * Icono y asistente juntos, para una tarjeta que no se vuelve a montar mientras
 * el asistente está abierto («Mis partidas rápidas»). Donde la fila sí puede
 * desaparecer (Inicio, al recargar), el asistente va en la lista
 * (`IconoRepetir` + `AsistenteDeRepetir` + `useRepetirPartida`).
 *
 * @param {Object} props
 * @param {Object} props.partida
 * @param {Object} props.usuario Quien repite
 */
const RepetirPartida = ({ partida, usuario }) => {
  const { borrador, preparando, repetir, cierra } = useRepetirPartida(usuario);
  return (
    <>
      <IconoRepetir
        partida={partida}
        onRepetir={repetir}
        preparando={preparando}
      />
      <AsistenteDeRepetir
        borrador={borrador}
        usuario={usuario}
        cierra={cierra}
      />
    </>
  );
};

export default RepetirPartida;
