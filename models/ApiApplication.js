import mongoose from 'mongoose'
import { baseFields, model } from './_base'

const ApiApplicationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    ownerEmail: { type: String, required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null, index: true },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'REVOKED'], default: 'ACTIVE', index: true },
    scopes: [{ type: String }],
    rateLimitPerMinute: { type: Number, default: 120 },
    lastUsedAt: { type: Date, default: null },
    ...baseFields,
  },
  { timestamps: true }
)

export default model('ApiApplication', ApiApplicationSchema)
