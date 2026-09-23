import api from './api'

export const companyApi = {
  getProfile: () => api.get('/company/profile'),
  updateProfile: (data) => api.put('/company/profile', data),
  getSubscription: () => api.get('/company/subscription'),
  getModules: () => api.get('/company/modules'),
  getAuditLogs: (params) => api.get('/company/audit-logs', { params }),
  getMailSettings: () => api.get('/company/mail-settings'),
  updateMailSettings: (data) => api.put('/company/mail-settings', data),
  testMailSettings: (to) => api.post('/company/mail-settings/test', { to }),
}
