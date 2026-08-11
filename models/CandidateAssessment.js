import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import {
  CANDIDATE_ASSESSMENT_STATUS, CANDIDATE_ASSESSMENT_STATUS_LIST, ASSESSMENT_RESULT, ASSESSMENT_RESULT_LIST,
  EVALUATION_RECOMMENDATION_LIST, EXTERNAL_PROVIDER_LIST,
} from '@/lib/assessmentConstants'

// candidate_assessments — one row per assignment/attempt. The candidate
// portal (/candidate/assessment/[token]) is unauthenticated, so `token` is
// a signed JWT (see lib/assessmentHelpers.js) rather than a bare random
// string — it's what lets a tokenless URL still resolve to the right
// tenant's database without a global cross-tenant lookup table.
const ActivityEntrySchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    message: { type: String, required: true },
    actorName: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const CandidateAssessmentSchema = new mongoose.Schema(
  {
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentTemplate', required: true },

    token: { type: String, required: true },

    status: { type: String, enum: CANDIDATE_ASSESSMENT_STATUS_LIST, default: CANDIDATE_ASSESSMENT_STATUS.ASSIGNED },

    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    assignedByName: { type: String, default: null },
    assignedAt: { type: Date, default: Date.now },
    messageToCandidate: { type: String, default: null },

    startDate: { type: Date, default: null }, // candidate can't start before this
    expiresAt: { type: Date, required: true }, // deadline to start/finish by

    startedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    // The hard per-attempt cutoff once started — min(expiresAt, startedAt + durationMinutes).
    // Every submit is validated against this on the backend, never the client timer.
    attemptDeadline: { type: Date, default: null },

    attemptNumber: { type: Number, default: 1 },
    maxAttempts: { type: Number, default: 1 }, // snapshotted from the template at assign time

    score: { type: Number, default: null },
    maxScore: { type: Number, default: null },
    percentage: { type: Number, default: null },
    result: { type: String, enum: ASSESSMENT_RESULT_LIST, default: ASSESSMENT_RESULT.PENDING },
    // Per skillCategory breakdown, e.g. { "Node.js": {scored: 20, max: 25} }
    scoreBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
    durationUsedMinutes: { type: Number, default: null },

    // Denormalized from the latest AssessmentEvaluation row (full audit
    // trail lives there) — kept here too so the common case ("show the
    // result") doesn't need a join.
    evaluatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    evaluatorName: { type: String, default: null },
    evaluationComment: { type: String, default: null },
    recommendation: { type: String, enum: EVALUATION_RECOMMENDATION_LIST, default: null },

    // Item 13 — external provider fields, recorded but not integrated.
    externalProvider: { type: String, enum: EXTERNAL_PROVIDER_LIST, default: null },
    externalUrl: { type: String, default: null },
    externalResultReference: { type: String, default: null },

    cancelledReason: { type: String, default: null },

    activityLog: [ActivityEntrySchema],

    ...tenantFields,
  },
  { timestamps: true, collection: 'candidate_assessments' }
)

CandidateAssessmentSchema.index({ tenantId: 1, token: 1 }, { unique: true })
CandidateAssessmentSchema.index({ tenantId: 1, applicationId: 1 })
CandidateAssessmentSchema.index({ tenantId: 1, candidateId: 1 })
CandidateAssessmentSchema.index({ tenantId: 1, status: 1 })

export default model('CandidateAssessment', CandidateAssessmentSchema)
