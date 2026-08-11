import api from './api'

// Unauthenticated — same axios instance is fine, no session cookie to send.
export const publicPreboardingApi = {
  get: (token) => api.get(`/public/preboarding/${token}`),
  saveDraft: (token, data) => api.patch(`/public/preboarding/${token}`, data),
  submit: (token) => api.post(`/public/preboarding/${token}/submit`),
  uploadDocument: (token, requirementId, formData) =>
    api.post(`/public/preboarding/${token}/documents/${requirementId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
}
