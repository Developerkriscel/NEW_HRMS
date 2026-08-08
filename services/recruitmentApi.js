import api from './api'

// list/create/update against the old flat /api/recruitment candidate
// endpoints were removed in Step 5 — Candidate is now a separate Master
// from Application (see services/candidateApi.js). getDashboard is
// unrelated (Recruitment Dashboard, Step 1) and stays.
export const recruitmentApi = {
  getDashboard: () => api.get('/recruitment/dashboard'),
}
