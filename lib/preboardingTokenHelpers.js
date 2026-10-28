// Step 15 item 5 — secure candidate preboarding-form links. Exact same
// hybrid pattern as lib/offerTokenHelpers.js: a signed JWT carrying only
// { tenantId, preboardingId, jti, purpose } resolves the tenant before any
// DB query; only sha256(jti) is ever persisted (models/PreboardingAccessToken.js).
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import Tenant from '@/models/Tenant'
import PreboardingAccessToken from '@/models/PreboardingAccessToken'
import Preboarding from '@/models/Preboarding'
import Offer from '@/models/Offer'
import { resolveOfferAccessToken } from '@/lib/offerTokenHelpers'

const JWT_SECRET = process.env.JWT_SECRET || 'NexaHRSuperSecretKey2025ForJWTTokenSigningMustBe256BitsOrMore'

function hashJti(jti) {
  return crypto.createHash('sha256').update(jti).digest('hex')
}

export async function issuePreboardingToken(tenantId, preboardingId) {
  const jti = crypto.randomBytes(24).toString('hex')
  await PreboardingAccessToken.create({ tenantId, preboardingId, tokenHash: hashJti(jti) })
  return jwt.sign(
    { tenantId: String(tenantId), preboardingId: String(preboardingId), jti, purpose: 'candidate_preboarding' },
    JWT_SECRET,
    { algorithm: 'HS256' }
  )
}

export async function revokePreboardingTokens(tenantId, preboardingId) {
  await PreboardingAccessToken.updateMany({ tenantId, preboardingId, revokedAt: null }, { revokedAt: new Date() })
}

// Stage 1 — verify the JWT and resolve the tenant.
export async function resolvePreboardingTokenClaims(token) {
  let decoded
  try {
    decoded = jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
  const isPreboardingLink = decoded?.purpose === 'candidate_preboarding'
  const isOfferLink = decoded?.purpose === 'candidate_offer'
  if ((!isPreboardingLink && !isOfferLink) || !decoded.tenantId || !decoded.jti) return null
  if (isPreboardingLink && !decoded.preboardingId) return null
  if (isOfferLink && !decoded.offerId) return null

  const tenant = await Tenant.findOne({ _id: decoded.tenantId, deleted: false })
  if (!tenant) return null
  return {
    tenant,
    preboardingId: isPreboardingLink ? decoded.preboardingId : null,
    offerId: isOfferLink ? decoded.offerId : null,
    jti: decoded.jti,
    isOfferLink,
  }
}

// Stage 2 — call inside runForTenant(tenant, ...).
export async function resolvePreboardingAccessToken(tenantId, preboardingId, jti, offerId = null) {
  if (offerId) {
    const offerToken = await resolveOfferAccessToken(tenantId, offerId, jti)
    if (!offerToken) return null
    const offer = await Offer.findOne({ _id: offerId, tenantId, deleted: false }).select('status')
    if (!offer) return null
    if (offer.status !== 'ACCEPTED') return { offerAccepted: false }
    const preboarding = await Preboarding.findOne({ tenantId, offerId, deleted: false }).select('_id')
    if (!preboarding) return null
    return { ...offerToken.toObject(), offerAccepted: true, preboardingId: preboarding._id }
  }

  const tokenDoc = await PreboardingAccessToken.findOne({ tenantId, preboardingId, tokenHash: hashJti(jti) })
  if (!tokenDoc || tokenDoc.revokedAt) return null
  return { ...tokenDoc.toObject(), offerAccepted: true, preboardingId }
}
