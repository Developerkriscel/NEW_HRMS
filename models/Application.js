import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { APPLICATION_STATUS, APPLICATION_STATUS_LIST, APPLICATION_SOURCE_LIST } from '@/lib/candidateConstants'

// Never merged with Candidate — the relation is Candidate -> Applications
// (one candidate, many applications, one per job). See models/Candidate.js.
const ActivityEntrySchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    message: { type: String, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    actorName: { type: String },
    comment: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const ApplicationSchema = new mongoose.Schema(
  {
    applicationCode: { type: String, required: true }, // APP-2026-0001

    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },

    source: { type: String, enum: APPLICATION_SOURCE_LIST, default: 'DIRECT' },
    sourceTrackingCode: { type: String, default: null }, // the ?source=/&ref= this application arrived with
    // Only set when source === REFERRAL.
    referrerEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },

    // Where in the job's hiring pipeline this application currently sits —
    // defaults to the job's first (APPLIED-category) stage at creation.
    // Snapshotting the name alongside the ref means the label still reads
    // correctly even if that job_pipeline_stages row is later renamed/reordered.
    currentStage: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPipelineStage', default: null },
    currentStageName: { type: String, default: 'Applied' },

    status: { type: String, enum: APPLICATION_STATUS_LIST, default: APPLICATION_STATUS.ACTIVE },

    appliedAt: { type: Date, default: Date.now },

    activityLog: [ActivityEntrySchema],

    ...tenantFields,
  },
  { timestamps: true, collection: 'applications' }
)

ApplicationSchema.index({ tenantId: 1, applicationCode: 1 }, { unique: true })
// Rule: no duplicate application for the same candidate + same job, unless
// reapplication is explicitly supported later (it isn't yet).
ApplicationSchema.index({ tenantId: 1, candidateId: 1, jobId: 1 }, { unique: true })
ApplicationSchema.index({ tenantId: 1, jobId: 1 })
ApplicationSchema.index({ tenantId: 1, status: 1 })

export default model('Application', ApplicationSchema)
