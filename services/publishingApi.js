import api from './api'

export const publishingApi = {
  listPublications: (jobId) => api.get(`/recruitment/jobs/${jobId}/publications`),
  publish: (jobId, channels) => api.post(`/recruitment/jobs/${jobId}/publish`, { channels }),
  pause: (jobId, publicationId) => api.post(`/recruitment/jobs/${jobId}/publications/${publicationId}/pause`),
  unpublish: (jobId, publicationId) => api.post(`/recruitment/jobs/${jobId}/publications/${publicationId}/unpublish`),
  retry: (jobId, publicationId) => api.post(`/recruitment/jobs/${jobId}/publications/${publicationId}/retry`),

  listIntegrations: () => api.get('/recruitment/integrations'),
  connectIntegration: (provider) => api.post(`/recruitment/integrations/${provider}/connect`),
  disconnectIntegration: (provider) => api.post(`/recruitment/integrations/${provider}/disconnect`),

  listReferralJobs: () => api.get('/recruitment/jobs/referrals'),
}
