import IInvitationRepository from '../../domain/repositories/IInvitationRepository';
import InvitationMapper from '../mappers/InvitationMapper';
import apiRequest from '../../services/api.js';

/**
 * ApiInvitationRepository - REST API implementation
 *
 * Endpoints:
 * - POST   /api/v1/competitions/{id}/invitations
 * - POST   /api/v1/competitions/{id}/invitations/by-email
 * - GET    /api/v1/invitations/me
 * - POST   /api/v1/invitations/{id}/respond
 * - GET    /api/v1/competitions/{id}/invitations
 */
class ApiInvitationRepository extends IInvitationRepository {
  constructor() {
    super();
  }

  #buildQueryString(filters) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }

  async sendInvitation(competitionId, inviteeUserId, personalMessage = null) {
    const payload = {
      invitee_user_id: inviteeUserId,
    };
    if (personalMessage) {
      payload.personal_message = personalMessage;
    }

    const apiData = await apiRequest(
      `/api/v1/competitions/${competitionId}/invitations`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    const invitation = InvitationMapper.toDomain(apiData);
    invitation._apiData = apiData;
    return invitation;
  }

  async sendInvitationByEmail(competitionId, inviteeEmail, personalMessage = null) {
    const payload = {
      invitee_email: inviteeEmail,
    };
    if (personalMessage) {
      payload.personal_message = personalMessage;
    }

    const apiData = await apiRequest(
      `/api/v1/competitions/${competitionId}/invitations/by-email`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    const invitation = InvitationMapper.toDomain(apiData);
    invitation._apiData = apiData;
    return invitation;
  }

  async getMyInvitations(filters = {}) {
    const apiFilters = {};
    if (filters.status) apiFilters.status = filters.status;
    if (filters.page) apiFilters.page = filters.page;
    if (filters.limit) apiFilters.limit = filters.limit;

    const queryString = this.#buildQueryString(apiFilters);
    const response = await apiRequest(`/api/v1/invitations/me${queryString}`);

    const apiDataArray = response.invitations || [];
    const invitations = InvitationMapper.toDomainMany(apiDataArray);

    invitations.forEach((invitation, index) => {
      invitation._apiData = apiDataArray[index];
    });

    return {
      invitations,
      totalCount: response.total_count || 0,
    };
  }

  async respondToInvitation(invitationId, action) {
    const apiData = await apiRequest(
      `/api/v1/invitations/${invitationId}/respond`,
      {
        method: 'POST',
        body: JSON.stringify({ action }),
      }
    );

    const invitation = InvitationMapper.toDomain(apiData);
    invitation._apiData = apiData;
    return invitation;
  }

  async getCompetitionInvitations(competitionId, filters = {}) {
    const apiFilters = {};
    if (filters.status) apiFilters.status = filters.status;
    if (filters.page) apiFilters.page = filters.page;
    if (filters.limit) apiFilters.limit = filters.limit;

    const queryString = this.#buildQueryString(apiFilters);
    const response = await apiRequest(
      `/api/v1/competitions/${competitionId}/invitations${queryString}`
    );

    const apiDataArray = response.invitations || [];
    const invitations = InvitationMapper.toDomainMany(apiDataArray);

    invitations.forEach((invitation, index) => {
      invitation._apiData = apiDataArray[index];
    });

    return {
      invitations,
      totalCount: response.total_count || 0,
    };
  }
}

export default ApiInvitationRepository;
