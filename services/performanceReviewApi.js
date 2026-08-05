import api from './api'

export const performanceReviewApi = {
  list: (params) => api.get('/performance-reviews', { params }),
  getById: (id) => api.get(`/performance-reviews/${id}`),
  create: (data) => api.post('/performance-reviews', data),
  update: (id, data) => api.put(`/performance-reviews/${id}`, data),
  submit: (id) => api.put(`/performance-reviews/${id}/submit`),
}
