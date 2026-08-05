import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

// Generic request covering the lighter-weight approval flows that don't
// warrant their own dedicated model: shift changes, overtime, WFH, travel,
// and document requests. Leave, expense, asset, and resignation each have
// their own richer model (LeaveRequest, Expense, AssetRequest, Resignation).
const TeamRequestSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    type: {
      type: String,
      enum: ['SHIFT_CHANGE', 'OVERTIME', 'WORK_FROM_HOME', 'TRAVEL', 'DOCUMENT'],
      required: true,
    },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    fromDate: { type: Date },
    toDate: { type: Date },
    reason: { type: String },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    reviewerRemarks: { type: String },
    ...tenantFields,
  },
  { timestamps: true }
)

TeamRequestSchema.index({ tenantId: 1, employee: 1 })
TeamRequestSchema.index({ tenantId: 1, type: 1, status: 1 })

export default model('TeamRequest', TeamRequestSchema)
