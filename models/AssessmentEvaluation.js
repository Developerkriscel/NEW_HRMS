import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { EVALUATION_RECOMMENDATION_LIST } from '@/lib/assessmentConstants'

// assessment_evaluations — the full audit trail of manual review passes
// (supports re-evaluation), separate from the denormalized "latest result"
// fields kept on CandidateAssessment itself for quick display.
const AssessmentEvaluationSchema = new mongoose.Schema(
  {
    candidateAssessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'CandidateAssessment', required: true },

    evaluatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    evaluatorName: { type: String, default: null },

    score: { type: Number, default: null },
    maxScore: { type: Number, default: null },
    scoreBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} },

    comment: { type: String, default: null },
    // Item 12 — advisory, never an auto-reject switch.
    recommendation: { type: String, enum: EVALUATION_RECOMMENDATION_LIST, default: null },

    evaluatedAt: { type: Date, default: Date.now },

    ...tenantFields,
  },
  { timestamps: true, collection: 'assessment_evaluations' }
)

AssessmentEvaluationSchema.index({ tenantId: 1, candidateAssessmentId: 1, evaluatedAt: -1 })

export default model('AssessmentEvaluation', AssessmentEvaluationSchema)
