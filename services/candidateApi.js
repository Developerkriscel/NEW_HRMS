import api from './api'

export const candidateApi = {
  list: (params) => api.get('/recruitment/candidates', { params }),
  get: (id) => api.get(`/recruitment/candidates/${id}`),
  create: (data) => api.post('/recruitment/candidates', data),
  bulkApply: (data) => api.post('/recruitment/candidates/bulk-apply', data),
  update: (id, data) => api.patch(`/recruitment/candidates/${id}`, data),
  addNote: (id, note) => api.post(`/recruitment/candidates/${id}/notes`, { note }),

  getApplication: (id) => api.get(`/recruitment/applications/${id}`),
  moveStage: (id, stageId, comment) => api.post(`/recruitment/applications/${id}/move-stage`, { stageId, comment }),
  addApplicationNote: (id, note) => api.post(`/recruitment/applications/${id}/notes`, { note }),
  getStageHistory: (id) => api.get(`/recruitment/applications/${id}/stage-history`),
  assignRecruiter: (id, recruiterId) => api.post(`/recruitment/applications/${id}/assign-recruiter`, { recruiterId }),
  quickOffer: (id, data) => api.post(`/recruitment/applications/${id}/quick-offer`, data),

  // Step 7 — AI matching + HR screening
  getMatch: (applicationId) => api.get(`/recruitment/applications/${applicationId}/match`),
  generateMatch: (applicationId) => api.post(`/recruitment/applications/${applicationId}/match`),
  recalculateMatch: (applicationId) => api.post(`/recruitment/applications/${applicationId}/match/recalculate`),
  shortlist: (id, comment) => api.post(`/recruitment/applications/${id}/shortlist`, { comment }),
  hold: (id, data) => api.post(`/recruitment/applications/${id}/hold`, data),
  reject: (id, data) => api.post(`/recruitment/applications/${id}/reject`, data),
  talentPool: (id, comment) => api.post(`/recruitment/applications/${id}/talent-pool`, { comment }),
  withdraw: (id, data) => api.post(`/recruitment/applications/${id}/withdraw`, data),
  compare: (applicationIds) => api.get('/recruitment/applications/compare', { params: { ids: applicationIds.join(',') } }),

  // Step 8 — tags
  listCandidateTags: () => api.get('/recruitment/candidate-tags'),
  createCandidateTag: (name) => api.post('/recruitment/candidate-tags', { name }),
  getCandidateTags: (id) => api.get(`/recruitment/candidates/${id}/tags`),
  addCandidateTag: (id, name) => api.post(`/recruitment/candidates/${id}/tags`, { name }),
  removeCandidateTag: (id, tagId) => api.delete(`/recruitment/candidates/${id}/tags/${tagId}`),

  // Step 6 — resume parsing + profile enrichment
  getProfile: (id) => api.get(`/recruitment/candidates/${id}/profile`),
  addSkill: (id, data) => api.post(`/recruitment/candidates/${id}/skills`, data),
  updateProfileItem: (id, section, itemId, data) => api.patch(`/recruitment/candidates/${id}/profile-items/${section}/${itemId}`, data),
  deleteProfileItem: (id, section, itemId) => api.delete(`/recruitment/candidates/${id}/profile-items/${section}/${itemId}`),

  listResumes: (id) => api.get(`/recruitment/candidates/${id}/resumes`),
  uploadResume: (id, formData) => api.post(`/recruitment/candidates/${id}/resumes`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadDraftResume: (formData) => api.post('/recruitment/candidates/resumes/draft', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  parseResume: (resumeId) => api.post(`/recruitment/candidate-resumes/${resumeId}/parse`),
  retryParse: (resumeId) => api.post(`/recruitment/candidate-resumes/${resumeId}/retry`),
  getParsedData: (resumeId) => api.get(`/recruitment/candidate-resumes/${resumeId}/parsed-data`),
  applyParsedData: (resumeId, fields) => api.post(`/recruitment/candidate-resumes/${resumeId}/apply-parsed-data`, { fields }),
  dismissDuplicate: (resumeId) => api.post(`/recruitment/candidate-resumes/${resumeId}/dismiss-duplicate`),
}
