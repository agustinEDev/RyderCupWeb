import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import GeneroParaApuntarseModal from '../profile/GeneroParaApuntarseModal';
import { useResponderInvitacion } from '../../hooks/useResponderInvitacion';
import { instanteEnTexto, instanteSiEsValido } from '../../utils/instanteDeLaApi';

/**
 * Si ya caducó, y al llegar la hora se vuelve a pintar: el cuadro se va solo,
 * como la tarjeta de «Mis invitaciones» pasa a «Caducada» (decidido el 27 oct).
 * Sin huso, la API da UTC (FE #710).
 */
const useCaducada = (expiresAt) => {
  const momento = instanteSiEsValido(expiresAt)?.getTime() ?? null;
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (momento === null) return undefined;
    // Ya pasada (otra invitación tras releer), al momento
    const falta = Math.max(0, momento - Date.now());
    // Más de ~24,8 días hace saltar el reloj al momento: solo repinta, y el
    // cuadro se queda (aún no ha caducado)
    const reloj = setTimeout(() => setAhora(Date.now()), falta);
    return () => clearTimeout(reloj);
  }, [momento]);
  return momento !== null && momento <= ahora;
};

/**
 * Mi invitación pendiente, en la ficha de su competición (release social 2):
 * aceptar o rechazar sin pasar por «Mis invitaciones». Solo sale si el
 * servidor la ofrece, es decir, si aceptarla puede salir bien.
 *
 * @param {{
 *   invitacion: {id: string, expiresAt: string|null}|null,
 *   alCambiar: () => unknown,
 * }} props - la invitación y cómo releer la ficha tras responder
 */
const InvitacionEnLaFicha = ({ invitacion, alCambiar }) => {
  const { t, i18n } = useTranslation('invitations');
  const caducada = useCaducada(invitacion?.expiresAt);
  const { seEstaRespondiendo, accionEnCurso, aceptar, rechazar, preguntaDelGenero } = useResponderInvitacion({
    alAceptar: alCambiar,
    alCambiar,
    textoYaNoPendiente: 'inDetail.notPendingAnymore',
  });

  if (!invitacion || caducada) return null;
  const procesando = seEstaRespondiendo(invitacion.id);
  const caduca = instanteEnTexto(invitacion.expiresAt, i18n.language, { day: 'numeric', month: 'short' });
  // Qué se está respondiendo, para decirlo en su botón, como en la lista
  const textoDe = (accion) =>
    accionEnCurso(invitacion.id) === accion
      ? t(`actions.${accion === 'ACCEPT' ? 'accepting' : 'declining'}`)
      : null;

  return (
    <section
      data-testid="invitacion-en-la-ficha"
      aria-labelledby="invitacion-en-la-ficha-titulo"
      className="mx-4 mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4"
    >
      <div className="flex items-start gap-3">
        <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id="invitacion-en-la-ficha-titulo" className="font-semibold text-gray-900">
            {t('inDetail.title')}
          </h2>
          {caduca && (
            <p data-testid="invitacion-caduca" className="mt-0.5 text-sm text-gray-600">
              {t('inDetail.expiresOn', { date: caduca.replace('.', '') })}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="invitacion-aceptar"
          onClick={() => aceptar(invitacion.id)}
          disabled={procesando}
          className="min-h-11 flex-1 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {textoDe('ACCEPT') ?? t('actions.accept')}
        </button>
        <button
          type="button"
          data-testid="invitacion-rechazar"
          onClick={() => rechazar(invitacion.id)}
          disabled={procesando}
          className="min-h-11 flex-1 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {textoDe('DECLINE') ?? t('actions.decline')}
        </button>
      </div>
      <GeneroParaApuntarseModal {...preguntaDelGenero} />
    </section>
  );
};

export default InvitacionEnLaFicha;
