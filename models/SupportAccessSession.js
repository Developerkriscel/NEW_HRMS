import mongoose from 'mongoose'
import { model } from './_base'

// The actual grant. Created only from an APPROVED SupportRequest, carries
// its own hard expiry independent of the request, and is the one thing
// that scope-enforcement checks (lib/platformSupport.js) look at. `tenant`
// (not `tenantId`) keeps this in the master database — see the comment on
// TenantProvisioningJob for why that field name matters.
const SupportAccessSessionSchema = new mongoose.Schema(
  {
    supportRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportRequest', required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    operator: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOperator', required: true, index: true },
    scope: [{ type: String }],
    modules: [{ type: String }],
    accessMode: { type: String, enum: ['READ_ONLY', 'READ_WRITE'], default: 'READ_ONLY' },
    startsAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'REVOKED', 'COMPLETED'], default: 'ACTIVE' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOperator', required: true },
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOperator', default: null },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, default: null },
  },
  { timestamps: true }
)

SupportAccessSessionSchema.index({ operator: 1, status: 1 })
SupportAccessSessionSchema.index({ tenant: 1, status: 1 })

SupportAccessSessionSchema.methods.isActive = function (at = new Date()) {
  return this.status === 'ACTIVE' && this.expiresAt > at
}

export default model('SupportAccessSession', SupportAccessSessionSchema)
