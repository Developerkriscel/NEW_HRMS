import api from './api'

export const reportsApi = {
  getOverview: (params) => api.get('/super-admin/reports/overview', { params }),
  getRevenueTrend: (params) => api.get('/super-admin/reports/revenue-trend', { params }),
  getRevenueByCompany: (params) => api.get('/super-admin/reports/revenue-by-company', { params }),
  getRevenueByPlan: (params) => api.get('/super-admin/reports/revenue-by-plan', { params }),
  getPayments: (params) => api.get('/super-admin/reports/payments', { params }),
}
