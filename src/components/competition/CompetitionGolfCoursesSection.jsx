import { useState, useEffect, useRef } from 'react';
import { Flag, Plus, Trash2, GripVertical, MapPin, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CountryFlag } from '../../utils/countryUtils';
import { formatCountryName } from '../../services/countries';
import GolfCourseSearchBox from '../golf_course/GolfCourseSearchBox';
import customToast from '../../utils/toast';
import {
  getCompetitionGolfCoursesUseCase,
  addGolfCourseToCompetitionUseCase,
  removeGolfCourseFromCompetitionUseCase,
  reorderGolfCoursesUseCase,
} from '../../composition';
import BlockLoader from '../ui/BlockLoader';
import ConfirmModal from '../modals/ConfirmModal';
import { etiquetaDelTipoDeCampo } from './etiquetaDelTipoDeCampo';
import { hayQueArrancarloAMano } from '../../services/arranqueAMano';
import {
  CompetitionStatus,
  CompetitionStatusEnum,
} from '../../domain/value_objects/CompetitionStatus';

/**
 * El color de cada tipo de campo. El TEXTO sale de i18n: escrito aquí a mano
 * se quedaba en inglés en una pantalla en español (visto en el Kind, 23 sep)
 */
const colorDelTipoDeCampo = (courseType) => {
  switch (courseType) {
    case 'STANDARD_18':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'PITCH_AND_PUTT':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'EXECUTIVE':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

/**
 * El nombre del país de un campo, en el idioma de la aplicación.
 *
 * El campo solo trae `country_code`: el backend no manda su nombre, así que
 * formatearlo a secas devolvía cadena vacía y se veía una bandera con la
 * etiqueta en blanco. La competición sí trae sus países con los dos idiomas, y
 * un campo suyo es de uno de ellos, de modo que se resuelve ahí sin pedir nada.
 * El código queda de reserva para lo que no se pueda resolver.
 */
const nombreDelPais = (codigo, paises, idioma) => {
  const pais = paises?.find((c) => c.code === codigo);
  return formatCountryName(pais ?? { code: codigo }, idioma) || codigo;
};

/**
 * Sortable Item Component (used by dnd-kit)
 */
const SortableGolfCourseItem = ({ course, onRemove, canEdit, i18n, t, paises }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: course.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const colorDelTipo = colorDelTipoDeCampo(course.course_type);
  const teesCount = course.tees?.length || 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-gradient-to-r from-white to-green-50/30 border border-gray-200 rounded-xl overflow-hidden ${
        isDragging ? 'shadow-xl ring-2 ring-primary/20' : 'shadow-sm hover:shadow-md'
      } transition-all duration-200`}
    >
      {/* Mobile Layout (stacked) */}
      <div className="block sm:hidden">
        <div className="p-4">
          {/* Header with drag handle and remove */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {canEdit && (
                <div
                  {...attributes}
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1"
                >
                  <GripVertical className="w-5 h-5" />
                </div>
              )}
              <h4 className="font-bold text-gray-900 leading-tight line-clamp-2">
                {course.name || t('detail.golfCourses.unnamed')}
              </h4>
            </div>
            {canEdit && (
              <button
                onClick={() => onRemove(course.id)}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                aria-label={t('detail.golfCourses.remove', { name: course.name || t('detail.golfCourses.unnamed') })}
                title={t('detail.golfCourses.remove', { name: course.name || t('detail.golfCourses.unnamed') })}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Country */}
          {course.country_code && (
            <div className="flex items-center gap-2 mb-3">
              <CountryFlag countryCode={course.country_code} style={{ width: '20px', height: 'auto' }} />
              <span className="text-sm text-gray-700">
                {nombreDelPais(course.country_code, paises, i18n.language)}
              </span>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2">
            {/* Course Type */}
            <div className={`px-2 py-1.5 rounded-lg border text-center ${colorDelTipo}`}>
              <span className="text-xs font-semibold">
                {etiquetaDelTipoDeCampo(course.course_type, t)}
              </span>
            </div>

            {/* Par */}
            {course.total_par > 0 && (
              <div className="px-2 py-1.5 rounded-lg border bg-purple-50 text-purple-800 border-purple-200 text-center">
                <span className="text-xs font-semibold">
                  {t('detail.golfCourses.par', { count: course.total_par })}
                </span>
              </div>
            )}

            {/* Tees */}
            {teesCount > 0 && (
              <div className="px-2 py-1.5 rounded-lg border bg-orange-50 text-orange-800 border-orange-200 text-center">
                <span className="text-xs font-semibold">{teesCount} {t('detail.golfCourses.tees')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Layout (horizontal) */}
      <div className="hidden sm:flex items-center gap-4 p-4">
        {/* Drag Handle */}
        {canEdit && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1 shrink-0"
          >
            <GripVertical className="w-5 h-5" />
          </div>
        )}

        {/* Country Flag */}
        {course.country_code && (
          <div className="shrink-0">
            <CountryFlag countryCode={course.country_code} style={{ width: '28px', height: 'auto' }} />
          </div>
        )}

        {/* Course Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-900 truncate mb-1">
            {course.name || t('detail.golfCourses.unnamed')}
          </h4>
          {course.country_code && (
            <p className="text-sm text-gray-500 truncate">
              {nombreDelPais(course.country_code, paises, i18n.language)}
            </p>
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Course Type */}
          <div className={`px-3 py-1.5 rounded-lg border ${colorDelTipo}`}>
            <span className="text-xs font-semibold whitespace-nowrap">
              {etiquetaDelTipoDeCampo(course.course_type, t)}
            </span>
          </div>

          {/* Par */}
          {course.total_par > 0 && (
            <div className="px-3 py-1.5 rounded-lg border bg-purple-50 text-purple-800 border-purple-200">
              <span className="text-xs font-semibold whitespace-nowrap">
                {t('detail.golfCourses.par', { count: course.total_par })}
              </span>
            </div>
          )}

          {/* Tees Count */}
          {teesCount > 0 && (
            <div className="px-3 py-1.5 rounded-lg border bg-orange-50 text-orange-800 border-orange-200">
              <span className="text-xs font-semibold whitespace-nowrap">{teesCount} {t('detail.golfCourses.tees')}</span>
            </div>
          )}
        </div>

        {/* Remove Button */}
        {canEdit && (
          <button
            onClick={() => onRemove(course.id)}
            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors shrink-0"
            aria-label={t('detail.golfCourses.remove', { name: course.name || t('detail.golfCourses.unnamed') })}
            title={t('detail.golfCourses.remove', { name: course.name || t('detail.golfCourses.unnamed') })}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Un campo sin coordenadas no tiene zona horaria, así que su anotación no
          abre sola (BE #305) y alguien tiene que pulsar START, con cobertura. Se
          dice aquí para que se sepa ANTES de conducir hasta un campo sin señal.
          Va fuera de las dos variantes —móvil y escritorio— para decirlo una vez */}
      {hayQueArrancarloAMano(course) && (
        <div
          data-testid={`arranque-a-mano-${course.id}`}
          className="mx-4 mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3"
        >
          <p className="text-sm font-medium text-amber-900">
            {t('detail.golfCourses.manualStart.title')}
          </p>
          <p className="mt-1 text-sm text-amber-800">
            {t('detail.golfCourses.manualStart.body')}
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Competition Golf Courses Section Component
 *
 * Features:
 * - Display golf courses ordered by display_order
 * - Drag & drop reordering (only in DRAFT status for creators)
 * - Add new golf courses (until the competition is over, for creators)
 * - Remove golf courses (only while enrollment is open, for creators)
 * - Tells the page when the server confirms a change, so the agenda re-reads
 *   its courses (`onCamposCambiados`, FE #715)
 */
const CompetitionGolfCoursesSection = ({ competition, canManage, onCamposCambiados }) => {
  const { t, i18n } = useTranslation('competitions');
  const [golfCourses, setGolfCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  // Los campos cuya alta está viajando. Va en un ref y no en el estado porque se
  // consulta y se apunta en el mismo suspiro, antes de que React vuelva a pintar
  const enVuelo = useRef(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  // El campo que espera un «sí» para quitarse
  const [quitando, setQuitando] = useState(null);

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Los campos se pueden tocar mientras haya inscripciones abiertas (BE #323):
  // quien invita antes de poner el campo —y con ello abre el torneo— tiene que
  // poder ponerlo después, que es justo el caso que motivó el cambio
  const canEdit = canManage && ['DRAFT', 'ACTIVE'].includes(competition.status);

  // Añadir, en cambio, vale hasta que la competición se acaba (FE #713, BE #368):
  // con la agenda propuesta al crear, toda competición Ryder nace con sesiones.
  // Un estado desconocido no lo permite, en vez de romper la sección
  const canAdd =
    canManage &&
    Object.values(CompetitionStatusEnum).includes(competition.status) &&
    new CompetitionStatus(competition.status).allowsAddingGolfCourses();

  // Get compatible countries for the search box
  // Use country code from countries array (competition.location is a display string, not a code)
  const mainCountryCode = competition.countries?.[0]?.code;

  const compatibleCountries = [
    mainCountryCode,
    ...(competition.countries?.slice(1).map(c => c.code) || [])
  ].filter(Boolean);

  // Load golf courses
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
    loadGolfCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competition.id]);

  const loadGolfCourses = async () => {
    setIsLoading(true);
    try {
      const result = await getCompetitionGolfCoursesUseCase.execute(competition.id);

      // Backend returns array with structure: { golf_course_id, display_order, created_at, golf_course: {...} }
      // Flatten the structure for easier access in the UI
      const courses = Array.isArray(result) ? result : (result.golf_courses || []);
      const mappedCourses = courses.map(item => ({
        ...item.golf_course, // Spread golf course data (id, name, country_code, etc.)
        display_order: item.display_order,
        created_at: item.created_at,
        golf_course_id: item.golf_course_id, // Keep reference ID
      }));

      setGolfCourses(mappedCourses);
    } catch (error) {
      console.error('Error loading golf courses:', error);
      customToast.error(t('detail.golfCourses.errorLoading') + ': ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCourse = async (course) => {
    // El buscador ya no lo ofrece, pero la guarda se queda: así el aviso lo da la
    // aplicación con sus palabras, en vez de enseñar el error crudo de la API.
    //
    // Cuenta también los que están EN VUELO: el desplegable se puede volver a
    // abrir mientras la petición viaja, y hasta que no vuelve `loadGolfCourses`
    // la lista no sabe nada del que se acaba de elegir, así que el mismo campo
    // pasaba la guarda dos veces y se mandaba dos veces
    const yaEsta =
      Boolean(course?.id) &&
      (golfCourses.some((gc) => gc.id === course.id) || enVuelo.current.has(course.id));
    if (yaEsta) {
      customToast.info(t('detail.golfCourses.courseAlreadyAdded'));
      return;
    }

    enVuelo.current.add(course.id);
    setIsAdding(true);
    try {
      await addGolfCourseToCompetitionUseCase.execute(competition.id, course.id);
      customToast.success(t('detail.golfCourses.courseAdded'));
      setShowAddForm(false);
      await loadGolfCourses();
      onCamposCambiados?.();
    } catch (error) {
      console.error('Error adding golf course:', error);
      customToast.error(error.message || t('detail.golfCourses.errorAdding'));
    } finally {
      enVuelo.current.delete(course.id);
      setIsAdding(false);
    }
  };

  // Quitar se confirma en el modal de la app, no con `window.confirm` (FE #730)
  const handleRemoveCourse = (courseId) => setQuitando(courseId);
  const campoQueSeQuita = golfCourses.find((c) => c.id === quitando);
  const nombreDelQueSeQuita = campoQueSeQuita?.name || t('detail.golfCourses.unnamed');

  const quitarCampo = async () => {
    const courseId = quitando;
    setQuitando(null);
    try {
      await removeGolfCourseFromCompetitionUseCase.execute(competition.id, courseId);
      customToast.success(t('detail.golfCourses.courseRemoved'));
      await loadGolfCourses();
      onCamposCambiados?.();
    } catch (error) {
      console.error('Error removing golf course:', error);
      customToast.error(error.message || t('detail.golfCourses.errorRemoving'));
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = golfCourses.findIndex((course) => course.id === active.id);
    const newIndex = golfCourses.findIndex((course) => course.id === over.id);

    // Optimistic UI update
    const newOrder = arrayMove(golfCourses, oldIndex, newIndex);
    setGolfCourses(newOrder);

    try {
      // Send new order to backend
      const courseIds = newOrder.map(course => course.id);
      await reorderGolfCoursesUseCase.execute(competition.id, courseIds);
      customToast.success(t('detail.golfCourses.reordered'));
      onCamposCambiados?.();
    } catch (error) {
      console.error('Error reordering golf courses:', error);
      customToast.error(t('detail.golfCourses.errorReordering'));
      // Revert on error
      await loadGolfCourses();
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-center py-8">
            <BlockLoader sinRelleno />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900 font-bold text-lg flex items-center gap-2">
            <Flag className="w-5 h-5 text-green-600" />
            {t('detail.golfCourses.title', { count: golfCourses.length })}
          </h3>
          {canAdd && !showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('detail.golfCourses.addCourse')}
            </button>
          )}
        </div>

        {/* Add Course Form */}
        {showAddForm && (
          <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-900">
                {t('detail.golfCourses.selectCourse')}
              </h4>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-500 hover:text-gray-700"
                disabled={isAdding}
              >
                ✕
              </button>
            </div>
            <GolfCourseSearchBox
              countryCode={compatibleCountries[0] || null}
              selectedCourse={null}
              // Los que ya tiene la competición, para no ofrecerlos otra vez: el
              // backend los rechaza, y sin esto el organizador se comía un error
              // rojo de la API por elegir algo que la propia app le ofrecía (FE #644).
              //
              // Los que están EN VUELO no se pasan aquí: viven en un ref, y leerlo
              // durante el render no está permitido. De esos se encarga la guarda
              // de `handleAddCourse`, que es donde importa: el segundo intento se
              // para antes de salir
              idsYaElegidos={golfCourses.map((gc) => gc.id).filter(Boolean)}
              onCourseSelect={handleAddCourse}
              onRequestNewCourse={() => {
                customToast.info(t('detail.golfCourses.requestNotAvailable'));
              }}
            />
            {isAdding && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <Loader className="w-4 h-4 animate-spin" />
                <span>{t('detail.golfCourses.adding')}</span>
              </div>
            )}
          </div>
        )}

        {/* Golf Courses List */}
        {golfCourses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{t('detail.golfCourses.noCourses')}</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={golfCourses.map(c => c.id)}
              strategy={verticalListSortingStrategy}
              disabled={!canEdit}
            >
              <div className="space-y-2">
                {golfCourses.map((course) => (
                  <SortableGolfCourseItem
                    key={course.id}
                    course={course}
                    onRemove={handleRemoveCourse}
                    canEdit={canEdit}
                    i18n={i18n}
                    t={t}
                    paises={competition.countries}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Helper text for drag & drop */}
        {canEdit && golfCourses.length > 1 && (
          <p className="mt-4 text-xs text-gray-500 text-center">
            {t('detail.golfCourses.dragToReorder')}
          </p>
        )}
      </div>

      <ConfirmModal
        isOpen={quitando !== null}
        // Con sus palabras, no «Confirmar» / «Cancelar» (FE #742)
        title={t('detail.golfCourses.removeDialog.title', { name: nombreDelQueSeQuita })}
        message={t('detail.golfCourses.removeDialog.body')}
        confirmText={t('detail.golfCourses.removeDialog.confirm')}
        cancelText={t('detail.golfCourses.removeDialog.keep')}
        onConfirm={quitarCampo}
        onCancel={() => setQuitando(null)}
        isDestructive
      />
    </div>
  );
};

export default CompetitionGolfCoursesSection;
