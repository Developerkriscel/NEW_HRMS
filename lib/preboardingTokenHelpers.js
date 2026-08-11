// Step 15 item 5 — secure candidate preboarding-form links. Exact same
// hybrid pattern as lib/offerTokenHelpers.js: a signed JWT carrying only
// { tenantId, preboardingId, jti, purpose } resolves the tenant before any
// DB query; only sha256(jti) is ever persisted (models/PreboardingAccessToken.js).
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import Tenant from '@/models/Tenant'
import PreboardingAccessToken from '@/models/PreboardingAccessToken'

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
  if (decoded?.purpose !== 'candidate_preboarding' || !decoded.tenantId || !decoded.preboardingId || !decoded.jti) return null

  const tenant = await Tenant.findOne({ _id: decoded.tenantId, deleted: false })
  if (!tenant) return null
  return { tenant, preboardingId: decoded.preboardingId, jti: decoded.jti }
}

// Stage 2 — call inside runForTenant(tenant, ...).
export async function resolvePreboardingAccessToken(tenantId, preboardingId, jti) {
  const tokenDoc = await PreboardingAccessToken.findOne({ tenantId, preboardingId, tokenHash: hashJti(jti) })
  if (!tokenDoc || tokenDoc.revokedAt) return null
  return tokenDoc
}
