import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { QUESTION_TYPE_LIST, QUESTION_DIFFICULTY_LIST } from '@/lib/assessmentConstants'

// assessment_questions — belongs to one AssessmentTemplate. Objective
// questions (choice/numeric/short-answer) carry a `correctAnswer` used for
// auto-grading; descriptive ones carry `evaluationGuidelines` for the human
// evaluator instead (item 4's two field sets, kept on one schema since a
// question is only ever one or the other, not both at once).
const AssessmentQuestionSchema = new mongoose.Schema(
  {
    assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentTemplate', required: true },

    type: { type: String, enum: QUESTION_TYPE_LIST, required: true },
    questionText: { type: String, required: true },
    order: { type: Number, default: 0 },

    marks: { type: Number, default: 1 },
    negativeMarks: { type: Number, default: 0 },
    difficulty: { type: String, enum: QUESTION_DIFFICULTY_LIST, default: null },
    skillCategory: { type: String, default: null }, // free text, e.g. "Node.js" — also doubles as the score-breakdown bucket

    // Objective auto-grading — SINGLE_CHOICE/TRUE_FALSE: option id string;
    // MULTIPLE_CHOICE: array of option ids; NUMERIC: number; SHORT_ANSWER:
    // exact-match string (case-insensitive). Never sent to the public
    // portal (see publicAssessmentHelpers.js's question-sanitizing).
    correctAnswer: { type: mongoose.Schema.Types.Mixed, default: null },

    // Descriptive — shown only to the HR evaluator, never the candidate.
    evaluationGuidelines: { type: String, default: null },

    isRequired: { type: Boolean, default: true },

    ...tenantFields,
  },
  { timestamps: true, collection: 'assessment_questions' }
)

AssessmentQuestionSchema.index({ tenantId: 1, assessmentId: 1, order: 1 })

export default model('AssessmentQuestion', AssessmentQuestionSchema)
