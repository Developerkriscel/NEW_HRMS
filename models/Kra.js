import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

const KraSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    title: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: ['KRA', 'GOAL', 'CHECKLIST'], default: 'KRA' },
    startDate: { type: Date },
    dueDate: { type: Date },
    weightage: { type: Number, default: 0 },
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'SENT_BACK'],
      default: 'NOT_STARTED',
    },
    updates: [
      {
        date: { type: Date, default: Date.now },
        note: { type: String },
        progressPercent: { type: Number },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
      },
    ],
    managerRemarks: { type: String },
    rating: { type: Number, min: 1, max: 5, default: null },
    ...tenantFields,
  },
  { timestamps: true }
)

KraSchema.index({ tenantId: 1, employee: 1 })
KraSchema.index({ tenantId: 1, assignedBy: 1, status: 1 })

export default model('Kra', KraSchema)
