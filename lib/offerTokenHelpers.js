// Step 14 — secure candidate offer links. Deliberately a hybrid of the two
// patterns already in this codebase: the outer public URL is a signed JWT
// (same shape as lib/assessmentHelpers.js — { tenantId, offerId, jti,
// purpose }, no `exp` claim) so an unauthenticated request can resolve
// *which tenant database* to even look in before touching Mongo; but
// unlike the assessment token, only a random `jti` travels inside it —
// what's actually persisted (in offer_access_tokens, inside the tenant's
// own DB) is sha256(jti), never the token itself. That split is what lets
// a specific link be revoked (Withdraw, or issuing a fresh one on resend)
// without needing a JWT blacklist.
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import Tenant from '@/models/Tenant'
import OfferAccessToken from '@/models/OfferAccessToken'

const JWT_SECRET = process.env.JWT_SECRET || 'NexaHRSuperSecretKey2025ForJWTTokenSigningMustBe256BitsOrMore'

function hashJti(jti) {
  return crypto.createHash('sha256').update(jti).digest('hex')
}

// Issues a new public link. Call inside the tenant's own DB context
// (OfferAccessToken is tenant-scoped) — every route that calls this is
// already running inside runForTenant/an authenticated tenant session.
export async function issueOfferToken(tenantId, offerId, expiresAt) {
  const jti = crypto.randomBytes(24).toString('hex')
  await OfferAccessToken.create({ tenantId, offerId, tokenHash: hashJti(jti), expiresAt: expiresAt || null })
  return jwt.sign(
    { tenantId: String(tenantId), offerId: String(offerId), jti, purpose: 'candidate_offer' },
    JWT_SECRET,
    { algorithm: 'HS256' }
  )
}

// Invalidates every currently-active link for an offer — Withdraw, or
// whenever a fresh link is (re)issued so old copies stop working.
export async function revokeOfferTokens(tenantId, offerId) {
  await OfferAccessToken.updateMany({ tenantId, offerId, revokedAt: null }, { revokedAt: new Date() })
}

// Stage 1 — verify the JWT and resolve the tenant. Works with zero tenant
// DB context, same as resolveAssessmentToken.
export async function resolveOfferTokenClaims(token) {
  let decoded
  try {
    decoded = jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
  if (decoded?.purpose !== 'candidate_offer' || !decoded.tenantId || !decoded.offerId || !decoded.jti) return null

  const tenant = await Tenant.findOne({ _id: decoded.tenantId, deleted: false })
  if (!tenant) return null
  return { tenant, offerId: decoded.offerId, jti: decoded.jti }
}

// Stage 2 — call inside runForTenant(tenant, ...). Confirms the specific
// link hasn't been revoked and marks first use. Offer expiry itself is
// checked by the caller against the live Offer document, not this row.
export async function resolveOfferAccessToken(tenantId, offerId, jti) {
  const tokenDoc = await OfferAccessToken.findOne({ tenantId, offerId, tokenHash: hashJti(jti) })
  if (!tokenDoc || tokenDoc.revokedAt) return null
  if (!tokenDoc.usedAt) {
    tokenDoc.usedAt = new Date()
    await tokenDoc.save()
  }
  return tokenDoc
}
