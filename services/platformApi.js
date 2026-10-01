import api from './api'

export const platformApi = {
  // Companies / tenant provisioning
  getTenants: (params) => api.get('/super-admin/tenants', { params, devMock: false }),
  getTenant: (id) => api.get(`/super-admin/tenants/${id}`, { devMock: false }),
  checkCompanyCode: (code) => api.get('/platform/tenants/check-code', { params: { code }, devMock: false }),
  checkSubdomain: (subdomain) => api.get('/platform/tenants/check-subdomain', { params: { subdomain }, devMock: false }),
  checkAdminEmail: (email) => api.get('/platform/tenants/check-admin-email', { params: { email }, devMock: false }),
  provisionTenant: (idempotencyKey, payload, adminPassword) => api.post('/platform/tenants/provision', { idempotencyKey, payload, adminPassword }),
  getProvisioningJobs: (params) => api.get('/platform/tenants/provisioning-jobs', { params, devMock: false }),
  getProvisioningJob: (id) => api.get(`/platform/tenants/provisioning-jobs/${id}`, { devMock: false }),
  retryProvisioningJob: (id) => api.post(`/platform/tenants/provisioning-jobs/${id}/retry`),
  getTenantLifecycle: (id) => api.get(`/platform/tenants/${id}/lifecycle`, { devMock: false }),
  changeTenantStatus: (id, data) => api.post(`/platform/tenants/${id}/lifecycle`, data),
  updateTenantLimits: (id, data) => api.put(`/platform/tenants/${id}/limits`, data),
  getTenantUsage: (id) => api.get(`/platform/tenants/${id}/usage`, { devMock: false }),
  recomputeTenantUsage: (id) => api.post(`/platform/tenants/${id}/usage`),

  // Module catalogue (read-only here — the catalogue is seeded; only the
  // per-plan module mapping below is edited from the UI)
  getModules: () => api.get('/platform/modules', { devMock: false }),
  uploadOnboardingImage: (file, purpose = 'organization-logo') => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('purpose', purpose)
    return api.post('/platform/uploads/images', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  },

  // Plans (list/create/update/archive already in tenantApi's plan.* — these
  // add the module-mapping layer plan CRUD doesn't cover)
  getPlanModules: (planId) => api.get(`/platform/plans/${planId}/modules`, { devMock: false }),
  setPlanModules: (planId, mappings) => api.put(`/platform/plans/${planId}/modules`, { mappings }),

  // Subscriptions
  getSubscriptions: (params) => api.get('/platform/subscriptions', { params, devMock: false }),
  getSubscription: (id) => api.get(`/platform/subscriptions/${id}`, { devMock: false }),
  changeSubscriptionPlan: (id, data) => api.post(`/platform/subscriptions/${id}/plan-change`, data),
  extendTrial: (id, data) => api.post(`/platform/subscriptions/${id}/trial-extension`, data),
  manageGrace: (id, data) => api.post(`/platform/subscriptions/${id}/grace`, data),
  changeSubscriptionStatus: (id, data) => api.post(`/platform/subscriptions/${id}/status`, data),
  getCredits: (subscriptionId) => api.get(`/platform/subscriptions/${subscriptionId}/credits`, { devMock: false }),
  applyCredit: (subscriptionId, data) => api.post(`/platform/subscriptions/${subscriptionId}/credits`, data),
  getInvoices: (subscriptionId) => api.get(`/platform/subscriptions/${subscriptionId}/invoices`, { devMock: false }),
  createInvoice: (subscriptionId, data) => api.post(`/platform/subscriptions/${subscriptionId}/invoices`, data),
  getPayments: (invoiceId) => api.get(`/platform/invoices/${invoiceId}/payments`, { devMock: false }),
  recordPayment: (invoiceId, data) => api.post(`/platform/invoices/${invoiceId}/payments`, data),

  // Company detail tabs
  getTenantPrimaryAdmin: (id) => api.get(`/platform/tenants/${id}/primary-admin`, { devMock: false }),
  resetTenantAdminPassword: (id, reason) => api.post(`/platform/tenants/${id}/primary-admin/reset-password`, { reason }),
  getTenantBilling: (id) => api.get(`/platform/tenants/${id}/billing`, { devMock: false }),
  exportTenantMetadata: (id) => api.get(`/platform/tenants/${id}/export`, { devMock: false }),
}
