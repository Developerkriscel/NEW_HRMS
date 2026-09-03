import api from './api'

export const payrollApi = {
  run: (month, year, employeeIds) => api.post('/payroll/run', { month, year, employeeIds }),
  getEligibility: (month, year) => api.get('/payroll/eligibility', { params: { month, year } }),
  getMonthly: (params) => api.get('/payroll/monthly', { params }),
  getPayslip: (employeeId, params) => api.get(`/payroll/payslip/${employeeId}`, { params }),
  approve: (month, year) => api.post('/payroll/approve', null, { params: { month, year } }),
  updateBulkStatus: (month, year, status) => api.patch('/payroll/bulk-status', { month, year, status }),
  updatePayslipStatus: (id, status) => api.patch(`/payroll/payslip-status/${id}`, { status }),
  downloadPayslipPdf: (payslipId) => api.get(`/payroll/payslip/${payslipId}/pdf`, { responseType: 'blob' }),
  getReports: (params) => api.get('/payroll/reports', { params }),
  getSalaryStructure: (employeeId) => api.get(`/payroll/salary-structure/${employeeId}`),
}
