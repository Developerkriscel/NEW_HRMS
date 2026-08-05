import mongoose from 'mongoose'
import { baseFields, model } from './_base'

// Assigns a PlatformRole to a PlatformOperator. Supports temporary/expiring
// grants (expiresAt) and an optional scope restriction (e.g. limit a
// SUPPORT_ADMIN grant to a single tenant) without needing a separate model —
// an assignment with no scope applies platform-wide.
const PlatformOperatorRoleSchema = new mongoose.Schema(
  {
    operator: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOperator', required: true },
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformRole', required: true },
    scope: {
      type: { type: String, enum: ['PLATFORM', 'TENANT'], default: 'PLATFORM' },
      tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },
    },
    startsAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, default: null }, // null = permanent
    reason: { type: String },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOperator', default: null },
    revoked: { type: Boolean, default: false },
    revokedAt: { type: Date, default: null },
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOperator', default: null },
    revokedReason: { type: String, default: null },
    ...baseFields,
  },
  { timestamps: true }
)

PlatformOperatorRoleSchema.index({ operator: 1, revoked: 1 })
PlatformOperatorRoleSchema.index({ role: 1 })

PlatformOperatorRoleSchema.methods.isEffective = function (at = new Date()) {
  if (this.revoked) return false
  if (this.startsAt && this.startsAt > at) return false
  if (this.expiresAt && this.expiresAt <= at) return false
  return true
}

export default model('PlatformOperatorRole', PlatformOperatorRoleSchema)
