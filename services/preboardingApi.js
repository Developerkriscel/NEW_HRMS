import api from './api'

// Step 15/16 — Preboarding Dashboard, Candidate Information Form, Document
// Collection + HR Verification.
export const preboardingApi = {
  list: (params) => api.get('/recruitment/onboarding', { params }),
  start: (data) => api.post('/recruitment/onboarding', data),
  get: (id) => api.get(`/recruitment/onboarding/${id}`),
  joiningReadiness: (id) => api.get(`/recruitment/onboarding/${id}/joining`),
  updateJoiningConfig: (id, data) => api.put(`/recruitment/onboarding/${id}/joining`, data),
  conversionPreview: (id) => api.get(`/recruitment/onboarding/${id}/convert`),
  convertToEmployee: (id, data = {}) => api.post(`/recruitment/onboarding/${id}/convert`, data),

  sendForm: (id) => api.post(`/recruitment/onboarding/${id}/send-form`),
  requestCorrection: (id, data) => api.post(`/recruitment/onboarding/${id}/request-correction`, data),
  approveInformation: (id) => api.post(`/recruitment/onboarding/${id}/approve-information`),
  changeJoiningDate: (id, joiningDate) => api.post(`/recruitment/onboarding/${id}/change-joining-date`, { joiningDate }),
  cancel: (id, reason) => api.post(`/recruitment/onboarding/${id}/cancel`, { reason }),
  markJoined: (id) => api.post(`/recruitment/onboarding/${id}/mark-joined`),
  markNoShow: (id, comment) => api.post(`/recruitment/onboarding/${id}/mark-no-show`, { comment }),

  verifyDocument: (id, documentId) => api.post(`/recruitment/onboarding/${id}/documents/${documentId}/verify`),
  rejectDocument: (id, documentId, reason) => api.post(`/recruitment/onboarding/${id}/documents/${documentId}/reject`, { reason }),
  requestReplacement: (id, documentId, reason) => api.post(`/recruitment/onboarding/${id}/documents/${documentId}/request-replacement`, { reason }),
  waiveDocument: (id, documentId, reason) => api.post(`/recruitment/onboarding/${id}/documents/${documentId}/waive`, { reason }),
  documentFileUrl: (tenantId, storageKey) => `/api/recruitment/onboarding/documents/files/${tenantId}/${storageKey}`,
  addTask: (id, data) => api.post(`/recruitment/onboarding/${id}/tasks`, data),
  updateTask: (id, taskId, data) => api.patch(`/recruitment/onboarding/${id}/tasks/${taskId}`, data),
  deleteTask: (id, taskId) => api.delete(`/recruitment/onboarding/${id}/tasks/${taskId}`),
  addDocument: (id, data) => api.post(`/recruitment/onboarding/${id}/documents`, data),
  uploadDocument: (id, documentId, formData) => api.post(`/recruitment/onboarding/${id}/documents/${documentId}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteDocument: (id, documentId) => api.delete(`/recruitment/onboarding/${id}/documents/${documentId}`),

  listDocumentRequirements: () => api.get('/recruitment/document-requirements'),
  createDocumentRequirement: (data) => api.post('/recruitment/document-requirements', data),
  updateDocumentRequirement: (id, data) => api.patch(`/recruitment/document-requirements/${id}`, data),
  deleteDocumentRequirement: (id) => api.delete(`/recruitment/document-requirements/${id}`),
}
