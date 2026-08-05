import mongoose from 'mongoose'
import { model } from './_base'

const AuditLogSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null, index: true },
    actorType: { type: String, enum: ['PLATFORM_OPERATOR', 'EMPLOYEE', 'SYSTEM'], default: 'EMPLOYEE' },
    performedBy: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    performerEmail: { type: String },
    performerRole: { type: String },
    action: { type: String, required: true, maxlength: 100 },
    entityType: { type: String, maxlength: 100 },
    entityId: { type: String },
    description: { type: String },
    oldValue: { type: String },
    newValue: { type: String },
    reason: { type: String },
    requestId: { type: String },
    supportSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportAccessSession', default: null },
    ipAddress: { type: String, maxlength: 45 },
    userAgent: { type: String, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

AuditLogSchema.index({ createdAt: -1 })

export default model('AuditLog', AuditLogSchema)
