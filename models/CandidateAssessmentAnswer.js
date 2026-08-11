import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

// candidate_assessment_answers — one row per question per attempt.
const CandidateAssessmentAnswerSchema = new mongoose.Schema(
  {
    candidateAssessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'CandidateAssessment', required: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentQuestion', required: true },

    // Snapshotted at submission time so a later edit to the question bank
    // never rewrites what the candidate actually saw.
    questionText: { type: String, required: true },
    questionType: { type: String, required: true },
    marks: { type: Number, default: 1 },
    skillCategory: { type: String, default: null },

    // Selected option id(s) for choice types, text for short/long answer,
    // number for NUMERIC, a URL string for URL_SUBMISSION, or the stored
    // file's URL for FILE_UPLOAD.
    answer: { type: mongoose.Schema.Types.Mixed, default: null },

    isAutoGraded: { type: Boolean, default: false },
    isCorrect: { type: Boolean, default: null }, // null until graded
    marksAwarded: { type: Number, default: null },
    evaluatorComment: { type: String, default: null }, // per-question note from manual evaluation

    ...tenantFields,
  },
  { timestamps: true, collection: 'candidate_assessment_answers' }
)

CandidateAssessmentAnswerSchema.index({ tenantId: 1, candidateAssessmentId: 1 })

export default model('CandidateAssessmentAnswer', CandidateAssessmentAnswerSchema)
