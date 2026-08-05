import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

const ResignationSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    resignationDate: { type: Date, required: true },
    lastWorkingDate: { type: Date },
    reason: { type: String },
    // Final APPROVED/REJECTED is set only by HR_MANAGER/COMPANY_ADMIN — the
    // manager can only move a resignation as far as MANAGER_REVIEWED / FORWARDED_TO_HR.
    status: {
      type: String,
      enum: ['SUBMITTED', 'MANAGER_REVIEWED', 'FORWARDED_TO_HR', 'APPROVED', 'REJECTED'],
      default: 'SUBMITTED',
    },
    managerRecommendation: { type: String },
    managerRecommendedAt: { type: Date, default: null },
    handoverEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    handoverChecklist: [
      {
        item: { type: String, required: true },
        done: { type: Boolean, default: false },
      },
    ],
    pendingTasksReviewed: { type: Boolean, default: false },
    workHandoverConfirmed: { type: Boolean, default: false },
    projectHandoverConfirmed: { type: Boolean, default: false },
    managerFinalRemarks: { type: String },
    hrDecision: { type: String },
    hrDecisionAt: { type: Date, default: null },
    ...tenantFields,
  },
  { timestamps: true }
)

ResignationSchema.index({ tenantId: 1, employee: 1 })
ResignationSchema.index({ tenantId: 1, status: 1 })

export default model('Resignation', ResignationSchema)
