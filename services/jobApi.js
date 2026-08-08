import api from './api'

export const jobApi = {
  list: (params) => api.get('/recruitment/jobs', { params }),
  create: (data) => api.post('/recruitment/jobs', data),
  get: (id) => api.get(`/recruitment/jobs/${id}`),
  update: (id, data) => api.patch(`/recruitment/jobs/${id}`, data),
  open: (id) => api.post(`/recruitment/jobs/${id}/open`),
  pause: (id, reason) => api.post(`/recruitment/jobs/${id}/pause`, { reason }),
  reopen: (id) => api.post(`/recruitment/jobs/${id}/reopen`),
  close: (id, reason, unpublishAll) => api.post(`/recruitment/jobs/${id}/close`, { reason, unpublishAll }),
  cancel: (id, reason, unpublishAll) => api.post(`/recruitment/jobs/${id}/cancel`, { reason, unpublishAll }),
  duplicate: (id) => api.post(`/recruitment/jobs/${id}/duplicate`),
  createFromRequisition: (requisitionId, data) => api.post(`/recruitment/requisitions/${requisitionId}/create-job`, data),
  // Shared with the requisition form's Hiring Manager/Recruiter picker —
  // see app/api/recruitment/requisitions/employees/route.js.
  getEmployees: () => api.get('/recruitment/requisitions/employees'),
}
