// First-party channel — lists the job on the internal Employee Portal
// (Jobs / Referrals). No external URL; the "listing" is the authenticated
// /employee/referrals page itself. Candidate referral submission isn't
// built yet (Step 4 explicitly stops at "prepare the listing").
import { PUBLICATION_STATUS, CHANNEL_SOURCE_KEY } from '../publishingConstants'

export const referralConnector = {
  channel: 'REFERRAL',
  requiresIntegration: false,

  async publish({ job }) {
    return {
      status: PUBLICATION_STATUS.PUBLISHED,
      externalJobId: null,
      externalUrl: `/employee/referrals?job=${job.jobCode}`,
      trackingCode: CHANNEL_SOURCE_KEY.REFERRAL,
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
