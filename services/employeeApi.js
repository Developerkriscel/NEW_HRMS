import api from './api'

export const employeeApi = {
  getAll: (params) => api.get('/employees', { params }),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  bulkImport: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/employees/bulk-import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  getTimeline: (id) => api.get(`/employees/${id}/timeline`),
  getAssets: (id) => api.get(`/employees/${id}/assets`),
  getPayslips: (id) => api.get(`/employees/${id}/payslips`),
  downloadPayslipPdf: (payslipId) => api.get(`/payroll/payslip/${payslipId}/pdf`, { responseType: 'blob' }),
  getLeaveBalance: (id) => api.get(`/employees/${id}/leave-balance`),
  resetPassword: (id, reason) => api.post(`/employees/${id}/reset-password`, { reason }),
  updatePermissions: (id, permissionIds) => api.put(`/employees/${id}/permissions`, { permissionIds }),
  getReports: (params) => api.get('/employees/reports', { params }),
}

export const permissionApi = {
  getAll: () => api.get('/permissions'),
}
