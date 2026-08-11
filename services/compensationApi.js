import api from './api'

// Step 12 — Compensation Proposal & Approval.
export const compensationApi = {
  list: (params) => api.get('/recruitment/compensation', { params }),
  getForApplication: (applicationId) => api.get(`/recruitment/applications/${applicationId}/compensation`),
  propose: (applicationId, data) => api.post(`/recruitment/applications/${applicationId}/compensation`, data),
  update: (proposalId, data) => api.patch(`/recruitment/compensation/${proposalId}`, data),
  submit: (proposalId) => api.post(`/recruitment/compensation/${proposalId}/submit`),
  approve: (proposalId, comment) => api.post(`/recruitment/compensation/${proposalId}/approve`, { comment }),
  reject: (proposalId, reason) => api.post(`/recruitment/compensation/${proposalId}/reject`, { reason }),
  requestRevision: (proposalId, data) => api.post(`/recruitment/compensation/${proposalId}/request-revision`, data),

  listSalaryStructures: () => api.get('/recruitment/salary-structures'),
}
