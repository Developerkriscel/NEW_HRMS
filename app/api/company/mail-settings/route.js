export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { encryptMailSecret } from '@/lib/mailSettingsCrypto'
import { sanitizeMailSettings } from '@/lib/tenantMail'
import MailSettings from '@/models/MailSettings'

const EDIT_ROLES = ['COMPANY_ADMIN', 'SUPER_ADMIN']

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeBody(body) {
  return {
    enabled: !!body.enabled,
    fromName: String(body.fromName || 'NexaHR').trim(),
    fromEmail: normalizeEmail(body.fromEmail),
    replyTo: normalizeEmail(body.replyTo),
    smtpHost: String(body.smtpHost || '').trim(),
    smtpPort: Number(body.smtpPort || 587),
    smtpSecure: !!body.smtpSecure,
    smtpUser: String(body.smtpUser || '').trim(),
    smtpPassword: body.smtpPassword ? String(body.smtpPassword) : '',
    testRecipient: normalizeEmail(body.testRecipient),
  }
}

function validateSettings(data) {
  if (!data.enabled) return null
  if (!data.smtpHost) return 'SMTP host is required.'
  if (!Number.isFinite(data.smtpPort) || data.smtpPort < 1 || data.smtpPort > 65535) return 'SMTP port is invalid.'
  if (!data.fromEmail && !data.smtpUser) return 'From email or SMTP username is required.'
  return null
}

export const GET = withApi(async () => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const settings = await MailSettings.findOne({ tenantId, deleted: false })
  return ok(sanitizeMailSettings(settings))
})

export const PUT = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, EDIT_ROLES)
  const tenantId = requireTenantId(session)
  const data = normalizeBody(await req.json().catch(() => ({})))

  const validationError = validateSettings(data)
  if (validationError) return fail(validationError, 400, 'VALIDATION_ERROR')

  let settings = await MailSettings.findOne({ tenantId, deleted: false })
  if (!settings) {
    settings = new MailSettings({ tenantId, createdBy: session.sub })
  }

  settings.enabled = data.enabled
  settings.provider = 'SMTP'
  settings.fromName = data.fromName
  settings.fromEmail = data.fromEmail
  settings.replyTo = data.replyTo
  settings.smtpHost = data.smtpHost
  settings.smtpPort = data.smtpPort
  settings.smtpSecure = data.smtpSecure
  settings.smtpUser = data.smtpUser
  settings.testRecipient = data.testRecipient
  settings.updatedBy = session.sub

  if (data.smtpPassword) {
    const encrypted = encryptMailSecret(data.smtpPassword)
    settings.smtpPasswordEncrypted = encrypted.encrypted
    settings.smtpPasswordIv = encrypted.iv
    settings.smtpPasswordTag = encrypted.tag
  }

  if (data.enabled && data.smtpUser && !settings.smtpPasswordEncrypted) {
    return fail('SMTP password is required when SMTP username is configured.', 400, 'VALIDATION_ERROR')
  }

  await settings.save()

  await logAction(session, {
    action: 'MAIL_SETTINGS_UPDATED',
    entityType: 'MailSettings',
    entityId: settings._id,
    description: 'Company email settings updated',
  })

  return ok(sanitizeMailSettings(settings), 'Email settings saved')
})
