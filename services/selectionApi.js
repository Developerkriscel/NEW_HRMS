import api from './api'

// Step 11 — Final Selection & Hiring Decision.
export const selectionApi = {
  list: (params) => api.get('/recruitment/selections', { params }),
  getSummary: (applicationId) => api.get(`/recruitment/applications/${applicationId}/selection`),

  select: (applicationId, data) => api.post(`/recruitment/applications/${applicationId}/select`, data),
  additionalRound: (applicationId, data) => api.post(`/recruitment/applications/${applicationId}/additional-round`, data),
  hold: (applicationId, data) => api.post(`/recruitment/applications/${applicationId}/hold`, data),
  reject: (applicationId, data) => api.post(`/recruitment/applications/${applicationId}/reject`, data),

  approve: (decisionId, comment) => api.post(`/recruitment/selections/${decisionId}/approve`, { comment }),
  rejectApproval: (decisionId, comment) => api.post(`/recruitment/selections/${decisionId}/reject-approval`, { comment }),

  compare: (applicationIds) => api.get('/recruitment/applications/compare', { params: { ids: applicationIds.join(',') } }),

  getSettings: () => api.get('/recruitment/settings'),
  updateSettings: (data) => api.patch('/recruitment/settings', data),
}
