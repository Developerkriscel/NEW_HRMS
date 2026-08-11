import api from './api'

// Unauthenticated — same axios instance is fine, a candidate on this portal
// has no session cookie to send (see publicAssessmentApi.js).
export const publicOfferApi = {
  get: (token) => api.get(`/public/offers/${token}`),
  view: (token) => api.post(`/public/offers/${token}/view`),
  accept: (token, data) => api.post(`/public/offers/${token}/accept`, data),
  decline: (token, data) => api.post(`/public/offers/${token}/decline`, data),
  requestDiscussion: (token, data) => api.post(`/public/offers/${token}/request-discussion`, data),
  pdfUrl: (token) => `/api/public/offers/${token}/pdf`,
}
