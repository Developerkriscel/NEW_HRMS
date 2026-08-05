import crypto from 'crypto'
import { ApiError } from '@/lib/auth'

const SENSITIVE_KEYS = [
  'password',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'authorization',
  'cookie',
  'credential',
  'privateKey',
  'accessToken',
  'refreshToken',
]

function isSensitiveKey(key) {
  const normalized = String(key || '').toLowerCase()
  return SENSITIVE_KEYS.some((sensitive) => normalized.includes(sensitive.toLowerCase()))
}

export function redactSensitive(value) {
  if (Array.isArray(value)) return value.map(redactSensitive)
  if (!value || typeof value !== 'object') return value

  return Object.entries(value).reduce((acc, [key, nested]) => {
    acc[key] = isSensitiveKey(key) ? '[REDACTED]' : redactSensitive(nested)
    return acc
  }, {})
}

function encryptionKey() {
  const material = process.env.SECRET_ENCRYPTION_KEY || process.env.JWT_SECRET || 'NexaHR-local-secret-encryption-key'
  return crypto.createHash('sha256').update(material).digest()
}

export function encryptSecret(plainText) {
  if (!plainText || typeof plainText !== 'string') {
    throw new ApiError(400, 'A non-empty secret is required', 'SECRET_REQUIRED')
  }
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    preview: previewSecret(plainText),
  }
}

export function previewSecret(secret) {
  if (!secret) return 'redacted'
  const value = String(secret)
  const suffix = value.slice(-4)
  return `redacted:${suffix.padStart(4, '*')}`
}

export function validateWebhookUrl(url) {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw new ApiError(400, 'Webhook URL must be a valid URL', 'INVALID_WEBHOOK_URL')
  }

  if (parsed.protocol !== 'https:') {
    throw new ApiError(400, 'Webhook URL must use HTTPS', 'WEBHOOK_HTTPS_REQUIRED')
  }

  const hostname = parsed.hostname.toLowerCase()
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local')
  ) {
    throw new ApiError(400, 'Webhook URL cannot target local addresses', 'WEBHOOK_LOCAL_BLOCKED')
  }

  return parsed.toString()
}

export function signWebhookPayload(payload, secret) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload || {})
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

export function sanitizeCredential(doc) {
  if (!doc) return doc
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc }
  delete obj.secretCiphertext
  delete obj.secretIv
  delete obj.secretTag
  delete obj.signingSecretCiphertext
  delete obj.signingSecretIv
  delete obj.signingSecretTag
  delete obj.keyHash
  obj.secret = undefined
  return obj
}
