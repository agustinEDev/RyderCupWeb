import { Link } from 'react-router';
import {
  Users,
  Calendar,
  CalendarClock,
  MapPin,
  Shield,
  Swords,
} from 'lucide-react';
import { CountryFlag } from '../../ui/CountryFlag';
import {
  getStatusColor,
  formatDateRange,
} from '../../../services/competitions';
import { formatCountryName } from '../../../services/countries';

/**
 * La tarjeta de cabecera de la ficha: nombre (solo en escritorio), estado,
 * visibilidad, la sala de draft para el grupo, fechas, jugadores, apertura
 * programada, organizador y países.
 */
const ResumenDeLaCompeticion = ({
  competition,
  t,
  i18n,
  isCreator,
  canManage,
  approvedCount,
  fechaDeAperturaLegible,
}) => (
  <div className="bg-primary-50 rounded-xl border border-primary-200 p-6 shadow-md">
    <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
      <div className="flex-1">
        <h1 className="hidden md:block text-gray-900 text-3xl md:text-4xl font-bold mb-2">
          {competition.name}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
              competition.status,
            )}`}
          >
            {competition.status && t(`status.${competition.status}`)}
          </span>
          {/* Junto al estado: quien la mira tiene que saber si le
              pueden encontrar o si entra solo quien es invitado (FE #664) */}
          <span
            data-testid="visibilidad-competicion"
            className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700"
          >
            {t(
              competition.visibility === 'PUBLIC'
                ? 'detail.visibilityPublic'
                : 'detail.visibilityPrivate',
            )}
          </span>
          {isCreator && (
            <div className="flex items-center gap-1.5 text-accent text-sm font-medium">
              <Shield className="w-4 h-4" />
              <span>{t('detail.creator')}</span>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* La sala de draft, para TODO el grupo y no solo para los dos
        capitanes: la gracia es que la ceremonia se vea en directo
        desde el móvil de cada uno (FE #653). Se ofrece cuando ya hay
        a quién elegir y todavía no hay equipos: después la sala ya
        terminó, y los equipos se ven en la agenda.

        A quien organiza no se le repite aquí: para él la sala es el
        siguiente paso y ya la ofrece el botón de arriba (FE #705) */}
    {!canManage &&
      competition.setupMode === 'RYDER_CUP' &&
      competition.status === 'CLOSED' &&
      !competition.teamsAssigned &&
      competition.captains?.teamA &&
      competition.captains?.teamB && (
        <Link
          to={`/competitions/${competition.id}/draft`}
          data-testid="ir-a-la-sala-de-draft"
          className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 font-semibold text-white shadow-md transition-colors hover:bg-green-700"
        >
          <Swords className="w-4 h-4" />
          <span>{t('draft.open')}</span>
        </Link>
      )}

    {/* Quick Stats */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="flex items-center gap-2 text-gray-700">
        <Calendar className="w-5 h-5" />
        <div>
          <p className="text-xs text-gray-500">{t('detail.dates')}</p>
          <p className="text-sm font-medium">
            {formatDateRange(
              competition.startDate,
              competition.endDate,
              i18n.language,
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-gray-700">
        <Users className="w-5 h-5" />
        <div>
          <p className="text-xs text-gray-500">{t('detail.players')}</p>
          <p className="text-sm font-medium">
            {approvedCount} / {competition.maxPlayers || '∞'}
          </p>
        </div>
      </div>
      {/* Para todos, no solo el creador: quien la encuentra al explorar
          ve «Borrador» sin botón y tiene que saber cuándo podrá entrar */}
      {fechaDeAperturaLegible && (
        <div className="flex items-center gap-2 text-gray-700">
          <CalendarClock className="w-5 h-5" />
          <div>
            <p className="text-xs text-gray-500">{t('detail.enrollment')}</p>
            <p
              className="text-sm font-medium"
              data-testid="apertura-programada"
            >
              {t('detail.enrollmentOpensOn', { fecha: fechaDeAperturaLegible })}
            </p>
          </div>
        </div>
      )}
      {competition.creator && (
        <div className="flex items-center gap-2 text-gray-700">
          <Shield className="w-5 h-5" />
          <div>
            <p className="text-xs text-gray-500">{t('detail.organizedBy')}</p>
            <p className="text-sm font-medium">
              {competition.creator.firstName} {competition.creator.lastName}
            </p>
          </div>
        </div>
      )}
    </div>

    {/* Countries Badges */}
    {competition.countries && competition.countries.length > 0 && (
      <div className="mt-4 pt-4 border-t border-primary-200">
        <div className="flex items-start gap-2">
          <MapPin className="w-5 h-5 text-gray-700 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-2">
              {t('detail.countries')}
            </p>
            <div className="flex flex-wrap gap-2">
              {competition.countries.map((country, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium border border-primary/20"
                >
                  <CountryFlag countryCode={country.code} className="w-5 h-5" />
                  <span>{formatCountryName(country, i18n.language)}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);

export default ResumenDeLaCompeticion;
