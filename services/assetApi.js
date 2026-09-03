import api from './api'

export const assetApi = {
  list: (params) => api.get('/assets', { params }),
  create: (data) => api.post('/assets', data),
  update: (id, data) => api.put(`/assets/${id}`, data),
  delete: (id) => api.delete(`/assets/${id}`),
  assign: (id, employeeId) => api.put(`/assets/${id}/assign`, { employeeId }),
  recover: (id, data) => api.put(`/assets/${id}/recover`, data),
  report: (id, data) => api.put(`/assets/${id}/report`, data),
  listRequests: (params) => api.get('/asset-requests', { params }),
  request: (data) => api.post('/asset-requests', data),
  approveRequest: (id, remarks) => api.put(`/asset-requests/${id}/approve`, { remarks }),
  rejectRequest: (id, remarks) => api.put(`/asset-requests/${id}/reject`, { remarks }),
}
