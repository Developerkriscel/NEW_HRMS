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

async function resolveConfiguredMail(tenantId) {
  const dbSettings = await getTenantMailSettings(tenantId)
  const envSettings = getEnvMailSettings()
  if (dbSettings?.enabled) {
    try {
      const dbPassword = decryptMailSecret(dbSettings)
      validateConfigured(dbSettings, dbPassword)
      return { settings: dbSettings, password: dbPassword }
    } catch (error) {
      // A stale tenant SMTP password should not hide a valid server-level
      // SMTP configuration, especially after rotating credentials in .env.
      if (!envSettings) throw error
    }
  }
  const envPassword = process.env.SMTP_PASS
  validateConfigured(envSettings, envPassword)
  return { settings: envSettings, password: envPassword }
}

function smtpOptions(settings, password) {
  const port = Number(settings.smtpPort || 587)
  const secure = !!settings.smtpSecure || port === 465
  const host = String(settings.smtpHost || '').trim()
  // Google displays app passwords in four-character groups. Users commonly
  // paste those spaces into settings, but Gmail SMTP expects the raw token.
  const normalizedPassword = /(^|\.)gmail\.com$|(^|\.)googlemail\.com$/i.test(host)
    ? String(password || '').replace(/\s+/g, '')
    : password
  return {
    host,
    port,
    secure,
    // Gmail/Workspace and most modern SMTP providers require STARTTLS on 587.
    requireTLS: !secure && port === 587,
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 10000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 10000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 15000),
    auth: settings.smtpUser ? { user: String(settings.smtpUser).trim(), pass: normalizedPassword } : undefined,
  }
}

export async function createTenantTransporter(tenantId) {
  const { settings, password } = await resolveConfiguredMail(tenantId)

  const transporter = nodemailer.createTransport(smtpOptions(settings, password))

  return { transporter, settings }
}

export async function assertTenantMailReady(tenantId) {
  const { settings } = await resolveConfiguredMail(tenantId)
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
  const recipient = String(to || '').trim()
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw new Error('A valid recipient email is required.')
  const { transporter, settings } = await createTenantTransporter(tenantId)
  const fromAddress = String(settings.fromEmail || settings.smtpUser || '').trim()
  if (!fromAddress) throw new Error('A valid sender email is required in Email Settings.')
  const from = settings.fromName ? `"${settings.fromName}" <${fromAddress}>` : fromAddress

  const message = {
    from,
    to: recipient,
    subject: String(subject || '').trim(),
    text: String(text || ''),
    html: html || textToHtml(text),
    replyTo: replyTo || settings.replyTo || fromAddress,
    attachments,
  }

  let lastError
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await transporter.sendMail(message)
    } catch (error) {
      lastError = error
      if (error?.code === 'EAUTH' || error?.responseCode === 535) {
        const authError = new Error('Gmail SMTP authentication failed. Use a 16-character Google App Password for SMTP_USER, remove spaces, update SMTP_PASS, and restart the server.')
        authError.code = 'EAUTH'
        authError.responseCode = 535
        throw authError
      }
      const retryable = ['ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN', 'ESOCKET'].includes(error?.code)
      if (!retryable || attempt === 2) break
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt))
    }
  }
  throw lastError
}
