import api from './api'

export const payrollApi = {
  run: (month, year) => api.post('/payroll/run', null, { params: { month, year } }),
  getMonthly: (params) => api.get('/payroll/monthly', { params }),
  getPayslip: (employeeId, params) => api.get(`/payroll/payslip/${employeeId}`, { params }),
  approve: (month, year) => api.post('/payroll/approve', null, { params: { month, year } }),
  getReports: (params) => api.get('/payroll/reports', { params }),
  getSalaryStructure: (employeeId) => api.get(`/payroll/salary-structure/${employeeId}`),
}
