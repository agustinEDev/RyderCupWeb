import { useTranslation } from 'react-i18next';

/**
 * El mismo cartel que ya muestra el `Suspense` de `App.jsx` mientras baja un
 * chunk. Repetirlo exacto es la gracia: al comprobar la sesión en `/login` la
 * espera continúa sin que cambie nada en pantalla.
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
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'system-ui, sans-serif',
        color: '#6b7280',
      }}
    >
      {t('loading')}
    </div>
  );
};

export default FullScreenLoader;
