export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import Subscription from '@/models/Subscription'
import InvoiceMetadata from '@/models/InvoiceMetadata'
import PaymentMetadata from '@/models/PaymentMetadata'

export const GET = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'subscription.view')

  const subscription = await Subscription.findOne({ tenant: params.id }).populate('plan', 'name price billingCycle')
  if (!subscription) return ok({ subscription: null, invoices: [] })

  const invoices = await InvoiceMetadata.find({ tenant: params.id, deleted: false }).sort({ createdAt: -1 })
  const payments = await PaymentMetadata.find({ tenant: params.id, deleted: false }).sort({ createdAt: -1 })
  const paymentsByInvoice = {}
  for (const p of payments) {
    const key = String(p.invoice)
    paymentsByInvoice[key] = paymentsByInvoice[key] || []
    paymentsByInvoice[key].push(p)
  }

  return ok({
    subscription,
    invoices: invoices.map((inv) => ({ ...inv.toObject(), payments: paymentsByInvoice[String(inv._id)] || [] })),
  })
})
