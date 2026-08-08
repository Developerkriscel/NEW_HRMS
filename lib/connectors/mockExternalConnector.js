// Factory for the external job-board connectors (LinkedIn, Naukri, Indeed,
// Foundit) — Step 4 ships no real API integration for any of them (no
// credentials to use), so each just checks recruitment_integrations for a
// CONNECTED row and, if present, mocks a successful publish. A real
// connector later swaps the body of `publish` for an actual API call and
// keeps the same return shape — nothing above this layer needs to change.
import RecruitmentIntegration from '@/models/RecruitmentIntegration'
import { PUBLICATION_STATUS, CHANNEL_SOURCE_KEY } from '../publishingConstants'

export function createMockExternalConnector(channel, provider) {
  return {
    channel,
    requiresIntegration: true,

    async publish({ job, tenantId }) {
      const integration = await RecruitmentIntegration.findOne({ tenantId, provider })
      if (!integration || integration.status !== 'CONNECTED') {
        return {
          status: PUBLICATION_STATUS.FAILED,
          errorCode: 'NOT_CONNECTED',
          errorMessage: `${provider.charAt(0)}${provider.slice(1).toLowerCase()} isn't connected yet — connect the integration first.`,
        }
      }

      // Mock external call — a real connector would POST to the provider's
      // API here and persist whatever id/url it hands back.
      const mockId = `mock-${provider.toLowerCase()}-${job.jobCode}`.toLowerCase()
      return {
        status: PUBLICATION_STATUS.PUBLISHED,
        externalJobId: mockId,
        externalUrl: `https://${provider.toLowerCase()}.example.com/jobs/${mockId}`,
        trackingCode: CHANNEL_SOURCE_KEY[channel] || channel.toLowerCase(),
        metadata: { mock: true },
      }
    },

    async unpublish() {
      return { status: PUBLICATION_STATUS.REMOVED }
    },

    async pause() {
      return { status: PUBLICATION_STATUS.PAUSED }
    },
  }
}
