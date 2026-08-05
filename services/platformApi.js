import api from './api'

export const platformApi = {
  // Companies / tenant provisioning
  getTenants: (params) => api.get('/super-admin/tenants', { params }),
  getTenant: (id) => api.get(`/super-admin/tenants/${id}`),
  checkCompanyCode: (code) => api.get('/platform/tenants/check-code', { params: { code } }),
  checkSubdomain: (subdomain) => api.get('/platform/tenants/check-subdomain', { params: { subdomain } }),
  checkAdminEmail: (email) => api.get('/platform/tenants/check-admin-email', { params: { email } }),
  provisionTenant: (idempotencyKey, payload) => api.post('/platform/tenants/provision', { idempotencyKey, payload }),
  getProvisioningJobs: (params) => api.get('/platform/tenants/provisioning-jobs', { params }),
  getProvisioningJob: (id) => api.get(`/platform/tenants/provisioning-jobs/${id}`),
  retryProvisioningJob: (id) => api.post(`/platform/tenants/provisioning-jobs/${id}/retry`),
  getTenantLifecycle: (id) => api.get(`/platform/tenants/${id}/lifecycle`),
  changeTenantStatus: (id, data) => api.post(`/platform/tenants/${id}/lifecycle`, data),
  updateTenantLimits: (id, data) => api.put(`/platform/tenants/${id}/limits`, data),
  getTenantUsage: (id) => api.get(`/platform/tenants/${id}/usage`),
  recomputeTenantUsage: (id) => api.post(`/platform/tenants/${id}/usage`),

  // Module catalogue (read-only here — the catalogue is seeded; only the
  // per-plan module mapping below is edited from the UI)
  getModules: () => api.get('/platform/modules'),

  // Plans (list/create/update/archive already in tenantApi's plan.* — these
  // add the module-mapping layer plan CRUD doesn't cover)
  getPlanModules: (planId) => api.get(`/platform/plans/${planId}/modules`),
  setPlanModules: (planId, mappings) => api.put(`/platform/plans/${planId}/modules`, { mappings }),

  // Subscriptions
  getSubscriptions: (params) => api.get('/platform/subscriptions', { params }),
  getSubscription: (id) => api.get(`/platform/subscriptions/${id}`),
  changeSubscriptionPlan: (id, data) => api.post(`/platform/subscriptions/${id}/plan-change`, data),
  extendTrial: (id, data) => api.post(`/platform/subscriptions/${id}/trial-extension`, data),
  manageGrace: (id, data) => api.post(`/platform/subscriptions/${id}/grace`, data),
  changeSubscriptionStatus: (id, data) => api.post(`/platform/subscriptions/${id}/status`, data),
  getCredits: (subscriptionId) => api.get(`/platform/subscriptions/${subscriptionId}/credits`),
  applyCredit: (subscriptionId, data) => api.post(`/platform/subscriptions/${subscriptionId}/credits`, data),
  getInvoices: (subscriptionId) => api.get(`/platform/subscriptions/${subscriptionId}/invoices`),
  createInvoice: (subscriptionId, data) => api.post(`/platform/subscriptions/${subscriptionId}/invoices`, data),
  getPayments: (invoiceId) => api.get(`/platform/invoices/${invoiceId}/payments`),
  recordPayment: (invoiceId, data) => api.post(`/platform/invoices/${invoiceId}/payments`, data),

  // Company detail tabs
  getTenantPrimaryAdmin: (id) => api.get(`/platform/tenants/${id}/primary-admin`),
  resetTenantAdminPassword: (id, reason) => api.post(`/platform/tenants/${id}/primary-admin/reset-password`, { reason }),
  getTenantBilling: (id) => api.get(`/platform/tenants/${id}/billing`),
  exportTenantMetadata: (id) => api.get(`/platform/tenants/${id}/export`),
}
