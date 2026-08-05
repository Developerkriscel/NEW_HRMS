import api from './api'

export const announcementApi = {
  list: (params) => api.get('/announcements', { params }),
  create: (data) => api.post('/announcements', data),
}
