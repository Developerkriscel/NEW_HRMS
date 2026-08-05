import mongoose from 'mongoose'
import { baseFields, model } from './_base'

const ApprovalSchema = new mongoose.Schema(
  {
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOperator', required: true },
    approvedByEmail: { type: String, required: true },
    approvedAt: { type: Date, default: Date.now },
    reason: { type: String, required: true },
  },
  { _id: false }
)

const PlatformComplianceRequestSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['LEGAL_REQUEST', 'RETENTION_HOLD', 'DATA_DELETION', 'TENANT_PURGE'], required: true, index: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null, index: true },
    title: { type: String, required: true },
    status: {
      type: String,
      enum: ['OPEN', 'ON_HOLD', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SCHEDULED', 'COMPLETED', 'EXPIRED', 'CANCELLED'],
      default: 'OPEN',
      index: true,
    },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
    requester: { type: String, default: null },
    reason: { type: String, required: true },
    retentionHoldUntil: { type: Date, default: null, index: true },
    approvalRequired: { type: Boolean, default: true },
    approvals: [ApprovalSchema],
    scheduledFor: { type: Date, default: null, index: true },
    expiresAt: { type: Date, default: null, index: true },
    reminderAt: { type: Date, default: null, index: true },
    completedAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ...baseFields,
  },
  { timestamps: true }
)

PlatformComplianceRequestSchema.index({ type: 1, status: 1, scheduledFor: 1 })

export default model('PlatformComplianceRequest', PlatformComplianceRequestSchema)
