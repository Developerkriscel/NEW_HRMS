import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey() {
  const secret = process.env.MAIL_SETTINGS_SECRET || process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'nexahr-local-mail-settings-secret'
  return crypto.createHash('sha256').update(secret).digest()
}

export function encryptMailSecret(value) {
  if (!value) return { encrypted: '', iv: '', tag: '' }
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()])
  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  }
}

export function decryptMailSecret(settings) {
  if (!settings?.smtpPasswordEncrypted || !settings?.smtpPasswordIv || !settings?.smtpPasswordTag) return ''
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(settings.smtpPasswordIv, 'base64'))
  decipher.setAuthTag(Buffer.from(settings.smtpPasswordTag, 'base64'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(settings.smtpPasswordEncrypted, 'base64')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}
