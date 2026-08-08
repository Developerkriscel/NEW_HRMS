// Single source of truth for the Job Distribution / Publishing module —
// same pattern as lib/jobConstants.js and lib/recruitmentConstants.js.
import { JOB_MANAGE_ROLES } from './jobConstants'

export const PUBLISHING_CHANNEL = {
  CAREER_PAGE: 'CAREER_PAGE',
  REFERRAL: 'REFERRAL',
  LINKEDIN: 'LINKEDIN',
  NAUKRI: 'NAUKRI',
  INDEED: 'INDEED',
  FOUNDIT: 'FOUNDIT',
  OTHER: 'OTHER',
}
export const PUBLISHING_CHANNEL_LIST = Object.values(PUBLISHING_CHANNEL)
export const PUBLISHING_CHANNEL_LABELS = {
  CAREER_PAGE: 'Company Career Page',
  REFERRAL: 'Employee Referral',
  LINKEDIN: 'LinkedIn',
  NAUKRI: 'Naukri',
  INDEED: 'Indeed',
  FOUNDIT: 'Foundit',
  OTHER: 'Other Job Boards',
}
// Career Page and Referral are first-party — always "connected" by
// definition, nothing external to authorize. Everything else routes through
// a connector that checks recruitment_integrations first.
export const CHANNELS_REQUIRING_INTEGRATION = [
  PUBLISHING_CHANNEL.LINKEDIN, PUBLISHING_CHANNEL.NAUKRI, PUBLISHING_CHANNEL.INDEED, PUBLISHING_CHANNEL.FOUNDIT,
]
// Feeds `application.source` once Step 5 builds real applications, and the
// `?source=` query param on tracking links today.
export const CHANNEL_SOURCE_KEY = {
  CAREER_PAGE: 'career_page', REFERRAL: 'referral', LINKEDIN: 'linkedin',
  NAUKRI: 'naukri', INDEED: 'indeed', FOUNDIT: 'foundit', OTHER: 'other',
}

export const PUBLICATION_STATUS = {
  DRAFT: 'DRAFT', QUEUED: 'QUEUED', PUBLISHING: 'PUBLISHING', PUBLISHED: 'PUBLISHED',
  FAILED: 'FAILED', PAUSED: 'PAUSED', EXPIRED: 'EXPIRED', REMOVED: 'REMOVED',
}
export const PUBLICATION_STATUS_LIST = Object.values(PUBLICATION_STATUS)
export const PUBLICATION_STATUS_LABELS = {
  DRAFT: 'Draft', QUEUED: 'Queued', PUBLISHING: 'Publishing', PUBLISHED: 'Published',
  FAILED: 'Failed', PAUSED: 'Paused', EXPIRED: 'Expired', REMOVED: 'Removed',
}
// A publication in one of these states still "occupies" its channel — this
// is what gates the duplicate-active-publication rule and what the
// close/cancel "unpublish from all active channels?" prompt counts.
export const ACTIVE_PUBLICATION_STATUSES = [
  PUBLICATION_STATUS.DRAFT, PUBLICATION_STATUS.QUEUED, PUBLICATION_STATUS.PUBLISHING,
  PUBLICATION_STATUS.PUBLISHED, PUBLICATION_STATUS.PAUSED,
]

export const INTEGRATION_PROVIDER = { LINKEDIN: 'LINKEDIN', NAUKRI: 'NAUKRI', INDEED: 'INDEED', FOUNDIT: 'FOUNDIT' }
export const INTEGRATION_PROVIDER_LIST = Object.values(INTEGRATION_PROVIDER)
export const INTEGRATION_STATUS = { NOT_CONNECTED: 'NOT_CONNECTED', CONNECTED: 'CONNECTED', ERROR: 'ERROR' }

export const PUBLISHING_PERMISSIONS = {
  PUBLISH: 'job.publish',
  UNPUBLISH: 'job.unpublish',
  PUBLICATION_VIEW: 'job.publication.view',
  INTEGRATION_VIEW: 'recruitment.integration.view',
  INTEGRATION_MANAGE: 'recruitment.integration.manage',
}

// Publish/unpublish/view is the same operating roles as Job management
// itself (Company Admin, HR Manager, Super Admin) — no extra permission
// grant needed, per spec's recommended table. Employees get none of this.
export function canPublishJobs(session) {
  return JOB_MANAGE_ROLES.includes(session.role)
}
export const canUnpublishJobs = canPublishJobs
export const canViewPublications = canPublishJobs

// Connecting/disconnecting an external job board is Company Admin's call
// specifically — HR Manager can publish to an already-connected channel,
// but can't authorize a new one.
export function canManageIntegrations(session) {
  return session.role === 'COMPANY_ADMIN' || session.role === 'SUPER_ADMIN'
}
