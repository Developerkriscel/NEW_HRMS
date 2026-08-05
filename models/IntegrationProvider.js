import mongoose from 'mongoose'
import { baseFields, model } from './_base'

const IntegrationProviderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    key: { type: String, required: true, unique: true },
    category: { type: String, default: 'GENERAL', index: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'DEGRADED'], default: 'ACTIVE', index: true },
    authType: { type: String, enum: ['API_KEY', 'OAUTH2', 'BASIC', 'WEBHOOK_SIGNING', 'NONE'], default: 'API_KEY' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastCheckedAt: { type: Date, default: null },
    failureCount: { type: Number, default: 0 },
    ...baseFields,
  },
  { timestamps: true }
)

export default model('IntegrationProvider', IntegrationProviderSchema)
