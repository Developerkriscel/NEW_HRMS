// Registry — the only place that maps a channel key to its connector.
// Adding a new job board later means writing one connector file and adding
// one line here; nothing else in the publishing flow needs to change.
import { careerPageConnector } from './careerPageConnector'
import { referralConnector } from './referralConnector'
import { createMockExternalConnector } from './mockExternalConnector'
import { otherConnector } from './otherConnector'
import { PUBLISHING_CHANNEL } from '../publishingConstants'

const registry = {
  [PUBLISHING_CHANNEL.CAREER_PAGE]: careerPageConnector,
  [PUBLISHING_CHANNEL.REFERRAL]: referralConnector,
  [PUBLISHING_CHANNEL.LINKEDIN]: createMockExternalConnector(PUBLISHING_CHANNEL.LINKEDIN, 'LINKEDIN'),
  [PUBLISHING_CHANNEL.NAUKRI]: createMockExternalConnector(PUBLISHING_CHANNEL.NAUKRI, 'NAUKRI'),
  [PUBLISHING_CHANNEL.INDEED]: createMockExternalConnector(PUBLISHING_CHANNEL.INDEED, 'INDEED'),
  [PUBLISHING_CHANNEL.FOUNDIT]: createMockExternalConnector(PUBLISHING_CHANNEL.FOUNDIT, 'FOUNDIT'),
  [PUBLISHING_CHANNEL.OTHER]: otherConnector,
}

export function getConnector(channel) {
  const connector = registry[channel]
  if (!connector) throw new Error(`No connector registered for channel "${channel}"`)
  return connector
}
