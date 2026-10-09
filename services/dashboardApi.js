import api from './api'

export const dashboardApi = {
  getHrSummary: (params) => api.get('/hr/dashboard', { params }),
}
