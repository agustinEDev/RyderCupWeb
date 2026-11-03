import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { RotateCcw } from 'lucide-react';
import { useRepetirPartida } from './useRepetirPartida';

// Como en la barra inferior: el asistente solo se baja cuando hace falta
const CreateQuickMatchModal = lazy(() => import('./CreateQuickMatchModal'));

/**
 * «Repetir partida» (FE #1021): un botón con texto en la pantalla de la
 * partida, o un icono en la tarjeta de «Mis partidas rápidas». Prepara el
 * borrador y abre el asistente con él; al empezar, se va a anotar la nueva.
 *
 * Solo para partidas que ya acabaron (terminadas o canceladas): quien la pinta
 * decide si se ofrece.
 *
 * @param {Object} props
 * @param {Object} props.partida La partida rápida que se repite
 * @param {Object} props.usuario Quien repite
 * @param {'boton'|'icono'} [props.como]
 */
const RepetirPartida = ({ partida, usuario, como = 'boton' }) => {
  const { t } = useTranslation('quickMatch');
  const navigate = useNavigate();
  const { borrador, preparando, repetir, cierra } = useRepetirPartida(usuario);

  const alEmpezar = (quickMatchId) => {
    cierra();
    navigate(`/quick-matches/${quickMatchId}/scoring`);
  };

  const pulsa = (e) => {
    // En la tarjeta, que el toque no la abra
    e.stopPropagation();
    repetir(partida);
  };

  return (
    <>
      {como === 'icono' ? (
        <button
          type="button"
          onClick={pulsa}
          disabled={preparando}
          aria-label={t('create.repetir.boton')}
          title={t('create.repetir.boton')}
          data-testid={`repetir-partida-${partida.id}`}
          className="p-3 rounded-lg flex items-center justify-center text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
        </button>
      ) : (
        <button
          type="button"
          onClick={pulsa}
          disabled={preparando}
          data-testid="repetir-partida"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          {t('create.repetir.boton')}
        </button>
      )}
      {borrador && (
        <Suspense fallback={null}>
          <CreateQuickMatchModal onClose={cierra} onStarted={alEmpezar} currentUser={usuario} borrador={borrador} />
        </Suspense>
      )}
    </>
  );
};

export default RepetirPartida;
