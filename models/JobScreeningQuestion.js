import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { SCREENING_QUESTION_TYPE_LIST } from '@/lib/jobConstants'

const JobScreeningQuestionSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    question: { type: String, required: true },
    type: { type: String, enum: SCREENING_QUESTION_TYPE_LIST, required: true },
    options: [{ type: String }], // SINGLE_SELECT / MULTI_SELECT choices
    isRequired: { type: Boolean, default: true },
    isKnockout: { type: Boolean, default: false },
    // Free-text "minimum acceptable answer" for rule-based screening (e.g.
    // "2" for a NUMBER question). Never auto-rejects a candidate — later
    // steps use this to flag "Does Not Meet Screening Criteria" for HR to
    // review, not to auto-delete/reject.
    rule: { type: String, default: null },
    order: { type: Number, default: 0 },
    ...tenantFields,
  },
  { timestamps: true, collection: 'job_screening_questions' }
)

JobScreeningQuestionSchema.index({ tenantId: 1, jobId: 1, order: 1 })

export default model('JobScreeningQuestion', JobScreeningQuestionSchema)
