import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LoadingMark from './LoadingMark';
import { respaldoDeCarga } from './textoDeEspera';
import { elArranqueHaTerminado } from '../../utils/cortinaDeArranque';


/**
 * La misma pantalla que muestra el `Suspense` de `App.jsx` mientras baja un
 * chunk —marca arriba y el aviso debajo—. Que sean iguales es la gracia: al
 * comprobar la sesión, la espera continúa sin que salte nada.
 *
 * Con dos cosas que aquel no puede tener: el texto pasa por `t()`, porque este
 * sí vive dentro del alcance de i18n, y se anuncia como `status` para que un
 * lector de pantalla no se encuentre una página muda.
 */
const FullScreenLoader = ({ texto }) => {
  const { t, i18n } = useTranslation('common');
  // `es_ES` con guion bajo es una forma que este proyecto ya ha visto —es la que
  // hacia estallar `localeCompare`—, asi que se parte por los dos separadores
  const respaldo = respaldoDeCarga(i18n);

  // Dos caras, y la diferencia importa dentro de la aplicacion instalada
  // (FE #492): el verde de la marca es la pantalla con la que la aplicacion se
  // abre. Verlo otra vez al volver a Inicio desde la barra inferior se lee como
  // si la aplicacion se reiniciara, cuando eso solo es una transicion.
  //
  // Se decide UNA sola vez, al montar, y por eso va en estado y no leyendo la
  // bandera en cada render: el valor vive en un modulo y cambia sola. Este
  // componente se vuelve a pintar sin desmontarse —react-i18next lo fuerza
  // cuando baja el namespace `common`, que va perezoso—, y leerla en el render
  // hacia que una espera EN CURSO pasara de verde a blanco delante de los ojos,
  // con su franja de estado incluida. Un parpadeo nuevo justo en la saga de los
  // parpadeos.
  const [esTransicion] = useState(() => elArranqueHaTerminado());

  return (
    <div
      role="status"
      aria-live="polite"
      className={esTransicion ? 'pantalla-de-espera pantalla-de-espera--transicion' : 'pantalla-de-espera'}
    >
      {/* En el arranque, `auto`: instalada el monograma va en blanco sobre el
          verde de la marca, y en el navegador en verde sobre blanco. `<picture>`
          elige segun `display-mode` y descarga solo una de las dos; las dos van
          precacheadas por el service worker, asi que aparecen sin depender de la
          red.

          En la transicion, la tinta VERDE a la fuerza: `auto` la pintaria blanca
          con la aplicacion instalada, y sobre el fondo claro de esta cara el
          monograma desapareceria. */}
      <LoadingMark tinta={esTransicion ? 'verde' : 'auto'} />
      {/* Con `defaultValue` porque este componente es tambien el fallback del
          `Suspense` raiz: ahi se pinta antes de que baje el namespace `common`
          —i18next va con `useSuspense: false` y un backend perezoso— y `t()`
          devolveria la clave en crudo, un «loading» en minuscula. */}
      {/* Cada pantalla puede traer el suyo —«Cargando competiciones...»— y las
          que no, se quedan con el generico. Lo que se unifica es el DIBUJO; el
          texto es informacion util y perderlo no mejora nada (FE #495). */}
      <span className="pantalla-de-espera__texto">{texto ?? t('loading', { defaultValue: respaldo })}</span>
    </div>
  );
};

export default FullScreenLoader;
