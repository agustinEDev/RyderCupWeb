import { Edit, UserX, UserCheck, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * AdminUsersTable Component
 * Table of users for the admin panel with role/status pills and row actions.
 */
const AdminUsersTable = ({ users, onEdit, onToggleActive, onManageDelete }) => {
  const { t } = useTranslation('admin');

  if (!users || users.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">{t('users.noResults')}</p>
      </div>
    );
  }

  const initials = (user) =>
    `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[720px]">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('users.columnUser')}</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('users.columnHandicap')}</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('users.columnRole')}</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('users.columnStatus')}</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('users.columnJoined')}</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-700">{t('users.columnActions')}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {initials(user)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4 text-gray-700">{user.handicap ?? '—'}</td>
              <td className="py-3 px-4">
                {user.isAdmin ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                    {t('users.roleAdmin')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-700 border border-primary-200">
                    {t('users.rolePlayer')}
                  </span>
                )}
              </td>
              <td className="py-3 px-4">
                {user.isActive ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                    {t('users.statusActive')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700 border border-gray-300">
                    {t('users.statusInactive')}
                  </span>
                )}
              </td>
              <td className="py-3 px-4 text-gray-500">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onEdit(user)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title={t('users.editTooltip')}
                    aria-label={t('users.editTooltip')}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onToggleActive(user)}
                    className={`p-2 rounded-lg transition-colors ${
                      user.isActive
                        ? 'text-amber-600 hover:bg-amber-50'
                        : 'text-primary-600 hover:bg-primary-50'
                    }`}
                    title={user.isActive ? t('users.deactivateTooltip') : t('users.reactivateTooltip')}
                    aria-label={user.isActive ? t('users.deactivateTooltip') : t('users.reactivateTooltip')}
                  >
                    {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => onManageDelete(user)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title={t('users.deleteTooltip')}
                    aria-label={t('users.deleteTooltip')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminUsersTable;
