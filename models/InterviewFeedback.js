import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { INTERVIEW_RECOMMENDATION_LIST } from '@/lib/interviewConstants'

// interview_feedback — one row per interviewer per interview (upserted on
// submit, never a second row for the same person). Blind by default: an
// interviewer only ever sees their own row until they submit — enforced in
// lib/interviewHelpers.js, not by anything in this schema.
const InterviewFeedbackSchema = new mongoose.Schema(
  {
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', required: true },
    interviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    interviewerName: { type: String, default: null },

    overallRating: { type: Number, required: true }, // 0-10, either typed directly or averaged from criteria scores
    recommendation: { type: String, enum: INTERVIEW_RECOMMENDATION_LIST, required: true },

    strengths: { type: String, default: null },
    concerns: { type: String, default: null },
    detailedFeedback: { type: String, default: null },

    submittedAt: { type: Date, default: Date.now },

    ...tenantFields,
  },
  { timestamps: true, collection: 'interview_feedback' }
)

InterviewFeedbackSchema.index({ tenantId: 1, interviewId: 1, interviewerId: 1 }, { unique: true })

export default model('InterviewFeedback', InterviewFeedbackSchema)
