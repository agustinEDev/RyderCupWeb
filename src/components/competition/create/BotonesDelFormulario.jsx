import { useTranslation } from 'react-i18next';

/**
 * «Cancelar» y «Crear» (o «Actualizar»). En el móvil la fila ocupa el ancho,
 * alineada con las tarjetas: pegada a la derecha quedaba descolgada. Pero el
 * que crece es «Crear», no «Cancelar»: con los dos a mitad y mitad, cancelar se
 * convertía en un objetivo enorme justo bajo el pulgar, al lado del de enviar,
 * y se lleva el formulario entero sin preguntar.
 */
const BotonesDelFormulario = ({ isEditMode, isSubmitting, onCancelar }) => {
  const { t } = useTranslation('competitions');
  return (
    <div className="flex gap-3 pt-2 pb-6 sm:justify-end">
      <button
        type="button"
        onClick={onCancelar}
        className="px-6 py-2.5 bg-gray-100 text-gray-900 text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors"
      >
        {t('create.cancel')}
      </button>
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex-1 sm:flex-none px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting
          ? isEditMode
            ? t('edit.updating') || 'Updating...'
            : t('create.creating')
          : isEditMode
            ? t('edit.updateCompetition') || 'Update Competition'
            : t('create.createCompetition')}
      </button>
    </div>
  );
};

export default BotonesDelFormulario;
