import api from './api'

export const kraApi = {
  list: (params) => api.get('/kra', { params }),
  getById: (id) => api.get(`/kra/${id}`),
  assign: (data) => api.post('/kra', data),
  update: (id, data) => api.put(`/kra/${id}`, data),
  updateProgress: (id, data) => api.post(`/kra/${id}/update-progress`, data),
  review: (id, data) => api.put(`/kra/${id}/review`, data),
}
