import { useTranslation } from 'react-i18next';

/**
 * El respaldo mientras el namespace `common` no ha bajado. Va por idioma
 * porque un texto fijo en ingles se cuela justo en la pantalla de arranque de
 * una aplicacion en español. La etiqueta del detector no viene de una lista
 * cerrada —sale de `i18nextLng`—, asi que lo que no se reconozca cae en ingles,
 * igual que el `fallbackLng` de la configuracion.
 */
const RESPALDO_LOADING = new Map([
  ['es', 'Cargando...'],
  ['en', 'Loading...'],
]);

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
  const { t, i18n } = useTranslation('common');
  // `es_ES` con guion bajo es una forma que este proyecto ya ha visto —es la que
  // hacia estallar `localeCompare`—, asi que se parte por los dos separadores
  const idioma = String(i18n.resolvedLanguage || i18n.language || 'en')
    .split(/[-_]/)[0]
    .toLowerCase();
  // Un `Map` y no un objeto: `i18nextLng` es texto libre, y en un objeto una
  // etiqueta como `constructor` devolveria una funcion en vez de no encontrarse,
  // que React no sabe pintar
  const respaldo = RESPALDO_LOADING.get(idioma) ?? RESPALDO_LOADING.get('en');

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
      {/* Con `defaultValue` porque este componente es tambien el fallback del
          `Suspense` raiz: ahi se pinta antes de que baje el namespace `common`
          —i18next va con `useSuspense: false` y un backend perezoso— y `t()`
          devolveria la clave en crudo, un «loading» en minuscula. */}
      <span style={{ marginTop: '1rem' }}>{t('loading', { defaultValue: respaldo })}</span>
    </div>
  );
};

export default FullScreenLoader;
