import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

// interview_feedback_scores — the per-criterion rows behind one
// InterviewFeedback, when a scorecard template was used.
const InterviewFeedbackScoreSchema = new mongoose.Schema(
  {
    feedbackId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewFeedback', required: true },
    criterionId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewScorecardCriterion', default: null },
    criterionName: { type: String, required: true }, // snapshotted so a later-edited template doesn't rewrite history
    score: { type: Number, required: true },
    maxScore: { type: Number, default: 10 },
    ...tenantFields,
  },
  { timestamps: true, collection: 'interview_feedback_scores' }
)

InterviewFeedbackScoreSchema.index({ tenantId: 1, feedbackId: 1 })

export default model('InterviewFeedbackScore', InterviewFeedbackScoreSchema)
