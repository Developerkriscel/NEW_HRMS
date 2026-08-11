import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

// offer_access_tokens — the outer public URL is a signed JWT carrying only
// { tenantId, offerId, jti, purpose } (see lib/offerTokenHelpers.js, same
// shape as the Step 9 assessment-token pattern so tenant resolution works
// identically for an unauthenticated request). `jti` is a random id that
// never appears anywhere except inside that JWT — what's actually stored
// here is sha256(jti), never the raw value ("do not store raw public
// tokens if avoidable; store hashes"). One offer can have several rows
// over time (resend, extend) — revokedAt is what invalidates an old link
// without touching the ones issued after it.
const OfferAccessTokenSchema = new mongoose.Schema(
  {
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, default: null }, // informational — the live Offer.expiresAt is the authoritative check
    usedAt: { type: Date, default: null }, // first time it successfully resolved (view/accept/decline/discussion)
    revokedAt: { type: Date, default: null },
    ...tenantFields,
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'offer_access_tokens' }
)

OfferAccessTokenSchema.index({ tenantId: 1, tokenHash: 1 })
OfferAccessTokenSchema.index({ tenantId: 1, offerId: 1 })

export default model('OfferAccessToken', OfferAccessTokenSchema)
