import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import BrandMark from '../ui/BrandMark';

/**
 * El marco de las pantallas de acceso: el panel de marca de la izquierda (oculto
 * en el móvil) y, a la derecha, el logo del móvil, la tarjeta de cada pantalla y
 * el «Volver al inicio». Estaba copiado cinco veces (Login, Registro, las dos
 * vistas de ¿Olvidaste la contraseña? y Restablecer); cada copia es ahora unas
 * props, y el DOM, las clases y las animaciones son los mismos que tenían.
 *
 * Las pantallas de acceso conservan su entrada animada: son la excepción A5 de
 * `sinFundidoAlEntrar.test.js` (Agustín, 3 nov 2026).
 *
 * Dos colores: `primario` (el verde, con las manchas arriba a la izquierda y
 * abajo a la derecha) y `acento`, la del Registro, con las manchas en espejo.
 */
const VARIANTES = {
  primario: {
    fondo: 'bg-primary',
    manchaDeArriba:
      'absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl',
    manchaDeAbajo:
      'absolute bottom-0 right-0 w-96 h-96 bg-accent rounded-full translate-x-1/2 translate-y-1/2 blur-3xl',
    siglas: 'text-accent',
  },
  acento: {
    fondo: 'bg-accent',
    manchaDeArriba:
      'absolute top-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl',
    manchaDeAbajo:
      'absolute bottom-0 left-0 w-96 h-96 bg-primary rounded-full -translate-x-1/2 translate-y-1/2 blur-3xl',
    siglas: 'text-white/90',
  },
};

// Las fotos del panel, por nombre: la URL va dentro de un `url("…")` del CSS,
// así que solo entra una de estas. Un nombre que no está, la de siempre
const FOTOS = {
  acceso:
    'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?q=80&w=2000',
  registro:
    'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?q=80&w=1000',
};
const fotoDelPanel = (foto) =>
  Object.hasOwn(FOTOS, foto) ? FOTOS[foto] : FOTOS.acceso;

/**
 * @param {object} props
 * @param {import('react').ReactNode} props.titulo - Título del panel de marca
 * @param {import('react').ReactNode} props.subtitulo - Subtítulo del panel de marca
 * @param {{ icon: string, text: string }[]} [props.ventajas] - Lista con icono;
 *        sin ella el panel no la pinta (la vista «enviado» de ¿Olvidaste…?)
 * @param {import('react').ReactNode} [props.extraDelHeroe] - Lo que va tras la
 *        lista en el panel (las cifras del Registro)
 * @param {'primario'|'acento'} [props.variante]
 * @param {'acceso'|'registro'} [props.foto] - Qué foto lleva el panel
 * @param {boolean} [props.soloAparece] - El contenido entra sin desplazarse (Login)
 * @param {import('react').ReactNode} [props.textoDeVolver] - Texto del enlace a
 *        la portada; sin él no se pinta (la vista «enviado» lleva otra cosa debajo)
 * @param {import('react').ReactNode} props.children - La tarjeta, y lo que vaya
 *        bajo ella antes del «Volver»
 */
const MarcoDeAcceso = ({
  titulo,
  subtitulo,
  ventajas,
  extraDelHeroe,
  variante = 'primario',
  foto = 'acceso',
  soloAparece = false,
  textoDeVolver,
  children,
}) => {
  const { t } = useTranslation(['auth', 'common']);
  const colores = VARIANTES[variante];

  return (
    <div className="relative flex min-h-screen w-full bg-white">
      <div className="flex w-full">
        {/* Left Side - Hero Image/Brand (Hidden on Mobile) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className={`hidden lg:flex lg:w-1/2 relative ${colores.fondo} overflow-hidden`}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className={colores.manchaDeArriba} />
            <div className={colores.manchaDeAbajo} />
          </div>

          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-20"
            style={{
              backgroundImage: `url("${fotoDelPanel(foto)}")`,
            }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <BrandMark className="size-10" tinta="blanco" />
              <div className="flex flex-col group-hover:opacity-80 transition-opacity">
                <h1 className="text-2xl font-bold font-poppins">
                  RyderCupFriends
                </h1>
                <span
                  className={`text-sm font-semibold ${colores.siglas} -mt-1`}
                >
                  RCF
                </span>
              </div>
            </Link>

            {/* Middle Content */}
            <div className="space-y-6">
              <div>
                <h2 className="text-4xl font-black font-poppins mb-4 leading-tight">
                  {titulo}
                </h2>
                <p className="text-xl text-white/90 leading-relaxed">
                  {subtitulo}
                </p>
              </div>

              {ventajas && (
                <div className="space-y-4 mt-8">
                  {ventajas.map((item, idx) => (
                    <motion.div
                      key={item.text}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + idx * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-xl">
                        {item.icon}
                      </div>
                      <span className="text-white/90">{item.text}</span>
                    </motion.div>
                  ))}
                </div>
              )}

              {extraDelHeroe}
            </div>

            {/* Footer */}
            <div className="text-white/70 text-sm">
              {t('common:footer.copyrightShort', {
                year: new Date().getFullYear(),
              })}
            </div>
          </div>
        </motion.div>

        {/* Right Side */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
          {/* En Login solo aparece: entrando desplazada, un clic en ese medio
              segundo podía soltarse fuera del botón, que se había movido (QA,
              FE #865-12) */}
          <motion.div
            initial={{ opacity: 0, ...(soloAparece ? {} : { y: 20 }) }}
            animate={{ opacity: 1, ...(soloAparece ? {} : { y: 0 }) }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            {/* Mobile Logo */}
            <Link
              to="/"
              className="flex lg:hidden items-center gap-3 mb-8 justify-center group"
            >
              <BrandMark className="size-10" />
              <div className="flex flex-col group-hover:opacity-80 transition-opacity">
                <h1 className="text-2xl font-bold font-poppins text-gray-900">
                  RyderCupFriends
                </h1>
                <span className="text-sm font-semibold text-primary -mt-1">
                  RCF
                </span>
              </div>
            </Link>

            {children}

            {textoDeVolver && (
              <Link
                to="/"
                className="flex items-center justify-center gap-2 mt-6 text-gray-600 hover:text-primary transition-colors group"
              >
                <svg
                  className="w-4 h-4 group-hover:-translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                <span className="text-sm font-medium">{textoDeVolver}</span>
              </Link>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default MarcoDeAcceso;
