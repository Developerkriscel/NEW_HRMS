import mongoose from 'mongoose'
import { model } from './_base'

// Server-side record of a platform-operator login, keyed by the `sessionId`
// (jti) claim embedded in that operator's access/refresh JWTs. Lets a
// session be revoked immediately (logout, admin-forced revocation, security
// incident) without waiting for token expiry — requireAuth() checks this on
// every super-admin request. Tenant-employee sessions are unaffected; they
// keep using the existing token-blacklist-on-logout mechanism only.
const PlatformSessionSchema = new mongoose.Schema(
  {
    operator: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOperator', required: true, index: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    issuedAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
    revokedAt: { type: Date, default: null },
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOperator', default: null },
    revokedReason: { type: String, default: null },
  },
  { timestamps: true }
)

PlatformSessionSchema.index({ operator: 1, revoked: 1 })
PlatformSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default model('PlatformSession', PlatformSessionSchema)
