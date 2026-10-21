import { useState } from 'react';
import { Edit, UserX, UserCheck, Trash2, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FichaDeFila from './FichaDeFila';
import { formatoDeIndice } from '../../utils/formatoDeHandicap';

const PILDORA = 'inline-flex flex-shrink-0 items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border';
const PILDORA_ADMIN = `${PILDORA} bg-amber-100 text-amber-800 border-amber-200`;
const PILDORA_INACTIVA = `${PILDORA} bg-gray-200 text-gray-700 border-gray-300`;

/**
 * AdminUsersTable Component
 * Table of users for the admin panel with role/status pills and row actions.
 * En el móvil, filas a todo el ancho y una ficha por usuario con sus datos y
 * sus acciones (17 oct 2026, entrega 5): la tabla pedía scroll lateral.
 */
const AdminUsersTable = ({ users, onEdit, onToggleActive, onManageDelete }) => {
  const { t, i18n } = useTranslation('admin');
  // Por id, no una copia: si la lista cambia con la ficha abierta, enseña lo de
  // ahora, y si el usuario ya no está se cierra
  const [idAbierto, setIdAbierto] = useState(null);
  const abierto = users?.find((u) => u.id === idAbierto) ?? null;

  if (!users || users.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">{t('users.noResults')}</p>
      </div>
    );
  }

  const initials = (user) =>
    `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  const fecha = (valor) => new Date(valor).toLocaleDateString(i18n.language);
  // Se cierra la ficha y se hace lo de siempre: lo que abre cada acción es otro modal
  const desdeLaFicha = (accion) => () => {
    setIdAbierto(null);
    accion(abierto);
  };

  return (
    <>
    <ul aria-label={t('users.listLabel')} className="md:hidden divide-y divide-gray-100">
      {users.map((user) => (
        <li key={user.id}>
          <button
            type="button"
            onClick={() => setIdAbierto(user.id)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
          >
            <span className="block min-w-0 flex-1">
              <span className="block font-semibold text-gray-900 truncate">
                {user.firstName} {user.lastName}
                {user.alias && <span className="ml-2 font-normal text-gray-500">«{user.alias}»</span>}
              </span>
              <span className="block text-xs text-gray-500 truncate">{user.email}</span>
            </span>
            {user.isAdmin && <span className={PILDORA_ADMIN}>{t('users.roleAdmin')}</span>}
            {!user.isActive && <span className={PILDORA_INACTIVA}>{t('users.statusInactive')}</span>}
            <ChevronRight aria-hidden="true" className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </button>
        </li>
      ))}
    </ul>
    {abierto && (
      <FichaDeFila
        titulo={`${abierto.firstName} ${abierto.lastName}${abierto.alias ? ` «${abierto.alias}»` : ''}`}
        subtitulo={abierto.email}
        datos={[
          { etiqueta: t('users.columnHandicap'), valor: formatoDeIndice(abierto.handicap) ?? '—' },
          { etiqueta: t('users.columnRole'), valor: abierto.isAdmin ? t('users.roleAdmin') : t('users.rolePlayer') },
          { etiqueta: t('users.columnStatus'), valor: abierto.isActive ? t('users.statusActive') : t('users.statusInactive') },
          { etiqueta: t('users.filterVerified'), valor: abierto.emailVerified ? t('users.filterVerifiedYes') : t('users.filterVerifiedNo') },
          { etiqueta: t('users.columnJoined'), valor: abierto.createdAt ? fecha(abierto.createdAt) : '—' },
          { etiqueta: t('users.columnLastLogin'), valor: abierto.lastLoginAt ? fecha(abierto.lastLoginAt) : t('users.lastLoginNever') },
        ]}
        onClose={() => setIdAbierto(null)}
      >
        <button type="button" onClick={desdeLaFicha(onEdit)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
          <Edit aria-hidden="true" className="w-4 h-4" />
          {t('users.editTooltip')}
        </button>
        <button type="button" onClick={desdeLaFicha(onToggleActive)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-50">
          {abierto.isActive ? <UserX aria-hidden="true" className="w-4 h-4" /> : <UserCheck aria-hidden="true" className="w-4 h-4" />}
          {abierto.isActive ? t('users.deactivateTooltip') : t('users.reactivateTooltip')}
        </button>
        <button type="button" onClick={desdeLaFicha(onManageDelete)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
          <Trash2 aria-hidden="true" className="w-4 h-4" />
          {t('users.deleteTooltip')}
        </button>
      </FichaDeFila>
    )}
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-sm min-w-[720px]">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('users.columnUser')}</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('users.columnHandicap')}</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('users.columnRole')}</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('users.columnStatus')}</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('users.columnJoined')}</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">{t('users.columnLastLogin')}</th>
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
                    <p className="font-semibold text-gray-900 truncate">
                      {user.firstName} {user.lastName}
                      {user.alias && (
                        /* El alias va detrás y en gris: aquí manda el nombre
                           legal, pero el listado se puede buscar por apodo y
                           hay que ver por qué ha salido esta fila */
                        <span className="ml-2 font-normal text-gray-500">«{user.alias}»</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4 text-gray-700">{formatoDeIndice(user.handicap) ?? '—'}</td>
              <td className="py-3 px-4">
                {user.isAdmin ? (
                  <span className={PILDORA_ADMIN}>
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
                  <span className={PILDORA_INACTIVA}>
                    {t('users.statusInactive')}
                  </span>
                )}
              </td>
              <td className="py-3 px-4 text-gray-500">
                {user.createdAt ? fecha(user.createdAt) : '—'}
              </td>
              <td className="py-3 px-4 text-gray-500">
                {user.lastLoginAt ? fecha(user.lastLoginAt) : t('users.lastLoginNever')}
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
    </>
  );
};

export default AdminUsersTable;
