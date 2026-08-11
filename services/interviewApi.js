import api from './api'

export const interviewApi = {
  list: (params) => api.get('/recruitment/interviews', { params }),
  listForApplication: (applicationId) => api.get(`/recruitment/applications/${applicationId}/interviews`),
  create: (data) => api.post('/recruitment/interviews', data),
  get: (id) => api.get(`/recruitment/interviews/${id}`),
  availability: (params) => api.get('/recruitment/interviews/availability', { params }),

  reschedule: (id, data) => api.post(`/recruitment/interviews/${id}/reschedule`, data),
  cancel: (id, data) => api.post(`/recruitment/interviews/${id}/cancel`, data),
  complete: (id) => api.post(`/recruitment/interviews/${id}/complete`),
  noShow: (id, data) => api.post(`/recruitment/interviews/${id}/no-show`, data),

  submitFeedback: (id, data) => api.post(`/recruitment/interviews/${id}/feedback`, data),
  getPanelFeedback: (id) => api.get(`/recruitment/interviews/${id}/panel-feedback`),

  listScorecardTemplates: () => api.get('/recruitment/interview-scorecard-templates'),
  createScorecardTemplate: (data) => api.post('/recruitment/interview-scorecard-templates', data),
}
