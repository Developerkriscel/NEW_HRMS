export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { sendTenantEmail, getTenantMailSettings } from '@/lib/tenantMail'
import MailSettings from '@/models/MailSettings'

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))
  const recipient = String(body.to || '').trim().toLowerCase()
  if (!recipient) return fail('Test recipient email is required.', 400, 'VALIDATION_ERROR')

  try {
    await sendTenantEmail(tenantId, {
      to: recipient,
      subject: 'NexaHR test email',
      text: 'This is a test email from NexaHR. Your SMTP settings are working correctly.',
    })

    await MailSettings.updateOne(
      { tenantId, deleted: false },
      { $set: { testRecipient: recipient, lastTestedAt: new Date(), lastTestStatus: 'SUCCESS', lastTestError: '', updatedBy: session.sub } }
    )

    const settings = await getTenantMailSettings(tenantId)
    return ok({ lastTestedAt: settings?.lastTestedAt, lastTestStatus: settings?.lastTestStatus }, 'Test email sent')
  } catch (err) {
    await MailSettings.updateOne(
      { tenantId, deleted: false },
      { $set: { testRecipient: recipient, lastTestedAt: new Date(), lastTestStatus: 'FAILED', lastTestError: err.message || 'Email test failed', updatedBy: session.sub } }
    )
    return fail(err.message || 'Email test failed', 400, 'EMAIL_TEST_FAILED')
  }
})
