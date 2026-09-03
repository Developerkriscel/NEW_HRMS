import api from './api'

export const dashboardApi = {
  getHrSummary: () => api.get('/hr/dashboard'),
}
