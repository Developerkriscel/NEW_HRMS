import mongoose from 'mongoose'
import { baseFields, model } from './_base'

const WebhookEndpointSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    status: { type: String, enum: ['ACTIVE', 'PAUSED', 'FAILED'], default: 'ACTIVE', index: true },
    events: [{ type: String }],
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null, index: true },
    signingSecretCiphertext: { type: String, required: true, select: false },
    signingSecretIv: { type: String, required: true, select: false },
    signingSecretTag: { type: String, required: true, select: false },
    secretPreview: { type: String, required: true },
    retryPolicy: {
      maxAttempts: { type: Number, default: 5 },
      backoffSeconds: { type: Number, default: 60 },
    },
    deadLetterCount: { type: Number, default: 0 },
    lastDeliveredAt: { type: Date, default: null },
    lastFailureAt: { type: Date, default: null },
    ...baseFields,
  },
  { timestamps: true }
)

WebhookEndpointSchema.index({ status: 1, updatedAt: -1 })

export default model('WebhookEndpoint', WebhookEndpointSchema)
