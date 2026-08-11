import api from './api'

// Step 13/14 — Offer Letter Generation, Approval, Send/Extend/Withdraw.
export const offerApi = {
  list: (params) => api.get('/recruitment/offers', { params }),
  getForApplication: (applicationId) => api.get(`/recruitment/applications/${applicationId}/offers`),
  generate: (applicationId, data) => api.post(`/recruitment/applications/${applicationId}/offers`, data),
  get: (offerId) => api.get(`/recruitment/offers/${offerId}`),
  update: (offerId, data) => api.patch(`/recruitment/offers/${offerId}`, data),
  submit: (offerId) => api.post(`/recruitment/offers/${offerId}/submit`),
  approve: (offerId, comment) => api.post(`/recruitment/offers/${offerId}/approve`, { comment }),
  reject: (offerId, reason) => api.post(`/recruitment/offers/${offerId}/reject`, { reason }),
  requestRevision: (offerId, comment) => api.post(`/recruitment/offers/${offerId}/request-revision`, { comment }),
  generatePdf: (offerId) => api.post(`/recruitment/offers/${offerId}/generate-pdf`),

  send: (offerId) => api.post(`/recruitment/offers/${offerId}/send`),
  extendExpiry: (offerId, expiresAt) => api.post(`/recruitment/offers/${offerId}/extend-expiry`, { expiresAt }),
  withdraw: (offerId, reason) => api.post(`/recruitment/offers/${offerId}/withdraw`, { reason }),

  listTemplates: () => api.get('/recruitment/offer-templates'),
  getTemplate: (id) => api.get(`/recruitment/offer-templates/${id}`),
  createTemplate: (data) => api.post('/recruitment/offer-templates', data),
  updateTemplate: (id, data) => api.patch(`/recruitment/offer-templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/recruitment/offer-templates/${id}`),
}
