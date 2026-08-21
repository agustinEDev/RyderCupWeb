import { useTranslation } from 'react-i18next';

/**
 * La figura del hoyo: el golpe anotado con su forma, o un hueco.
 *
 * `pickedUp` es la RAYA —el jugador recogió la bola— y NO es lo mismo que un
 * hoyo sin anotar, aunque los dos lleguen aquí sin número. Se dibujan distinto
 * a propósito: con el mismo guion gris para ambos, quien mira la tarjeta no
 * sabe si a ese hoyo le falta el golpe o si ya está cerrado, que es justo lo
 * que hay que poder distinguir para dar la partida por terminada.
 */
const GolfFigure = ({ score, par, pickedUp = false }) => {
  const { t } = useTranslation('scoring');

  if (pickedUp) {
    return (
      <span
        data-testid="golf-figure"
        data-picked-up="true"
        title={t('input.pickedUpLabel')}
        className="inline-flex items-center justify-center w-7 h-7 text-base font-bold text-gray-600"
      >
        {/* El trazo es decorativo: no dice nada leído en voz alta, y el `title`
            no llega a quien navega con teclado ni se anuncia igual en todos los
            lectores. El texto va aparte, solo para ellos. */}
        <span aria-hidden="true">—</span>
        <span className="sr-only">{t('input.pickedUpLabel')}</span>
      </span>
    );
  }

  // Hoyo sin anotar: la casilla se queda VACÍA. Un guion aquí se confundía con
  // la raya —dos trazos horizontales que solo cambiaban de gris y de largo— y
  // en el móvil no había forma de saber, de un vistazo, si al hoyo le faltaba
  // el golpe o si ya estaba cerrado. El hueco conserva su tamaño para no
  // descuadrar la fila, y se anuncia para quien no lo ve.
  if (score === null || score === undefined) {
    return (
      <span data-testid="golf-figure" className="inline-flex w-7 h-7">
        <span className="sr-only">{t('input.notEntered')}</span>
      </span>
    );
  }

  // Hay golpes pero no se sabe el par de ese hoyo: se enseña el número tal
  // cual. Antes se escondía tras un guion, y perder el golpe anotado es peor
  // que quedarse sin figura — además de ser el último guion que podía pasar
  // por una raya.
  if (par === null || par === undefined) {
    return (
      <span
        data-testid="golf-figure"
        className="inline-flex items-center justify-center w-7 h-7 text-xs font-bold text-gray-700"
      >
        {score}
      </span>
    );
  }

  const diff = score - par;

  // Eagle or better (-2 or less)
  if (diff <= -2) {
    return (
      <span data-testid="golf-figure" title={t('figures.eagle')} className="inline-flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="13" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-yellow-500" />
          <circle cx="14" cy="14" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-yellow-500" />
          <text x="14" y="18" textAnchor="middle" className="text-xs font-bold fill-current text-yellow-700">{score}</text>
        </svg>
      </span>
    );
  }

  // Birdie (-1)
  if (diff === -1) {
    return (
      <span data-testid="golf-figure" title={t('figures.birdie')} className="inline-flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="12" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-500" />
          <text x="14" y="18" textAnchor="middle" className="text-xs font-bold fill-current text-red-700">{score}</text>
        </svg>
      </span>
    );
  }

  // Par (0)
  if (diff === 0) {
    return (
      <span data-testid="golf-figure" title={t('figures.par')} className="inline-flex items-center justify-center w-7 h-7 text-xs font-bold text-gray-700">
        {score}
      </span>
    );
  }

  // Bogey (+1)
  if (diff === 1) {
    return (
      <span data-testid="golf-figure" title={t('figures.bogey')} className="inline-flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 28 28">
          <rect x="2" y="2" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-500" />
          <text x="14" y="18" textAnchor="middle" className="text-xs font-bold fill-current text-blue-700">{score}</text>
        </svg>
      </span>
    );
  }

  // Double bogey or worse (+2 or more)
  return (
    <span data-testid="golf-figure" title={t('figures.doubleBogey')} className="inline-flex items-center justify-center">
      <svg width="28" height="28" viewBox="0 0 28 28">
        <rect x="1" y="1" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-purple-500" />
        <rect x="4" y="4" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-purple-500" />
        <text x="14" y="18" textAnchor="middle" className="text-xs font-bold fill-current text-purple-700">{score}</text>
      </svg>
    </span>
  );
};

export default GolfFigure;
