import api from './api'

export const helpdeskApi = {
  list: (params) => api.get('/helpdesk', { params }),
  getById: (id) => api.get(`/helpdesk/${id}`),
  raise: (data) => api.post('/helpdesk', data),
  addComment: (id, text) => api.post(`/helpdesk/${id}/comments`, { text }),
  setStatus: (id, status) => api.put(`/helpdesk/${id}/status`, { status }),
}
