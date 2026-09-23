import nodemailer from 'nodemailer'
import { decryptMailSecret } from './mailSettingsCrypto'
import MailSettings from '@/models/MailSettings'

export function getAppBaseUrl() {
  return (process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
}

export function sanitizeMailSettings(settings) {
  if (!settings) {
    return {
      provider: 'SMTP',
      enabled: false,
      fromName: 'NexaHR',
      fromEmail: '',
      replyTo: '',
      smtpHost: '',
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: '',
      hasPassword: false,
      testRecipient: '',
      lastTestedAt: null,
      lastTestStatus: null,
      lastTestError: '',
    }
  }

  return {
    id: String(settings._id),
    provider: settings.provider || 'SMTP',
    enabled: !!settings.enabled,
    fromName: settings.fromName || 'NexaHR',
    fromEmail: settings.fromEmail || '',
    replyTo: settings.replyTo || '',
    smtpHost: settings.smtpHost || '',
    smtpPort: Number(settings.smtpPort || 587),
    smtpSecure: !!settings.smtpSecure,
    smtpUser: settings.smtpUser || '',
    hasPassword: !!settings.smtpPasswordEncrypted,
    testRecipient: settings.testRecipient || '',
    lastTestedAt: settings.lastTestedAt || null,
    lastTestStatus: settings.lastTestStatus || null,
    lastTestError: settings.lastTestError || '',
    updatedAt: settings.updatedAt || null,
  }
}

export async function getTenantMailSettings(tenantId) {
  return MailSettings.findOne({ tenantId, deleted: false })
}

function envSmtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS)
}

function parseFromEmail(value) {
  const match = String(value || '').match(/<([^>]+)>/)
  return (match?.[1] || value || '').replace(/"/g, '').trim()
}

function getEnvMailSettings() {
  if (!envSmtpConfigured()) return null
  return {
    enabled: true,
    fromName: 'NexaHR',
    fromEmail: parseFromEmail(process.env.SMTP_FROM) || process.env.SMTP_USER,
    replyTo: process.env.SMTP_USER,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: Number(process.env.SMTP_PORT || 587),
    smtpSecure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    smtpUser: process.env.SMTP_USER,
    source: 'env',
  }
}

function validateConfigured(settings, password) {
  if (!settings?.enabled) throw new Error('Email settings are disabled. Enable SMTP from Settings > Email Settings first, or configure SMTP_* in .env.local and restart the server.')
  if (!settings.smtpHost || !settings.smtpPort) throw new Error('SMTP host and port are required in Email Settings.')
  if (!settings.fromEmail && !settings.smtpUser) throw new Error('From email or SMTP username is required in Email Settings.')
  if (settings.smtpUser && !password) throw new Error('SMTP password is missing in Email Settings.')
}

export async function createTenantTransporter(tenantId) {
  const dbSettings = await getTenantMailSettings(tenantId)
  const useDbSettings = !!dbSettings?.enabled
  const settings = useDbSettings ? dbSettings : getEnvMailSettings()
  const password = useDbSettings ? decryptMailSecret(settings) : process.env.SMTP_PASS
  validateConfigured(settings, password)

  const auth = settings.smtpUser ? { user: settings.smtpUser, pass: password } : undefined
  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: Number(settings.smtpPort || 587),
    secure: !!settings.smtpSecure,
    auth,
  })

  return { transporter, settings }
}

export async function assertTenantMailReady(tenantId) {
  const dbSettings = await getTenantMailSettings(tenantId)
  const useDbSettings = !!dbSettings?.enabled
  const settings = useDbSettings ? dbSettings : getEnvMailSettings()
  const password = useDbSettings ? decryptMailSecret(settings) : process.env.SMTP_PASS
  validateConfigured(settings, password)
  return settings
}

export function textToHtml(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim() ? line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '&nbsp;')
    .map((line) => `<p style="margin:0 0 12px">${line}</p>`)
    .join('')
}

export async function sendTenantEmail(tenantId, { to, subject, text, html, attachments = [], replyTo }) {
  if (!to) throw new Error('Recipient email is missing.')
  const { transporter, settings } = await createTenantTransporter(tenantId)
  const fromAddress = settings.fromEmail || settings.smtpUser
  const from = settings.fromName ? `"${settings.fromName}" <${fromAddress}>` : fromAddress

  return transporter.sendMail({
    from,
    to,
    subject,
    text,
    html: html || textToHtml(text),
    replyTo: replyTo || settings.replyTo || fromAddress,
    attachments,
  })
}
