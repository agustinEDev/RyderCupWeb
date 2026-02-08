import { Eye, Edit, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import TeeCategoryBadge from './TeeCategoryBadge';
import { CountryFlag } from '../../utils/countryUtils';

/**
 * GolfCourseTable Component
 * Reusable table for displaying golf courses
 */
const GolfCourseTable = ({ courses, onView, onEdit, onApprove, onReject, showActions = true, isAdmin = false }) => {
  const { t } = useTranslation('golfCourses');

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PENDING_APPROVAL':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4" />;
      case 'PENDING_APPROVAL':
        return <AlertCircle className="w-4 h-4" />;
      case 'REJECTED':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (!courses || courses.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">{t('table.noCourses')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('table.name')}</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('table.country')}</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('table.type')}</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('table.par')}</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('table.tees')}</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('table.status')}</th>
            {showActions && <th className="text-right py-3 px-4 font-semibold text-gray-700">{t('table.actions')}</th>}
          </tr>
        </thead>
        <tbody>
          {courses.map((course) => (
            <tr key={course.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4">
                <div>
                  <p className="font-medium text-gray-900">{course.name}</p>
                  {course.isPendingUpdate && (
                    <span className="inline-flex items-center gap-1 mt-1 text-xs text-yellow-700">
                      <AlertCircle className="w-3 h-3" />
                      {t('table.pendingUpdate')}
                    </span>
                  )}
                  {course.isClone() && (
                    <span className="inline-flex items-center gap-1 mt-1 text-xs text-blue-700">
                      <AlertCircle className="w-3 h-3" />
                      {t('table.updateProposal')}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <CountryFlag countryCode={course.countryCode} className="w-5 h-5" />
                  <span className="text-gray-700">{course.countryCode}</span>
                </div>
              </td>
              <td className="py-3 px-4 text-gray-700">{t(`form.courseTypes.${course.courseType}`)}</td>
              <td className="py-3 px-4 font-medium text-gray-900">{course.totalPar}</td>
              <td className="py-3 px-4">
                <div className="flex flex-wrap gap-1">
                  {course.tees.slice(0, 2).map((tee, index) => (
                    <TeeCategoryBadge key={index} category={tee.teeCategory} identifier={tee.identifier} gender={tee.teeGender || tee.tee_gender || tee.gender} />
                  ))}
                  {course.tees.length > 2 && (
                    <span className="text-xs text-gray-500">+{course.tees.length - 2}</span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(course.approvalStatus)}`}>
                  {getStatusIcon(course.approvalStatus)}
                  {t(`table.statuses.${course.approvalStatus}`)}
                </span>
              </td>
              {showActions && (
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-2">
                    {onView && (
                      <button
                        onClick={() => onView(course)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title={t('table.view')}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    {onEdit && isAdmin && (
                      <button
                        onClick={() => onEdit(course)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title={t('table.edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {onApprove && course.isPending() && (
                      <button
                        onClick={() => onApprove(course)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title={t('table.approve')}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    {onReject && course.isPending() && (
                      <button
                        onClick={() => onReject(course)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title={t('table.reject')}
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default GolfCourseTable;
