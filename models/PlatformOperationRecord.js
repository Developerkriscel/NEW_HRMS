import mongoose from 'mongoose'
import { baseFields, model } from './_base'

const PlatformOperationRecordSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'SYSTEM_HEALTH',
        'SERVICE',
        'BACKGROUND_JOB',
        'JOB_QUEUE',
        'SCHEDULED_JOB',
        'INTEGRATION_FAILURE',
        'EMAIL_DELIVERY',
        'STORAGE_STATUS',
        'DATABASE_STATUS',
        'BACKUP',
        'RESTORE_TEST',
      ],
      required: true,
      index: true,
    },
    name: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['HEALTHY', 'DEGRADED', 'DOWN', 'RUNNING', 'PAUSED', 'SCHEDULED', 'COMPLETED', 'FAILED', 'CANCELLED'],
      default: 'HEALTHY',
      index: true,
    },
    severity: { type: String, enum: ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'INFO', index: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null, index: true },
    queueName: { type: String, default: null, index: true },
    provider: { type: String, default: null, index: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    nextRunAt: { type: Date, default: null, index: true },
    lastRunAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    lockedAt: { type: Date, default: null },
    errorCode: { type: String, default: null },
    message: { type: String, default: null },
    metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    payloadSummary: { type: mongoose.Schema.Types.Mixed, default: {} },
    payloadRedacted: { type: Boolean, default: true },
    retryable: { type: Boolean, default: true },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOperator', default: null },
    retriedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOperator', default: null },
    ...baseFields,
  },
  { timestamps: true }
)

PlatformOperationRecordSchema.index({ type: 1, status: 1, updatedAt: -1 })
PlatformOperationRecordSchema.index({ queueName: 1, nextRunAt: 1 })

export default model('PlatformOperationRecord', PlatformOperationRecordSchema)
