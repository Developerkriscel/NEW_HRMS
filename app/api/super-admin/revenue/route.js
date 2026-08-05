export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole } from '@/lib/auth'
import Subscription from '@/models/Subscription'
import { devSuperAdminStore } from '@/lib/devSuperAdminStore'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, 'SUPER_ADMIN')
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || 'monthly' // accepted but doesn't change the calculation, matching the original
  if (session.devLogin && process.env.NODE_ENV !== 'production') return ok(devSuperAdminStore.revenue(period))

  const activeSubs = await Subscription.find({ status: 'ACTIVE' }).populate('plan')
  const monthlyRecurring = activeSubs.reduce((sum, s) => sum + (s.plan?.price || 0), 0)
  const annualRecurring = monthlyRecurring * 12

  return ok({ period, monthlyRecurring, annualRecurring })
})
