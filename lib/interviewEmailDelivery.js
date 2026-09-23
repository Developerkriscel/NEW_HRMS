import { sendTenantEmail, textToHtml } from './tenantMail'

function fullName(candidate) {
  if (candidate?.getFullName) return candidate.getFullName()
  return [candidate?.firstName, candidate?.lastName].filter(Boolean).join(' ') || 'Candidate'
}

function formatDate(date) {
  if (!date) return 'Scheduled date'
  return new Date(date).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function splitSubjectAndBody(draft, fallbackSubject) {
  const lines = String(draft || '').replace(/\r\n/g, '\n').split('\n')
  const first = lines[0] || ''
  if (/^subject\s*:/i.test(first)) {
    const subject = first.replace(/^subject\s*:/i, '').trim() || fallbackSubject
    return { subject, body: lines.slice(1).join('\n').trim() }
  }
  return { subject: fallbackSubject, body: String(draft || '').trim() }
}

export function buildInterviewEmailDraft({ candidate, job, interview, body }) {
  const name = fullName(candidate)
  const jobTitle = job?.publicTitle || job?.jobTitle || 'the role'
  const fallbackSubject = `Interview Invitation - ${jobTitle}`
  const supplied = body?.candidateEmailBody || body?.candidateInstructions
  if (supplied) return splitSubjectAndBody(supplied, body?.candidateEmailSubject || fallbackSubject)

  return {
    subject: body?.candidateEmailSubject || fallbackSubject,
    body: `Dear ${name},

Congratulations! You have been shortlisted for the ${jobTitle} position.

Interview Details:
- Round: ${interview.roundName}
- Date: ${formatDate(interview.date)}
- Time: ${interview.startTime} - ${interview.endTime} (${interview.timezone || 'Asia/Kolkata'})
- Mode: ${interview.mode}
${interview.meetingUrl ? `- Meeting Link: ${interview.meetingUrl}` : ''}
${interview.location ? `- Location: ${interview.location}` : ''}

Please reply to this email to confirm if this time works for you.

Best regards,
NexaHR Talent Acquisition Team`,
  }
}

export async function sendInterviewInviteEmail({ tenantId, candidate, job, interview, body }) {
  const to = body?.candidateEmail || candidate?.email
  const draft = buildInterviewEmailDraft({ candidate, job, interview, body })
  const detailsHtml = `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:20px 0">
      <p style="margin:0 0 8px"><strong>Round:</strong> ${interview.roundName}</p>
      <p style="margin:0 0 8px"><strong>Date:</strong> ${formatDate(interview.date)}</p>
      <p style="margin:0 0 8px"><strong>Time:</strong> ${interview.startTime} - ${interview.endTime} (${interview.timezone || 'Asia/Kolkata'})</p>
      <p style="margin:0"><strong>Mode:</strong> ${interview.mode}</p>
      ${interview.meetingUrl ? `<p style="margin:8px 0 0"><strong>Meeting Link:</strong> <a href="${interview.meetingUrl}">${interview.meetingUrl}</a></p>` : ''}
      ${interview.location ? `<p style="margin:8px 0 0"><strong>Location:</strong> ${interview.location}</p>` : ''}
    </div>
  `

  return sendTenantEmail(tenantId, {
    to,
    subject: draft.subject,
    text: draft.body,
    html: `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6">${textToHtml(draft.body)}${detailsHtml}</div>`,
  })
}
