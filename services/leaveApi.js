import api from './api'

export const leaveApi = {
  apply: (data) => api.post('/leaves/apply', data),
  getMyLeaves: (params) => api.get('/leaves/my-leaves', { params }),
  getPendingApprovals: (params) => api.get('/leaves/pending-approval', { params }),
  getById: (id) => api.get(`/leaves/${id}`),
  approve: (id, remarks) => api.put(`/leaves/${id}/approve`, null, { params: { remarks } }),
  reject: (id, reason) => api.put(`/leaves/${id}/reject`, null, { params: { reason } }),
  cancel: (id) => api.put(`/leaves/${id}/cancel`),
  getBalance: () => api.get('/leaves/balance'),
  getTypes: () => api.get('/leaves/types'),
  createType: (data) => api.post('/leaves/types', data),
  updateType: (id, data) => api.put(`/leaves/types/${id}`, data),
  getHolidays: (params) => api.get('/leaves/holidays', { params }),
  createHoliday: (data) => api.post('/leaves/holidays', data),
  getCalendar: (params) => api.get('/leaves/calendar', { params }),
  getReports: (params) => api.get('/leaves/reports', { params }),
}
