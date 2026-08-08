import api from './api'

// Unauthenticated endpoints — same axios instance is fine to reuse (a
// logged-out visitor simply has no session cookie to send).
export const publicCareersApi = {
  listJobs: (companySlug, params) => api.get(`/public/careers/${companySlug}/jobs`, { params }),
  getJob: (companySlug, jobSlug) => api.get(`/public/careers/${companySlug}/jobs/${jobSlug}`),
  apply: (companySlug, jobId, formData, { source, ref } = {}) => {
    const query = new URLSearchParams()
    if (source) query.set('source', source)
    if (ref) query.set('ref', ref)
    const qs = query.toString() ? `?${query.toString()}` : ''
    return api.post(`/public/careers/${companySlug}/jobs/${jobId}/apply${qs}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
