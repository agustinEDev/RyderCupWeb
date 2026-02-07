import { useState, useEffect } from 'react';
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

/**
 * Get course type display info
 */
const getCourseTypeInfo = (courseType) => {
  switch (courseType) {
    case 'STANDARD_18':
      return { label: '18 Holes', color: 'bg-green-100 text-green-800 border-green-200' };
    case 'PITCH_AND_PUTT':
      return { label: 'Pitch & Putt', color: 'bg-amber-100 text-amber-800 border-amber-200' };
    case 'EXECUTIVE':
      return { label: 'Executive', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    default:
      return { label: courseType, color: 'bg-gray-100 text-gray-800 border-gray-200' };
  }
};

/**
 * Sortable Item Component (used by dnd-kit)
 */
const SortableGolfCourseItem = ({ course, onRemove, canEdit, i18n, t }) => {
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

  const courseTypeInfo = getCourseTypeInfo(course.course_type);
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
                {course.name || `Golf Course`}
              </h4>
            </div>
            {canEdit && (
              <button
                onClick={() => onRemove(course.id)}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                title="Remove golf course"
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
                {formatCountryName({ code: course.country_code, name_en: course.country_name }, i18n.language)}
              </span>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2">
            {/* Course Type */}
            <div className={`px-2 py-1.5 rounded-lg border text-center ${courseTypeInfo.color}`}>
              <span className="text-xs font-semibold">{courseTypeInfo.label}</span>
            </div>

            {/* Par */}
            {course.total_par > 0 && (
              <div className="px-2 py-1.5 rounded-lg border bg-purple-50 text-purple-800 border-purple-200 text-center">
                <span className="text-xs font-semibold">Par {course.total_par}</span>
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
            {course.name || `Golf Course`}
          </h4>
          {course.country_code && (
            <p className="text-sm text-gray-500 truncate">
              {formatCountryName({ code: course.country_code, name_en: course.country_name }, i18n.language)}
            </p>
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Course Type */}
          <div className={`px-3 py-1.5 rounded-lg border ${courseTypeInfo.color}`}>
            <span className="text-xs font-semibold whitespace-nowrap">{courseTypeInfo.label}</span>
          </div>

          {/* Par */}
          {course.total_par > 0 && (
            <div className="px-3 py-1.5 rounded-lg border bg-purple-50 text-purple-800 border-purple-200">
              <span className="text-xs font-semibold whitespace-nowrap">Par {course.total_par}</span>
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
            title="Remove golf course"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Competition Golf Courses Section Component
 *
 * Features:
 * - Display golf courses ordered by display_order
 * - Drag & drop reordering (only in DRAFT status for creators)
 * - Add new golf courses (only in DRAFT status for creators)
 * - Remove golf courses (only in DRAFT status for creators)
 */
const CompetitionGolfCoursesSection = ({ competition, canManage }) => {
  const { t, i18n } = useTranslation('competitions');
  const [golfCourses, setGolfCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const canEdit = canManage && competition.status === 'DRAFT';

  // Get compatible countries for the search box
  // Use country code from countries array (competition.location is a display string, not a code)
  const mainCountryCode = competition.countries?.[0]?.code;
  const compatibleCountries = [
    mainCountryCode,
    ...(competition.countries?.slice(1).map(c => c.code) || [])
  ].filter(Boolean);

  // Load golf courses
  useEffect(() => {
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
    setIsAdding(true);
    try {
      await addGolfCourseToCompetitionUseCase.execute(competition.id, course.id);
      customToast.success(t('detail.golfCourses.courseAdded'));
      setShowAddForm(false);
      await loadGolfCourses();
    } catch (error) {
      console.error('Error adding golf course:', error);
      customToast.error(error.message || t('detail.golfCourses.errorAdding'));
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveCourse = async (courseId) => {
    if (!window.confirm(t('detail.golfCourses.confirmRemove'))) {
      return;
    }

    try {
      await removeGolfCourseFromCompetitionUseCase.execute(competition.id, courseId);
      customToast.success(t('detail.golfCourses.courseRemoved'));
      await loadGolfCourses();
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
            <Loader className="w-8 h-8 text-primary animate-spin" />
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
          {canEdit && !showAddForm && (
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
    </div>
  );
};

export default CompetitionGolfCoursesSection;
