import api from './api'

export const taskApi = {
  list: (params) => api.get('/tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  assign: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  setStatus: (id, status) => api.put(`/tasks/${id}/status`, { status }),
  addComment: (id, text) => api.post(`/tasks/${id}/comments`, { text }),
}
