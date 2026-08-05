import api from './api'

export const rosterApi = {
  get: (params) => api.get('/rosters', { params }),
  save: (data) => api.post('/rosters', data),
  assignShift: (employeeId, shiftId) => api.put(`/employees/${employeeId}/shift`, { shiftId }),
}
