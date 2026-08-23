/**
 * La marca, en un solo sitio. Estaba copiada como SVG suelto en cada pantalla
 * que la necesitaba, y una marca duplicada acaba divergiendo al primer retoque.
 */
const BrandMark = ({ className = 'size-8', title }) => (
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
      fill="#2d7b3e"
    />
  </svg>
);

export default BrandMark;
