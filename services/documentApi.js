import api from './api'

export const documentApi = {
  list: (params) => api.get('/documents', { params }),
  create: (data) => api.post('/documents', data),
  upload: (formData) => api.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/documents/${id}`, data),
  remove: (id) => api.delete(`/documents/${id}`),
}
