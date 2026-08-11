import api from './api'

// Unauthenticated — same axios instance is fine, a candidate on this
// portal has no session cookie to send (see publicCareersApi.js).
export const publicAssessmentApi = {
  get: (token) => api.get(`/public/assessment/${token}`),
  start: (token) => api.post(`/public/assessment/${token}/start`),
  submit: (token, formData) => api.post(`/public/assessment/${token}/submit`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
}
