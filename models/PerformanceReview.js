import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

const PerformanceReviewSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    periodLabel: { type: String, required: true }, // e.g. "Q1 2026"
    kraScore: { type: Number, default: null },
    attendanceNotes: { type: String },
    ratings: [
      {
        competency: { type: String, required: true },
        score: { type: Number, min: 1, max: 5 },
      },
    ],
    overallRating: { type: Number, min: 1, max: 5, default: null },
    feedback: { type: String },
    trainingRecommended: { type: Boolean, default: false },
    trainingNotes: { type: String },
    promotionRecommended: { type: Boolean, default: false },
    incrementRecommended: { type: Boolean, default: false },
    incrementPercent: { type: Number, default: null },
    pipRequired: { type: Boolean, default: false },
    pipPlan: { type: String },
    status: { type: String, enum: ['DRAFT', 'SUBMITTED'], default: 'DRAFT' },
    submittedAt: { type: Date, default: null },
    ...tenantFields,
  },
  { timestamps: true }
)

PerformanceReviewSchema.index({ tenantId: 1, employee: 1 })
PerformanceReviewSchema.index({ tenantId: 1, reviewer: 1, status: 1 })

export default model('PerformanceReview', PerformanceReviewSchema)
