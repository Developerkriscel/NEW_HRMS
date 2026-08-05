export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { logSuperAdmin } from '@/lib/audit'
import InvoiceMetadata from '@/models/InvoiceMetadata'
import PaymentMetadata from '@/models/PaymentMetadata'

export const GET = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'subscription.view')
  const payments = await PaymentMetadata.find({ invoice: params.id, deleted: false }).sort({ createdAt: -1 })
  return ok(payments)
})

// Records that a payment was received — no gateway call, no charge. See
// models/PaymentMetadata.js.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'billing.invoice.manage')

  const body = await req.json()
  const { amount, currency, method, reference, paidAt } = body
  if (!amount || amount <= 0) return fail('A positive payment amount is required', 400)
  if (!paidAt) return fail('paidAt is required', 400)

  const invoice = await InvoiceMetadata.findOne({ _id: params.id, deleted: false })
  if (!invoice) return fail('Invoice not found', 404)

  const payment = await PaymentMetadata.create({
    invoice: invoice._id,
    tenant: invoice.tenant,
    amount,
    currency: currency || invoice.currency,
    method: method || 'OTHER',
    reference,
    paidAt: new Date(paidAt),
    recordedBy: session.userId,
  })

  const totalPaid = (await PaymentMetadata.find({ invoice: invoice._id, deleted: false })).reduce((sum, p) => sum + p.amount, 0)
  if (totalPaid >= invoice.amount && invoice.status !== 'PAID') {
    invoice.status = 'PAID'
    invoice.updatedBy = session.sub
    await invoice.save()
  }

  await logSuperAdmin(session, {
    action: 'PAYMENT_RECORDED',
    entityType: 'PaymentMetadata',
    entityId: payment._id,
    description: `Payment of ${amount} ${payment.currency} recorded against invoice ${invoice.invoiceNumber}`,
    req,
  })

  return ok(payment, 'Payment recorded', 201)
})
