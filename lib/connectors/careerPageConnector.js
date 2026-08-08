// First-party channel — always "connected" (nothing external to
// authorize), and the first fully-working publisher per Step 4.
import { buildTrackingUrl, jobSlugFor } from '../publicJobHelpers'
import { PUBLICATION_STATUS, CHANNEL_SOURCE_KEY } from '../publishingConstants'

export const careerPageConnector = {
  channel: 'CAREER_PAGE',
  requiresIntegration: false,

  async publish({ job, tenant }) {
    return {
      status: PUBLICATION_STATUS.PUBLISHED,
      externalJobId: null,
      externalUrl: buildTrackingUrl(tenant, job, CHANNEL_SOURCE_KEY.CAREER_PAGE),
      trackingCode: jobSlugFor(job),
      metadata: {},
    }
  },

  async unpublish() {
    return { status: PUBLICATION_STATUS.REMOVED }
  },

  async pause() {
    return { status: PUBLICATION_STATUS.PAUSED }
  },
}
