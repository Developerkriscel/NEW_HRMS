import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import {
  ASSESSMENT_TYPE_LIST, ASSESSMENT_MASTER_STATUS, ASSESSMENT_MASTER_STATUS_LIST, SUBMISSION_TYPE_LIST,
} from '@/lib/assessmentConstants'

// assessment_templates — the Assessment Master. Every row here doubles as a
// reusable template: "Assign Assessment" picks straight from this list, so
// there's no separate DB-backed "template" concept layered on top (see
// lib/assessmentConstants.js's header comment).
const AssessmentTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ASSESSMENT_TYPE_LIST, required: true },
    description: { type: String, default: null },
    instructions: { type: String, required: true },

    durationMinutes: { type: Number, default: null },
    totalMarks: { type: Number, default: 0 },
    passingScore: { type: Number, default: null }, // percentage, 0-100
    maxAttempts: { type: Number, default: 1 },

    shuffleQuestions: { type: Boolean, default: false },
    showResultToCandidate: { type: Boolean, default: true },
    autoEvaluate: { type: Boolean, default: true },

    // Only meaningful when type === TAKE_HOME_ASSIGNMENT.
    submissionType: { type: String, enum: SUBMISSION_TYPE_LIST, default: null },
    submissionWindowDays: { type: Number, default: null }, // default deadline length; the actual per-candidate expiresAt is set at assign time

    status: { type: String, enum: ASSESSMENT_MASTER_STATUS_LIST, default: ASSESSMENT_MASTER_STATUS.ACTIVE },

    createdByEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    createdByName: { type: String, default: null },

    ...tenantFields,
  },
  { timestamps: true, collection: 'assessment_templates' }
)

AssessmentTemplateSchema.index({ tenantId: 1, status: 1 })
AssessmentTemplateSchema.index({ tenantId: 1, type: 1 })

export default model('AssessmentTemplate', AssessmentTemplateSchema)
