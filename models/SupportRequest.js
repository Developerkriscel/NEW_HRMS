import mongoose from 'mongoose'
import { baseFields, model } from './_base'

export const SUPPORT_SCOPES = ['TENANT_METADATA', 'CONFIGURATION', 'INTEGRATION_LOGS', 'WORKFLOW_TROUBLESHOOTING', 'SPECIFIC_MODULE', 'SPECIFIC_RECORD', 'READ_ONLY_BUSINESS_DATA']

// A request for time-boxed access into one tenant. Approving it creates the
// SupportAccessSession that actually grants anything — this record on its
// own never permits access to tenant data.
const SupportRequestSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    supportTicket: { type: String, required: true },
    reason: { type: String, required: true },
    requestedScope: [{ type: String, enum: SUPPORT_SCOPES }],
    requestedModules: [{ type: String }],
    accessMode: { type: String, enum: ['READ_ONLY', 'READ_WRITE'], default: 'READ_ONLY' },
    startTime: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, min: 15, max: 480 }, // 15min–8h — no permanent access
    customerApprovalStatus: { type: String, enum: ['NOT_REQUIRED', 'PENDING', 'APPROVED', 'DECLINED'], default: 'NOT_REQUIRED' },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'DECLINED', 'CANCELLED'], default: 'PENDING' },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOperator', required: true },
    internalApprover: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOperator', default: null },
    decisionReason: { type: String, default: null },
    decidedAt: { type: Date, default: null },
    ...baseFields,
  },
  { timestamps: true }
)

SupportRequestSchema.index({ status: 1, createdAt: -1 })

export default model('SupportRequest', SupportRequestSchema)
