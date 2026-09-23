import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

const TrainingSessionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: { type: String },
    trainer: { type: String },
    scheduledAt: { type: Date },
    status: { type: String, enum: ['PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED'], default: 'PLANNED' },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
    notes: { type: String },
    startedAt: { type: Date, default: null },
    activeStartedAt: { type: Date, default: null },
    pausedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    totalDurationMinutes: { type: Number, default: 0 },
    ...tenantFields,
  },
  { timestamps: true }
)

TrainingSessionSchema.index({ tenantId: 1, status: 1 })
TrainingSessionSchema.index({ tenantId: 1, scheduledAt: 1 })

export default model('TrainingSession', TrainingSessionSchema)
