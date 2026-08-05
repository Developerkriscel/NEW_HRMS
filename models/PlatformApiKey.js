import mongoose from 'mongoose'
import { baseFields, model } from './_base'

const PlatformApiKeySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    application: { type: String, default: null, index: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null, index: true },
    keyPrefix: { type: String, required: true },
    keyHash: { type: String, required: true, select: false },
    status: { type: String, enum: ['ACTIVE', 'ROTATION_DUE', 'REVOKED', 'EXPIRED'], default: 'ACTIVE', index: true },
    scopes: [{ type: String }],
    lastUsedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null, index: true },
    rotationDueAt: { type: Date, default: null, index: true },
    rotatedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    createdByOperator: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOperator', default: null },
    ...baseFields,
  },
  { timestamps: true }
)

PlatformApiKeySchema.index({ status: 1, rotationDueAt: 1 })

PlatformApiKeySchema.methods.toJSON = function toJSON() {
  const obj = this.toObject()
  delete obj.keyHash
  obj.secret = undefined
  return obj
}

export default model('PlatformApiKey', PlatformApiKeySchema)
