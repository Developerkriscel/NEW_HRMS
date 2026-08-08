import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { PUBLISHING_CHANNEL_LIST, PUBLICATION_STATUS_LIST, PUBLICATION_STATUS } from '@/lib/publishingConstants'

// One row per (job, channel) — never per publish attempt. Publishing again
// after a Pause/Remove/Fail updates this same row rather than inserting a
// new one, which is what makes "no duplicate active publication for the
// same job + channel" structurally true rather than something every route
// has to remember to check by hand. Platform-specific fields (LinkedIn post
// id, Naukri response payload, ...) live in `metadata`, not as dedicated
// columns — see lib/connectors/.
const JobPublicationSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    channel: { type: String, enum: PUBLISHING_CHANNEL_LIST, required: true },

    externalJobId: { type: String, default: null },
    externalUrl: { type: String, default: null },
    trackingCode: { type: String, default: null }, // bare slug/source key a tracking link is built from

    status: { type: String, enum: PUBLICATION_STATUS_LIST, default: PUBLICATION_STATUS.DRAFT, required: true },

    publishedAt: { type: Date, default: null },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    lastSyncedAt: { type: Date, default: null },

    errorCode: { type: String, default: null },
    errorMessage: { type: String, default: null },

    // Connector-specific response data (mock external job ids, payloads,
    // etc.) — deliberately untyped so a future real connector doesn't need
    // a schema migration to store what it gets back.
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    ...tenantFields,
  },
  { timestamps: true, collection: 'job_publications' }
)

// One row per job+channel, ever — publishing/unpublishing/republishing all
// mutate this same document.
JobPublicationSchema.index({ tenantId: 1, jobId: 1, channel: 1 }, { unique: true })
JobPublicationSchema.index({ tenantId: 1, status: 1 })

export default model('JobPublication', JobPublicationSchema)
