import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

// assessment_options — choices for SINGLE_CHOICE/MULTIPLE_CHOICE/TRUE_FALSE
// questions. `isCorrect` is never sent to the public candidate portal.
const AssessmentOptionSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentQuestion', required: true },
    text: { type: String, required: true },
    isCorrect: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    ...tenantFields,
  },
  { timestamps: true, collection: 'assessment_options' }
)

AssessmentOptionSchema.index({ tenantId: 1, questionId: 1, order: 1 })

export default model('AssessmentOption', AssessmentOptionSchema)
