import api from './api'

export const assetApi = {
  list: (params) => api.get('/assets', { params }),
  report: (id, data) => api.put(`/assets/${id}/report`, data),
  listRequests: (params) => api.get('/asset-requests', { params }),
  request: (data) => api.post('/asset-requests', data),
  approveRequest: (id, remarks) => api.put(`/asset-requests/${id}/approve`, { remarks }),
  rejectRequest: (id, remarks) => api.put(`/asset-requests/${id}/reject`, { remarks }),
}
