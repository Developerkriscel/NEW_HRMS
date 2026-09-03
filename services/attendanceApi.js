import api from './api'

export const attendanceApi = {
  checkIn: (data) => api.post('/attendance/check-in', data),
  checkOut: (data) => api.post('/attendance/check-out', data),
  getMyAttendance: (params) => api.get('/attendance/my-attendance', { params }),
  getTeamAttendance: (params) => api.get('/attendance/team', { params }),
  getAll: (params) => api.get('/attendance', { params }),
  getTodayStatus: () => api.get('/attendance/today'),
  startBreak: () => api.post('/attendance/break', { action: 'start' }),
  endBreak: () => api.post('/attendance/break', { action: 'end' }),
  applyRegularization: (data) => api.post('/attendance/regularization', data),
  getPendingRegularizations: () => api.get('/attendance/regularization/pending'),
  approveRegularization: (id) => api.put(`/attendance/regularization/${id}/approve`),
  rejectRegularization: (id, reason) => api.put(`/attendance/regularization/${id}/reject`, null, { params: { reason } }),
  getMonthlyReport: (params) => api.get('/attendance/monthly-report', { params }),
}
