import api from './api'

export const managerApi = {
  getDashboard: () => api.get('/manager/dashboard'),
  getApprovals: (params) => api.get('/manager/approvals', { params }),
  getReports: (params) => api.get('/manager/reports', { params }),
}
