import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

// One row per screening-question answer on an application. `questionText`/
// `questionType` are snapshotted at submission time so an answer still
// reads correctly even if HR later edits or removes the question from the
// job (job_screening_questions rows aren't versioned).
const ApplicationAnswerSchema = new mongoose.Schema(
  {
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobScreeningQuestion', default: null },
    questionText: { type: String, required: true },
    questionType: { type: String, default: 'TEXT' },
    isKnockout: { type: Boolean, default: false },
    rule: { type: String, default: null }, // snapshot of the "minimum acceptable answer" at submission time
    answer: { type: mongoose.Schema.Types.Mixed, default: null }, // string | string[] | boolean, depending on questionType
    ...tenantFields,
  },
  { timestamps: true, collection: 'application_answers' }
)

ApplicationAnswerSchema.index({ tenantId: 1, applicationId: 1 })

export default model('ApplicationAnswer', ApplicationAnswerSchema)
