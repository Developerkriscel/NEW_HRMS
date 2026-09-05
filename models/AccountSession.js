import mongoose from 'mongoose'
import { model } from './_base'

const AccountSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: { type: String, required: true },
    isSuperAdmin: { type: Boolean, default: false, index: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null, index: true },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    browser: { type: String, default: 'Unknown browser' },
    os: { type: String, default: 'Unknown OS' },
    deviceType: { type: String, enum: ['Desktop', 'Mobile', 'Tablet', 'Unknown'], default: 'Unknown' },
    issuedAt: { type: Date, default: () => new Date() },
    lastSeenAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false, index: true },
    revokedAt: { type: Date, default: null },
    revokedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    revokedReason: { type: String, default: null },
  },
  { timestamps: true }
)

AccountSessionSchema.index({ email: 1, tenantId: 1, revoked: 1, expiresAt: 1 })
AccountSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default model('AccountSession', AccountSessionSchema)
