import mongoose from 'mongoose'
import { baseFields, model } from './_base'

const TimelineSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOperator', default: null },
    actorEmail: { type: String, default: null },
    fromStatus: { type: String, default: null },
    toStatus: { type: String, default: null },
    note: { type: String, required: true },
  },
  { _id: false }
)

const SecurityIncidentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM', index: true },
    status: {
      type: String,
      enum: ['OPEN', 'TRIAGED', 'INVESTIGATING', 'CONTAINED', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
      index: true,
    },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOperator', default: null, index: true },
    category: { type: String, default: 'OTHER', index: true },
    summary: { type: String, default: null },
    detectedAt: { type: Date, default: Date.now },
    dueAt: { type: Date, default: null, index: true },
    reminderAt: { type: Date, default: null, index: true },
    resolvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    relatedAlerts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SecurityAlert' }],
    timeline: [TimelineSchema],
    ...baseFields,
  },
  { timestamps: true }
)

SecurityIncidentSchema.index({ status: 1, severity: 1, updatedAt: -1 })

export default model('SecurityIncident', SecurityIncidentSchema)
