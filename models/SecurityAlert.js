import mongoose from 'mongoose'
import { baseFields, model } from './_base'

const SecurityAlertSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['FAILED_LOGIN', 'SUSPICIOUS_EXPORT', 'CROSS_TENANT_ACCESS', 'API_KEY', 'LEGAL_REQUEST', 'RETENTION', 'DATA_DELETION', 'OTHER'],
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM', index: true },
    status: { type: String, enum: ['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'], default: 'OPEN', index: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null, index: true },
    source: { type: String, default: 'platform' },
    actorEmail: { type: String, default: null },
    ipAddress: { type: String, default: null },
    occurredAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date, default: null, index: true },
    reminderAt: { type: Date, default: null, index: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    payloadRedacted: { type: Boolean, default: true },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOperator', default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOperator', default: null },
    ...baseFields,
  },
  { timestamps: true }
)

SecurityAlertSchema.index({ status: 1, severity: 1, occurredAt: -1 })

export default model('SecurityAlert', SecurityAlertSchema)
