import api from './api'

export const assetSubscriptionApi = {
  list: (params) => api.get('/asset-subscriptions', { params }),
  create: (data) => api.post('/asset-subscriptions', data),
  update: (id, data) => api.patch(`/asset-subscriptions/${id}`, data),
  delete: (id) => api.delete(`/asset-subscriptions/${id}`),
}
