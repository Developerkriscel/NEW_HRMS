import api from './api'

export const requisitionApi = {
  list: (params) => api.get('/recruitment/requisitions', { params }),
  create: (data) => api.post('/recruitment/requisitions', data),
  get: (id) => api.get(`/recruitment/requisitions/${id}`),
  update: (id, data) => api.patch(`/recruitment/requisitions/${id}`, data),
  submit: (id) => api.post(`/recruitment/requisitions/${id}/submit`),
  approve: (id, comment) => api.post(`/recruitment/requisitions/${id}/approve`, { comment }),
  reject: (id, reason) => api.post(`/recruitment/requisitions/${id}/reject`, { reason }),
  cancel: (id, reason) => api.post(`/recruitment/requisitions/${id}/cancel`, { reason }),
  getEmployees: () => api.get('/recruitment/requisitions/employees'),
}
