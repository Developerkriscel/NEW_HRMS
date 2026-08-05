import api from './api'

export const trainingApi = {
  list: (params) => api.get('/training', { params }),
  create: (data) => api.post('/training', data),
  update: (id, data) => api.put(`/training/${id}`, data),
}
