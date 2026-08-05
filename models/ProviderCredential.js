import mongoose from 'mongoose'
import { baseFields, model } from './_base'

const ProviderCredentialSchema = new mongoose.Schema(
  {
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'IntegrationProvider', required: true, index: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null, index: true },
    label: { type: String, required: true },
    status: { type: String, enum: ['ACTIVE', 'ROTATION_DUE', 'REVOKED'], default: 'ACTIVE', index: true },
    secretCiphertext: { type: String, required: true, select: false },
    secretIv: { type: String, required: true, select: false },
    secretTag: { type: String, required: true, select: false },
    secretPreview: { type: String, required: true },
    lastRotatedAt: { type: Date, default: Date.now },
    rotationDueAt: { type: Date, default: null, index: true },
    lastUsedAt: { type: Date, default: null },
    ...baseFields,
  },
  { timestamps: true }
)

ProviderCredentialSchema.index({ status: 1, rotationDueAt: 1 })

export default model('ProviderCredential', ProviderCredentialSchema)
