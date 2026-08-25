import { useEffect } from 'react';
import { Link, Navigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useStandalone } from '../hooks/useStandalone';
import { useRedirectIfAuthenticated } from '../hooks/useRedirectIfAuthenticated';
import SignInForm from '../components/auth/SignInForm';
import FullScreenLoader from '../components/ui/FullScreenLoader';
import BrandMark from '../components/ui/BrandMark';
import { laPantallaEstaLista } from '../utils/cortinaDeArranque';

/**
 * Por donde arranca la aplicacion instalada (FE #465).
 *
 * Es la ruta del `start_url` del manifiesto, y existe para que `/` deje de
 * hacer dos papeles. Antes la aplicacion abria en la portada y habia que
 * ADIVINAR, mirando el tipo de navegacion, si aquello era un arranque o una
 * visita normal; adivinar fallo dos veces —quien entraba por un enlace
 * compartido y luego pulsaba el logo, y quien volvia atras desde el panel—.
 * Aqui no hay nada que adivinar: a esta pantalla solo se llega arrancando.
 *
 * Con sesion se va al panel. Sin ella se entra, que es lo que uno espera de una
 * aplicacion abierta desde su icono: la portada es para el navegador, donde
 * tiene sentido enseñarla o compartirla, y desde aqui se llega por el enlace
 * del pie.
 */
const AppStart = () => {
  const { t } = useTranslation(['auth', 'common']);
  const esAplicacionInstalada = useStandalone();
  const comprobandoSesion = useRedirectIfAuthenticated({
    enabled: esAplicacionInstalada,
    // En el campo no hay cobertura, y esta es la pantalla por la que se entra:
    // si la sesion no se puede COMPROBAR —que no es lo mismo que ser rechazada—
    // se entra con la guardada, en vez de dejar un formulario que no se puede
    // enviar. Solo aqui: en el navegador la portada sigue siendo utilizable.
    entrarSinRed: true,
  });

  // El aviso a la cortina del arranque (FE #485). Esta es la otra salida: sin
  // sesion se entra por aqui, y el formulario es la pantalla terminada.
  //
  // Con sesion NO se avisa, y no hace falta ningun guardia para ello:
  // `useRedirectIfAuthenticated` deja `comprobandoSesion` arriba mientras
  // redirige —a proposito, para no pintar el formulario un instante—, asi que
  // la cortina sigue puesta hasta que el panel avise por su cuenta.
  useEffect(() => {
    if (!comprobandoSesion && esAplicacionInstalada) {
      laPantallaEstaLista();
    }
  }, [comprobandoSesion, esAplicacionInstalada]);

  // En el navegador esta ruta no pinta nada: la puerta es la portada. Puede
  // llegarse por un enlace copiado o por una instalacion que se desinstalo.
  //
  // Si un arranque instalado NO llegara a detectarse —modo `minimal-ui`, un
  // acceso directo que abre en pestaña—, quien tenga sesion aterrizaria aqui en
  // la portada en vez de en el panel. No hay red para eso: la deteccion antigua
  // de `Landing` exige `useStandalone()`, que es justo lo que habria fallado, y
  // ademas se llega con `REPLACE`, no con `POP`. Se asume: el caso es raro y la
  // portada sigue siendo utilizable, con su boton de entrar.
  if (!esAplicacionInstalada) {
    return <Navigate to="/" replace />;
  }

  // Mientras se resuelve la sesion no se enseña nada: apareceria el formulario
  // entero para desaparecer un segundo despues.
  if (comprobandoSesion) {
    return <FullScreenLoader />;
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-50 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">

        <div className="mb-8 flex flex-col items-center">
          <BrandMark className="size-16" />
          <h1 className="mt-3 font-poppins text-2xl font-bold text-gray-900">RyderCupFriends</h1>
          <span className="text-sm font-semibold text-primary">RCF</span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
          <h2 className="mb-6 font-poppins text-xl font-black text-gray-900">
            {t('appStart.title')}
          </h2>
          <SignInForm />
        </div>

        {/* La salida hacia la portada: al pie y discreta, para quien quiera saber
            que es esto sin que compita con lo que de verdad se viene a hacer */}
        <Link
          to="/"
          className="mt-8 text-center text-sm text-gray-500 underline-offset-4 transition-colors hover:text-primary hover:underline"
        >
          {t('appStart.whatIsThis')}
        </Link>
      </div>
    </div>
  );
};

export default AppStart;
