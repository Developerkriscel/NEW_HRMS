import api from './api'

export const assessmentApi = {
  list: (params) => api.get('/recruitment/assessments', { params }),
  create: (data) => api.post('/recruitment/assessments', data),
  get: (id) => api.get(`/recruitment/assessments/${id}`),
  update: (id, data) => api.patch(`/recruitment/assessments/${id}`, data),

  assign: (applicationId, data) => api.post(`/recruitment/applications/${applicationId}/assign-assessment`, data),
  listForApplication: (applicationId) => api.get(`/recruitment/applications/${applicationId}/assessments`),

  getCandidateAssessment: (id) => api.get(`/recruitment/candidate-assessments/${id}`),
  evaluate: (id, data) => api.post(`/recruitment/candidate-assessments/${id}/evaluate`, data),
}
