import mongoose from 'mongoose'
import { baseFields, model } from './_base'

const IntegrationLogSchema = new mongoose.Schema(
  {
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'IntegrationProvider', default: null, index: true },
    webhook: { type: mongoose.Schema.Types.ObjectId, ref: 'WebhookEndpoint', default: null, index: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null, index: true },
    direction: { type: String, enum: ['INBOUND', 'OUTBOUND'], default: 'OUTBOUND', index: true },
    event: { type: String, required: true },
    status: { type: String, enum: ['QUEUED', 'DELIVERED', 'FAILED', 'DEAD_LETTER'], default: 'QUEUED', index: true },
    severity: { type: String, enum: ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'INFO' },
    attempts: { type: Number, default: 0 },
    nextRetryAt: { type: Date, default: null, index: true },
    errorCode: { type: String, default: null },
    message: { type: String, default: null },
    payloadSummary: { type: mongoose.Schema.Types.Mixed, default: {} },
    payloadRedacted: { type: Boolean, default: true },
    signature: { type: String, default: null },
    ...baseFields,
  },
  { timestamps: true }
)

IntegrationLogSchema.index({ status: 1, nextRetryAt: 1 })
IntegrationLogSchema.index({ createdAt: -1 })

export default model('IntegrationLog', IntegrationLogSchema)
