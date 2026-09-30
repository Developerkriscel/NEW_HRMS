export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import mongoose from 'mongoose'
import Subscription from '@/models/Subscription'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'platform.dashboard.view')

  const { searchParams } = new URL(req.url)
  const startDateStr = searchParams.get('startDate')
  const endDateStr = searchParams.get('endDate')
  const tenantId = searchParams.get('tenantId')
  const planId = searchParams.get('planId')
  const limit = parseInt(searchParams.get('limit') || '5', 10)

  const match = { deleted: false, status: 'ACTIVE' }
  
  if (startDateStr && endDateStr) {
    match.startDate = { $gte: new Date(startDateStr), $lte: new Date(endDateStr) }
  }

  if (tenantId) match.tenant = new mongoose.Types.ObjectId(tenantId)
  if (planId) match.plan = new mongoose.Types.ObjectId(planId)

  const pipeline = [
    { $match: match },
    { $lookup: { from: 'plans', localField: 'plan', foreignField: '_id', as: 'planDoc' } },
    { $unwind: '$planDoc' },
    { $lookup: { from: 'tenants', localField: 'tenant', foreignField: '_id', as: 'tenantDoc' } },
    { $unwind: '$tenantDoc' },
    { $group: { _id: '$tenantDoc._id', companyName: { $first: '$tenantDoc.companyName' }, revenue: { $sum: '$planDoc.price' } } },
    { $sort: { revenue: -1 } },
    { $limit: limit }
  ]

  const results = await Subscription.aggregate(pipeline)

  return ok(results)
})
