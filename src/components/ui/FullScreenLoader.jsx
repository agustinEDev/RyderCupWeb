/**
 * El mismo cartel que ya muestra el `Suspense` de `App.jsx` mientras baja un
 * chunk. Repetirlo exacto es la gracia: al comprobar la sesión en `/login` la
 * espera continúa sin que cambie nada en pantalla.
 */
const FullScreenLoader = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'system-ui, sans-serif',
      color: '#6b7280',
    }}
  >
    Loading...
  </div>
);

export default FullScreenLoader;
