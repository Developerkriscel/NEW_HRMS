import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

// preboarding_access_tokens — same hashed-token pattern as
// models/OfferAccessToken.js: the public URL is a signed JWT carrying only
// { tenantId, preboardingId, jti }; only sha256(jti) is ever persisted.
const PreboardingAccessTokenSchema = new mongoose.Schema(
  {
    preboardingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Preboarding', required: true },
    tokenHash: { type: String, required: true },
    revokedAt: { type: Date, default: null },
    ...tenantFields,
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'preboarding_access_tokens' }
)

PreboardingAccessTokenSchema.index({ tenantId: 1, tokenHash: 1 })
PreboardingAccessTokenSchema.index({ tenantId: 1, preboardingId: 1 })

export default model('PreboardingAccessToken', PreboardingAccessTokenSchema)
