import api from './api'

// Tenant creation and lifecycle actions (suspend/activate/archive/purge)
// live in services/platformApi.js now — the provisioning wizard and lifecycle
// actions superseded this module's old single-shot create/suspend/activate.
// GET/update and the other tenant-adjacent reads below are unchanged and
// still used by Navbar search and the super-admin dashboard/billing/plans
// pages.
export const tenantApi = {
  getAll: (params) => api.get('/super-admin/tenants', { params }),
  getById: (id) => api.get(`/super-admin/tenants/${id}`),
  update: (id, data) => api.put(`/super-admin/tenants/${id}`, data),
  getUsage: (id) => api.get(`/super-admin/tenants/${id}/usage`),
  getAuditLogs: (id, params) => api.get(`/super-admin/tenants/${id}/audit-logs`, { params }),
  updateFeatures: (id, { features, reason }) => api.put(`/super-admin/tenants/${id}/features`, { features, reason }),
  provisionDatabase: (id) => api.post(`/super-admin/tenants/${id}/database`),
  getDashboard: (params) => api.get('/super-admin/dashboard', { params }),
  getRevenue: (params) => api.get('/super-admin/revenue', { params }),
  getPlans: () => api.get('/super-admin/plans'),
  createPlan: (data) => api.post('/super-admin/plans', data),
  updatePlan: (id, data) => api.put(`/super-admin/plans/${id}`, data),
  deletePlan: (id) => api.delete(`/super-admin/plans/${id}`),
  getAuditLogsGlobal: (params) => api.get('/super-admin/audit-logs', { params }),
}
