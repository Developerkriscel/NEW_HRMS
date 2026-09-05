import api from './api'

export const companyApi = {
  getProfile: () => api.get('/company/profile'),
  updateProfile: (data) => api.put('/company/profile', data),
  getSubscription: () => api.get('/company/subscription'),
  getModules: () => api.get('/company/modules'),
  getAuditLogs: (params) => api.get('/company/audit-logs', { params }),
}
