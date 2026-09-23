import nodemailer from 'nodemailer'
import { sendTenantEmail } from './tenantMail'

function smtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS)
}

function appUrl() {
  return (process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

function buildInvitationEmail({ employee, password, companyName }) {
  const loginUrl = `${appUrl()}/login`
  const name = employee.getFullName ? employee.getFullName() : `${employee.firstName} ${employee.lastName}`
  const subject = `Welcome to ${companyName || 'NexaHR'} - your login details`
  const text = [
    `Hi ${name},`,
    '',
    `Your ${companyName || 'NexaHR'} account has been created.`,
    '',
    `Login URL: ${loginUrl}`,
    `Employee ID: ${employee.employeeCode || '-'}`,
    `Login email: ${employee.email}`,
    `Temporary password: ${password}`,
    '',
    'Please sign in and change your password after your first login.',
    '',
    'Regards,',
    companyName || 'NexaHR',
  ].join('\n')
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
      <h2 style="margin:0 0 12px">Welcome to ${companyName || 'NexaHR'}</h2>
      <p>Hi ${name},</p>
      <p>Your account has been created. Use the credentials below to sign in.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0">
        <p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
        <p><strong>Employee ID:</strong> ${employee.employeeCode || '-'}</p>
        <p><strong>Login email:</strong> ${employee.email}</p>
        <p><strong>Temporary password:</strong> ${password}</p>
      </div>
      <p>Please sign in and change your password after your first login.</p>
      <p>Regards,<br />${companyName || 'NexaHR'}</p>
    </div>
  `
  return { subject, text, html }
}

export async function sendEmployeeInvitationEmail({ employee, password, companyName, tenantId }) {
  const email = buildInvitationEmail({ employee, password, companyName })

  if (tenantId) {
    try {
      await sendTenantEmail(tenantId, { to: employee.email, ...email })
      return { sent: true, skipped: false, reason: null }
    } catch (err) {
      if (!smtpConfigured()) {
        console.error('[employee invitation email] tenant SMTP failed', err)
        return { sent: false, skipped: false, reason: err.message || 'Email delivery failed' }
      }
    }
  }

  if (!smtpConfigured()) {
    return { sent: false, skipped: true, reason: 'SMTP is not configured' }
  }

  try {
    await createTransporter().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: employee.email,
      ...email,
    })
    return { sent: true, skipped: false, reason: null }
  } catch (err) {
    console.error('[employee invitation email] failed', err)
    return { sent: false, skipped: false, reason: err.message || 'Email delivery failed' }
  }
}
