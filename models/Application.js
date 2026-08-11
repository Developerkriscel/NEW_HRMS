import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { APPLICATION_STATUS, APPLICATION_STATUS_LIST, APPLICATION_SOURCE_LIST } from '@/lib/candidateConstants'
import { SELECTION_STATUS_LIST } from '@/lib/selectionConstants'

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
    // Step 8 — when the application entered its *current* stage, reset on
    // every move. Drives stage-aging ("5 Days in Screening") on the pipeline
    // board; every actual transition is still fully preserved in
    // application_stage_history, this is just the fast-path for "how long
    // has it been".
    stageEnteredAt: { type: Date, default: Date.now },

    // Step 8 — who on the recruiting team owns this application. Nullable:
    // most applications start unassigned.
    assignedRecruiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },

    status: { type: String, enum: APPLICATION_STATUS_LIST, default: APPLICATION_STATUS.ACTIVE },

    // Step 8 — populated only for the matching status. ON_HOLD keeps the
    // application's stage untouched (a hold is a pause, not a stage), the
    // other three are terminal outcomes.
    holdUntil: { type: Date, default: null },
    holdReason: { type: String, default: null },
    holdComment: { type: String, default: null },
    rejectionReason: { type: String, default: null },
    rejectionComment: { type: String, default: null },
    withdrawalReason: { type: String, default: null },
    withdrawalComment: { type: String, default: null },

    // Step 11 — set automatically the moment the application's currentStage
    // enters a SELECTED-category stage (see lib/pipelineHelpers.js), and
    // updated by every selection decision from then on. Null before that —
    // "reached final selection stage" is what makes an application show up
    // on /hr/recruitment/selections at all.
    selectionStatus: { type: String, enum: [...SELECTION_STATUS_LIST, null], default: null },

    // Step 12 — flips to true only when a compensation proposal is
    // APPROVED. This is deliberately a plain boolean, not folded into
    // selectionStatus — an application can be SELECTION_APPROVED and still
    // not be ready for an offer yet (compensation not finalized).
    readyForOffer: { type: Boolean, default: false },

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
