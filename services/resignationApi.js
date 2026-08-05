import api from './api'

export const resignationApi = {
  list: (params) => api.get('/resignations', { params }),
  getById: (id) => api.get(`/resignations/${id}`),
  submit: (data) => api.post('/resignations', data),
  update: (id, data) => api.put(`/resignations/${id}`, data),
  forward: (id) => api.put(`/resignations/${id}/forward`),
}
