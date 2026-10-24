// First-party channel - lists the job on the internal Employee Portal
// and exposes a referral-tracked public application URL.
import { buildTrackingUrl, jobSlugFor } from '../publicJobHelpers'
import { PUBLICATION_STATUS, CHANNEL_SOURCE_KEY } from '../publishingConstants'

export const referralConnector = {
  channel: 'REFERRAL',
  requiresIntegration: false,

  async publish({ job, tenant }) {
    return {
      status: PUBLICATION_STATUS.PUBLISHED,
      externalJobId: null,
      externalUrl: buildTrackingUrl(tenant, job, CHANNEL_SOURCE_KEY.REFERRAL),
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
