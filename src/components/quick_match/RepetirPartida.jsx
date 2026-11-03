import { lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { RotateCcw } from 'lucide-react';
import { useRepetirPartida } from './useRepetirPartida';

// Como en la barra inferior: el asistente solo se baja cuando hace falta
const CreateQuickMatchModal = lazy(() => import('./CreateQuickMatchModal'));

/**
 * El icono ↻ «Repetir» de una partida rápida que ya acabó (FE #1021), en
 * «Mis partidas rápidas» y en «Las últimas partidas» de Inicio. Prepara el
 * borrador y abre el asistente con él; al empezar, se va a anotar la nueva.
 *
 * El asistente se pinta en `body`: dentro de la tarjeta, su capa quedaba
 * debajo de las tarjetas siguientes y de la barra inferior (revisor).
 *
 * @param {Object} props
 * @param {Object} props.partida La partida (o, desde Inicio, solo su `id` y su `name`)
 * @param {Object} props.usuario Quien repite
 */
const RepetirPartida = ({ partida, usuario }) => {
  const { t } = useTranslation('quickMatch');
  const navigate = useNavigate();
  const { borrador, preparando, repetir, cierra } = useRepetirPartida(usuario);

  const alEmpezar = (quickMatchId) => {
    cierra();
    navigate(`/quick-matches/${quickMatchId}/scoring`);
  };

  const nombre = partida.name ? t('create.repetir.botonDe', { nombre: partida.name }) : t('create.repetir.boton');

  return (
    <>
      <button
        type="button"
        onClick={() => repetir(partida)}
        disabled={preparando}
        aria-label={nombre}
        title={nombre}
        data-testid={`repetir-partida-${partida.id}`}
        className="p-3 rounded-lg flex items-center justify-center text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
      >
        <RotateCcw className="w-4 h-4" aria-hidden="true" />
      </button>
      {borrador &&
        createPortal(
          <Suspense fallback={null}>
            <CreateQuickMatchModal onClose={cierra} onStarted={alEmpezar} currentUser={usuario} borrador={borrador} />
          </Suspense>,
          document.body
        )}
    </>
  );
};

export default RepetirPartida;
