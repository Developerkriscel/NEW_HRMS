import api from './api'

export const notificationApi = {
  list: (config = {}) => api.get('/notifications', { timeout: 15000, ...config }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: (syntheticIds = []) => api.post('/notifications/mark-all-read', { syntheticIds }),
  delete: (id) => api.delete(`/notifications/${id}`),
  create: (data) => api.post('/notifications', data),
}
