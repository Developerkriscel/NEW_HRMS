import api from './api'

export const teamRequestApi = {
  list: (params) => api.get('/team-requests', { params }),
  submit: (data) => api.post('/team-requests', data),
  approve: (id, remarks) => api.put(`/team-requests/${id}/approve`, { remarks }),
  reject: (id, remarks) => api.put(`/team-requests/${id}/reject`, { remarks }),
}
