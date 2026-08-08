// "Other Job Boards" — the architecture's extensibility placeholder for a
// platform that needs a partner API or a manual posting workflow rather
// than a direct one-click connector. Always resolves to a manual-only
// failure result in Step 4; nothing to mock here since there's no specific
// provider behind it.
import { PUBLICATION_STATUS } from '../publishingConstants'

export const otherConnector = {
  channel: 'OTHER',
  requiresIntegration: false,

  async publish() {
    return {
      status: PUBLICATION_STATUS.FAILED,
      errorCode: 'MANUAL_ONLY',
      errorMessage: 'Other job boards need a manual posting workflow — not automated yet.',
    }
  },

  async unpublish() {
    return { status: PUBLICATION_STATUS.REMOVED }
  },

  async pause() {
    return { status: PUBLICATION_STATUS.PAUSED }
  },
}
