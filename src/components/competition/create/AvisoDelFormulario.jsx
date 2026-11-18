// Helper function to get message className
const getMessageClassName = (type) => {
  if (type === 'success')
    return 'bg-green-50 text-green-800 border border-green-200';
  if (type === 'error') return 'bg-red-50 text-red-800 border border-red-200';
  return 'bg-yellow-50 text-yellow-800 border border-yellow-200';
};

/**
 * El aviso general del formulario, arriba del todo. `ref` es el aviso: el
 * botón vive abajo y en un teléfono se pulsa «Crear» sin ver qué pasó, así que
 * se trae a la vista y recibe el foco (FE #731).
 */
const AvisoDelFormulario = ({ ref, message }) => (
  <div
    ref={ref}
    role={message.type === 'error' ? 'alert' : 'status'}
    tabIndex={-1}
    // Recibe el foco al fallar: con un anillo que se vea (CodeRabbit)
    className={`mx-4 mb-4 p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${message.type === 'error' ? 'focus:ring-red-400' : 'focus:ring-primary-400'} ${getMessageClassName(message.type)}`}
  >
    {message.text}
  </div>
);

export default AvisoDelFormulario;
