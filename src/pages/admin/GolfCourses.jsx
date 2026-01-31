import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import customToast from '../../utils/toast';
import HeaderAuth from '../../components/layout/HeaderAuth';
import { useAuth } from '../../hooks/useAuth';
import GolfCourseTable from '../../components/golf_course/GolfCourseTable';
import GolfCourseForm from '../../components/golf_course/GolfCourseForm';
import {
  listGolfCoursesUseCase,
  createGolfCourseAdminUseCase,
  updateGolfCourseUseCase,
} from '../../composition';

/**
 * GolfCourses Page (Admin)
 * Lists all APPROVED golf courses
 * Admin can create new courses (directly APPROVED) and edit existing ones
 */
const GolfCourses = () => {
  const { t } = useTranslation('golfCourses');
  const { user, loading: isLoadingUser } = useAuth();

  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Derive isAdmin from authenticated user's roles
  const isAdmin = user?.roles?.some(role =>
    typeof role === 'string' ? role === 'ADMIN' : role.name === 'ADMIN'
  ) || false;

  // Load approved courses
  const loadCourses = async () => {
    setIsLoading(true);
    try {
      const data = await listGolfCoursesUseCase.execute({ approvalStatus: 'APPROVED' });
      setCourses(data);
    } catch (error) {
      console.error('Error loading golf courses:', error);
      customToast.error(error.message || t('pages.admin.errorLoading'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadCourses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Handle create
  const handleCreate = async (formData) => {
    try {
      await createGolfCourseAdminUseCase.execute(formData);
      customToast.success(t('pages.admin.createSuccess'));
      setShowCreateModal(false);
      await loadCourses();
    } catch (error) {
      console.error('Error creating golf course:', error);
      throw error; // Let form handle the error
    }
  };

  // Handle edit
  const handleEdit = async (formData) => {
    if (!selectedCourse) return;

    try {
      await updateGolfCourseUseCase.execute(selectedCourse.id, formData);

      // Admin updates in-place, no clone created
      customToast.success(t('pages.admin.updateSuccess'));
      setShowEditModal(false);
      setSelectedCourse(null);
      await loadCourses();
    } catch (error) {
      console.error('Error updating golf course:', error);
      throw error; // Let form handle the error
    }
  };

  // Handle view
  const handleView = (course) => {
    setSelectedCourse(course);
    // TODO: Implement detail modal
    customToast.info(t('pages.admin.viewNotImplemented'));
  };

  // Open edit modal
  const handleOpenEdit = (course) => {
    setSelectedCourse(course);
    setShowEditModal(true);
  };

  if (isLoadingUser || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-white">
      <div className="layout-container flex h-full grow flex-col">
        <HeaderAuth user={user} />

        <div className="px-4 md:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[1200px] flex-1">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-wrap justify-between items-center gap-3 p-4"
            >
              <div>
                <h1 className="text-gray-900 tracking-tight text-3xl md:text-[32px] font-bold leading-tight">
                  {t('pages.admin.title')}
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  {t('pages.admin.subtitle')}
                </p>
              </div>
              <motion.button
                onClick={() => setShowCreateModal(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>{t('pages.admin.createCourse')}</span>
              </motion.button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-4"
            >
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  {t('pages.admin.totalCourses')}: <span className="font-bold text-gray-900">{courses.length}</span>
                </p>
              </div>
            </motion.div>

            {/* Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-4"
            >
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <GolfCourseTable
                  courses={courses}
                  onView={handleView}
                  onEdit={handleOpenEdit}
                  isAdmin={isAdmin}
                  showActions={true}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">{t('pages.admin.createCourseTitle')}</h2>
            </div>
            <div className="p-6">
              <GolfCourseForm
                onSubmit={handleCreate}
                onCancel={() => setShowCreateModal(false)}
                isAdmin={isAdmin}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">{t('pages.admin.editCourseTitle')}</h2>
            </div>
            <div className="p-6">
              <GolfCourseForm
                initialData={selectedCourse}
                onSubmit={handleEdit}
                onCancel={() => {
                  setShowEditModal(false);
                  setSelectedCourse(null);
                }}
                isAdmin={isAdmin}
              />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default GolfCourses;
