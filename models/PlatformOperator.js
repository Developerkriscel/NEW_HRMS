import mongoose from 'mongoose'
import { baseFields, model } from './_base'

// Platform-level identity, entirely separate from tenant Employee/User
// records — never gets implicit access to tenant data (see SupportAccessSession
// for the only sanctioned, audited path into a tenant's data). Renamed from
// SuperAdminUser but kept on the same physical collection (`superadminusers`)
// so existing operator accounts and logins keep working unchanged.
const PlatformOperatorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // bcrypt hash
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
    active: { type: Boolean, default: true }, // kept for backward compatibility with existing records/queries
    suspensionReason: { type: String, default: null },

    // MFA-ready: fields exist so enrollment/verification can be built without
    // another migration. Enforcement (mfaRequired) lives on PlatformRole —
    // an operator assigned a role that requires MFA cannot be treated as
    // fully authenticated until mfaEnabled is true (checked by callers, not
    // enforced inside the model itself).
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String, default: null, select: false },

    ipAllowlist: [{ type: String }],
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date },
    lastLoginIp: { type: String },

    ...baseFields,
  },
  { timestamps: true, collection: 'superadminusers' }
)

PlatformOperatorSchema.index({ status: 1 })

export default model('PlatformOperator', PlatformOperatorSchema)
