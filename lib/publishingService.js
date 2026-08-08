// Orchestrates Job -> Publishing Service -> Connector. One publish request
// can target several channels; each channel succeeds or fails
// independently (a disconnected LinkedIn must never sink Career Page), and
// every attempt lands on the same one-row-per-job-per-channel
// JobPublication document — see models/JobPublication.js for why.
import JobPublication from '@/models/JobPublication'
import { getConnector } from './connectors'
import { PUBLICATION_STATUS } from './publishingConstants'
import { getActorName } from './requisitionHelpers'

async function loadOrCreatePublication(tenantId, jobId, channel) {
  let publication = await JobPublication.findOne({ tenantId, jobId, channel })
  if (!publication) {
    publication = new JobPublication({ tenantId, jobId, channel, status: PUBLICATION_STATUS.QUEUED })
  } else {
    publication.status = PUBLICATION_STATUS.QUEUED
    publication.errorCode = null
    publication.errorMessage = null
  }
  await publication.save()
  return publication
}

export async function publishJobToChannels({ job, tenant, tenantId, channels, session }) {
  const results = []

  for (const channel of channels) {
    const connector = getConnector(channel)
    const publication = await loadOrCreatePublication(tenantId, job._id, channel)

    try {
      const outcome = await connector.publish({ job, tenant, tenantId, session })
      publication.status = outcome.status
      if (outcome.status === PUBLICATION_STATUS.PUBLISHED) {
        publication.externalJobId = outcome.externalJobId ?? null
        publication.externalUrl = outcome.externalUrl ?? null
        publication.trackingCode = outcome.trackingCode ?? null
        publication.metadata = outcome.metadata ?? {}
        publication.publishedAt = new Date()
        publication.publishedBy = session.userId
        publication.errorCode = null
        publication.errorMessage = null
      } else {
        publication.errorCode = outcome.errorCode || 'PUBLISH_FAILED'
        publication.errorMessage = outcome.errorMessage || 'Publishing failed'
      }
      publication.lastSyncedAt = new Date()
      await publication.save()
    } catch (err) {
      publication.status = PUBLICATION_STATUS.FAILED
      publication.errorCode = 'CONNECTOR_ERROR'
      publication.errorMessage = err.message || 'Unexpected connector error'
      publication.lastSyncedAt = new Date()
      await publication.save()
    }

    results.push({
      channel,
      status: publication.status,
      errorCode: publication.errorCode,
      errorMessage: publication.errorMessage,
      externalUrl: publication.externalUrl,
    })
  }

  return results
}

// Unpublishes every still-active publication for a job — used by the
// close/cancel "unpublish from all active channels?" cascade. Never called
// implicitly just because the job status changed (spec is explicit: a
// closed job can legitimately keep a PUBLISHED row until HR says
// otherwise) — only when the caller opts in.
export async function unpublishAllActive({ jobId, tenantId, session, activeStatuses }) {
  const actorName = await getActorName(session)
  const publications = await JobPublication.find({ tenantId, jobId, status: { $in: activeStatuses } })
  const results = []
  for (const publication of publications) {
    const connector = getConnector(publication.channel)
    try {
      const outcome = await connector.unpublish({ publication })
      publication.status = outcome.status
      publication.lastSyncedAt = new Date()
      await publication.save()
      results.push({ channel: publication.channel, status: publication.status })
    } catch (err) {
      results.push({ channel: publication.channel, status: publication.status, error: err.message })
    }
  }
  return { results, actorName }
}
