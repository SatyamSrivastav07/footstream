import api from '../../api/client.js';

export const tournamentApi = {
  listHosted: (params) => api.get('/team/hosted-tournaments', { params }),
  createHosted: (payload) => api.post('/team/hosted-tournaments', payload),
  getHosted: (id) => api.get(`/team/hosted-tournaments/${id}`),
  updateHosted: (id, payload) => api.patch(`/team/hosted-tournaments/${id}`, payload),
  deleteHosted: (id) => api.delete(`/team/hosted-tournaments/${id}`),
  submit: (id) => api.post(`/team/hosted-tournaments/${id}/submit-for-approval`),
  resubmit: (id) => api.post(`/team/hosted-tournaments/${id}/resubmit`),
  publish: (id) => api.patch(`/team/hosted-tournaments/${id}/publish`),
  unpublish: (id) => api.patch(`/team/hosted-tournaments/${id}/unpublish`),
  history: (id) => api.get(`/team/hosted-tournaments/${id}/review-history`),
  participants: (id) => api.get(`/team/hosted-tournaments/${id}/participants`),
  addRegistered: (id, payload) => api.post(`/team/hosted-tournaments/${id}/participants/registered`, payload),
  addExternal: (id, payload) => api.post(`/team/hosted-tournaments/${id}/participants/external`, payload),
  addIntra: (id, payload) => api.post(`/team/hosted-tournaments/${id}/participants/intra`, payload),
  updateParticipant: (id, participantId, payload) => api.patch(`/team/hosted-tournaments/${id}/participants/${participantId}`, payload),
  removeParticipant: (id, participantId) => api.delete(`/team/hosted-tournaments/${id}/participants/${participantId}`),
  availableTeams: (id, params) => api.get(`/team/hosted-tournaments/${id}/available-teams`, { params }),
  listAdmin: (params) => api.get('/admin/tournaments', { params }),
  getAdmin: (id) => api.get(`/admin/tournaments/${id}`),
  adminHistory: (id) => api.get(`/admin/tournaments/${id}/review-history`),
  approve: (id) => api.patch(`/admin/tournaments/${id}/approve`, {}),
  reject: (id, reason) => api.patch(`/admin/tournaments/${id}/reject`, { reason }),
  requestChanges: (id, message) => api.patch(`/admin/tournaments/${id}/request-changes`, { message }),
  suspend: (id, reason) => api.patch(`/admin/tournaments/${id}/suspend`, { reason }),
  archive: (id, reason) => api.patch(`/admin/tournaments/${id}/archive`, { reason }),
  listPublic: (params) => api.get('/public/tournaments', { params }),
  getPublic: (slug) => api.get(`/public/tournaments/${slug}`),
};

export const unwrapData = (response) => response.data.data;
