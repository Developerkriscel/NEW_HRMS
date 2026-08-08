import api from './api'

export const candidateApi = {
  list: (params) => api.get('/recruitment/candidates', { params }),
  get: (id) => api.get(`/recruitment/candidates/${id}`),
  update: (id, data) => api.patch(`/recruitment/candidates/${id}`, data),
  addNote: (id, note) => api.post(`/recruitment/candidates/${id}/notes`, { note }),

  getApplication: (id) => api.get(`/recruitment/applications/${id}`),
  moveStage: (id, stageId) => api.post(`/recruitment/applications/${id}/stage`, { stageId }),
  addApplicationNote: (id, note) => api.post(`/recruitment/applications/${id}/notes`, { note }),
}
