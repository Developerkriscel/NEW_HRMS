import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { SCORECARD_CATEGORY_LIST } from '@/lib/interviewConstants'

// interview_scorecard_templates — reusable per category, selected by a
// job/round when scheduling (item 12).
const InterviewScorecardTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, enum: SCORECARD_CATEGORY_LIST, default: 'CUSTOM' },
    description: { type: String, default: null },
    isDefault: { type: Boolean, default: false }, // one of the auto-seeded starter templates
    createdByName: { type: String, default: null },
    ...tenantFields,
  },
  { timestamps: true, collection: 'interview_scorecard_templates' }
)

InterviewScorecardTemplateSchema.index({ tenantId: 1, name: 1 }, { unique: true })

export default model('InterviewScorecardTemplate', InterviewScorecardTemplateSchema)
