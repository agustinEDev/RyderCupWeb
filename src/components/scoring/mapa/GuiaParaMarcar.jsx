import { X } from 'lucide-react';
import ModalShell from '../../ui/ModalShell';

// Lo que se toca, en todos los dibujos: el mismo anillo amarillo
const TOQUE = '#facc15';
const CESPED = '#15803d';
const CALLE = '#4ade80';

// Dibujos sencillos, dentro del código: sin imágenes que bajar (sin conexión
// se ven igual) y mudos para el lector de pantalla, que ya lee el texto
const Dibujo = ({ children }) => (
  <svg
    viewBox="0 0 48 48"
    width="48"
    height="48"
    aria-hidden="true"
    focusable="false"
    className="shrink-0 rounded-lg bg-gray-800"
  >
    {children}
  </svg>
);

// Las dos marcas de la barra y el toque entre ellas
const DibujoDeLaSalida = () => (
  <Dibujo>
    <rect x="8" y="14" width="32" height="20" rx="4" fill={CESPED} />
    <circle cx="16" cy="24" r="3" fill="#fff" />
    <circle cx="32" cy="24" r="3" fill="#fff" />
    <circle cx="24" cy="24" r="6" fill="none" stroke={TOQUE} strokeWidth="2" />
  </Dibujo>
);

// La bandera a un lado; el toque, en el centro del green
const DibujoDelGreen = () => (
  <Dibujo>
    <ellipse cx="24" cy="26" rx="17" ry="13" fill={CALLE} />
    <line x1="34" y1="30" x2="34" y2="12" stroke="#fff" strokeWidth="1.5" />
    <path d="M34 12 L41 15 L34 18 Z" fill="#ef4444" />
    <circle cx="24" cy="26" r="2" fill="#fff" />
    <circle cx="24" cy="26" r="6" fill="none" stroke={TOQUE} strokeWidth="2" />
  </Dibujo>
);

// La calle que gira y el punto llevado de la recta a su centro
const DibujoDeLaCurva = () => (
  <Dibujo>
    <path
      d="M10 42 C10 22 18 12 38 8"
      fill="none"
      stroke={CESPED}
      strokeWidth="9"
      strokeLinecap="round"
    />
    <line
      x1="10"
      y1="42"
      x2="38"
      y2="8"
      stroke="#fff"
      strokeWidth="1.5"
      strokeDasharray="3 3"
    />
    <path
      d="M24 25 L16 21"
      stroke={TOQUE}
      strokeWidth="2"
      markerEnd="url(#flecha-de-la-guia)"
    />
    <defs>
      <marker
        id="flecha-de-la-guia"
        viewBox="0 0 6 6"
        refX="3"
        refY="3"
        markerWidth="4"
        markerHeight="4"
        orient="auto"
      >
        <path d="M0 0 L6 3 L0 6 Z" fill={TOQUE} />
      </marker>
    </defs>
    <circle
      cx="14"
      cy="20"
      r="3.5"
      fill="#fff"
      stroke={TOQUE}
      strokeWidth="2"
    />
  </Dibujo>
);

const PASOS = [
  ['salida', DibujoDeLaSalida],
  ['green', DibujoDelGreen],
  ['curva', DibujoDeLaCurva],
];

// Solo el green (el hoyo ya tiene salida, 19 nov): sin el paso de la salida, y
// sin el de la curva si no habrá puntos que arrastrar
const pasosDeLaGuia = (soloGreen, conCurva) =>
  soloGreen
    ? PASOS.filter(
        ([paso]) => paso === 'green' || (conCurva && paso === 'curva'),
      )
    : PASOS;

/**
 * La guía «Marca este hoyo» (G2): sale la primera vez que se empieza a marcar
 * y con el «?». Un diálogo encima del mapa (`ModalShell`: el foco entra y
 * vuelve, Escape cierra). Tocar fuera no cierra: en el campo se toca sin querer.
 * Oscura como las placas del mapa, que no cambia con el tema. Si solo falta el
 * green (`soloGreen`), «Marca el green», con sus pasos (Agustín, 19 nov).
 */
const GuiaParaMarcar = ({
  t,
  abierta,
  soloGreen = false,
  conCurva = true,
  onCerrar,
}) => (
  <ModalShell
    isOpen={abierta}
    onClose={onCerrar}
    closeOnBackdrop={false}
    labelledBy="titulo-de-la-guia-para-marcar"
    boxClassName="mx-4 w-full max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-gray-950 p-5 text-white shadow-xl"
  >
    <div className="flex items-start justify-between gap-2">
      <h2 id="titulo-de-la-guia-para-marcar" className="pt-2 text-lg font-bold">
        {t(soloGreen ? 'mapa.guia.tituloGreen' : 'mapa.guia.titulo')}
      </h2>
      <button
        type="button"
        onClick={onCerrar}
        aria-label={t('mapa.cerrar')}
        className="-mr-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-white"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
    <p className="mt-1 text-sm text-gray-300">
      {t(soloGreen ? 'mapa.guia.introGreen' : 'mapa.guia.intro')}
    </p>
    <ol className="mt-4 flex flex-col gap-3">
      {pasosDeLaGuia(soloGreen, conCurva).map(([paso, DibujoDelPaso]) => (
        <li key={paso} className="flex items-center gap-3">
          <DibujoDelPaso />
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold">
              {t(`mapa.guia.${paso}Titulo`)}
            </span>
            <span className="block text-sm text-gray-300">
              {t(`mapa.guia.${paso}Texto`)}
            </span>
          </span>
        </li>
      ))}
    </ol>
    <p className="mt-4 text-sm text-gray-300">{t('mapa.guia.pie')}</p>
    <button
      type="button"
      onClick={onCerrar}
      className="mt-4 min-h-11 w-full rounded-xl bg-white px-4 text-[15px] font-semibold text-gray-900"
    >
      {t('mapa.guia.empezar')}
    </button>
  </ModalShell>
);

export default GuiaParaMarcar;
