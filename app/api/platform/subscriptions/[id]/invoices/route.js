export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { logSuperAdmin } from '@/lib/audit'
import Subscription from '@/models/Subscription'
import InvoiceMetadata from '@/models/InvoiceMetadata'

export const GET = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'subscription.view')
  const invoices = await InvoiceMetadata.find({ subscription: params.id, deleted: false }).sort({ createdAt: -1 })
  return ok(invoices)
})

// Metadata only — no invoice numbering scheme, tax calculation, or totals
// engine. The operator supplies the invoice number and amount directly.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'billing.invoice.manage')

  const body = await req.json()
  const { invoiceNumber, amount, currency, status, issuedAt, dueAt, notes } = body
  if (!invoiceNumber || !amount) return fail('invoiceNumber and amount are required', 400)

  const subscription = await Subscription.findOne({ _id: params.id, deleted: false })
  if (!subscription) return fail('Subscription not found', 404)

  const existing = await InvoiceMetadata.findOne({ invoiceNumber })
  if (existing) return fail('An invoice with this number already exists', 400, 'DUPLICATE')

  const invoice = await InvoiceMetadata.create({
    tenant: subscription.tenant,
    subscription: subscription._id,
    invoiceNumber,
    amount,
    currency: currency || 'INR',
    status: status || 'DRAFT',
    issuedAt: issuedAt ? new Date(issuedAt) : null,
    dueAt: dueAt ? new Date(dueAt) : null,
    notes,
    createdBy: session.sub,
  })

  await logSuperAdmin(session, {
    action: 'INVOICE_RECORDED',
    entityType: 'InvoiceMetadata',
    entityId: invoice._id,
    description: `Invoice ${invoice.invoiceNumber} recorded for ${amount} ${invoice.currency}`,
    req,
  })

  return ok(invoice, 'Invoice recorded', 201)
})
