export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import Subscription from '@/models/Subscription'
import SubscriptionHistory from '@/models/SubscriptionHistory'
import SubscriptionCredit from '@/models/SubscriptionCredit'
import InvoiceMetadata from '@/models/InvoiceMetadata'

export const GET = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'subscription.view')

  const subscription = await Subscription.findOne({ _id: params.id, deleted: false }).populate('tenant').populate('plan')
  if (!subscription) return fail('Subscription not found', 404)

  const [history, credits, invoices] = await Promise.all([
    SubscriptionHistory.find({ subscription: subscription._id }).sort({ createdAt: -1 }).limit(100),
    SubscriptionCredit.find({ subscription: subscription._id, deleted: false }).sort({ createdAt: -1 }),
    InvoiceMetadata.find({ subscription: subscription._id, deleted: false }).sort({ createdAt: -1 }),
  ])

  return ok({ subscription, history, credits, invoices })
})
