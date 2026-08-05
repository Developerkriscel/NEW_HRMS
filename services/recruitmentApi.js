import api from './api'

export const recruitmentApi = {
  list: (params) => api.get('/recruitment', { params }),
  create: (data) => api.post('/recruitment', data),
  update: (id, data) => api.put(`/recruitment/${id}`, data),
}
