import api from './api'

export const companyApi = {
  getProfile: () => api.get('/company/profile'),
  updateProfile: (data) => api.put('/company/profile', data),
  getAuditLogs: (params) => api.get('/company/audit-logs', { params }),
}
