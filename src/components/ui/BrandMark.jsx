/**
 * La marca, en un solo sitio. Estaba copiada como SVG suelto en cada pantalla
 * que la necesitaba, y una marca duplicada acaba divergiendo al primer retoque.
 *
 * El relleno es `currentColor`, asi que el color lo pone quien la usa con una
 * utilidad de texto: `text-primary-600` para el verde de la marca (#2d7b3e)
 * sobre fondo claro, `text-white` sobre el panel oscuro de las pantallas de
 * autenticacion. Ojo, NO es `text-primary`, que es primary-500 (#16a34a) y un
 * verde distinto.
 *
 * El color va tambien en el valor por defecto: sin el, un `<BrandMark />` suelto
 * heredaria el color de su contenedor y saldria gris o blanco sin que fallara
 * nada —ni lint, ni un test—, que es justo la divergencia silenciosa que este
 * componente viene a evitar.
 */
const BrandMark = ({ className = 'size-8 text-primary-600', title }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role={title ? 'img' : 'presentation'}
    aria-label={title || undefined}
    aria-hidden={title ? undefined : 'true'}
  >
    <path
      d="M13.8261 17.4264C16.7203 18.1174 20.2244 18.5217 24 18.5217C27.7756 18.5217 31.2797 18.1174 34.1739 17.4264C36.9144 16.7722 39.9967 15.2331 41.3563 14.1648L24.8486 40.6391C24.4571 41.267 23.5429 41.267 23.1514 40.6391L6.64374 14.1648C8.00331 15.2331 11.0856 16.7722 13.8261 17.4264Z"
      fill="currentColor"
    />
  </svg>
);

export default BrandMark;
