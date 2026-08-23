import { useTranslation } from 'react-i18next';

/**
 * La misma pantalla que muestra el `Suspense` de `App.jsx` mientras baja un
 * chunk —marca arriba y el aviso debajo—. Que sean iguales es la gracia: al
 * comprobar la sesión, la espera continúa sin que salte nada.
 *
 * Con dos cosas que aquel no puede tener: el texto pasa por `t()`, porque este
 * sí vive dentro del alcance de i18n, y se anuncia como `status` para que un
 * lector de pantalla no se encuentre una página muda.
 */
const FullScreenLoader = () => {
  const { t } = useTranslation('common');

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'system-ui, sans-serif',
        color: '#6b7280',
      }}
    >
      {/* El icono de la aplicacion, el mismo que se acaba de pulsar: en la
          pantalla de espera del arranque la continuidad es justo la gracia.
          Va precacheado por el service worker —entra en `globPatterns`—, asi
          que no depende de la red para aparecer. */}
      <img
        src="/icons/pwa-192x192.png"
        alt=""
        width="72"
        height="72"
        style={{ borderRadius: '16px' }}
      />
      <span style={{ marginTop: '1rem' }}>{t('loading')}</span>
    </div>
  );
};

export default FullScreenLoader;
