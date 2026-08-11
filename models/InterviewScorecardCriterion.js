import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

// interview_scorecard_criteria — the individual rating rows within a
// template, e.g. "Node.js Knowledge — /10".
const InterviewScorecardCriterionSchema = new mongoose.Schema(
  {
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewScorecardTemplate', required: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
    maxScore: { type: Number, default: 10 },
    order: { type: Number, default: 0 },
    ...tenantFields,
  },
  { timestamps: true, collection: 'interview_scorecard_criteria' }
)

InterviewScorecardCriterionSchema.index({ tenantId: 1, templateId: 1, order: 1 })

export default model('InterviewScorecardCriterion', InterviewScorecardCriterionSchema)
