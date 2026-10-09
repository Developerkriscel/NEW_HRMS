import api from './api'

export const employeeDashboardApi = {
  get: () => api.get('/employee/dashboard', { skipCache: true }),
}
