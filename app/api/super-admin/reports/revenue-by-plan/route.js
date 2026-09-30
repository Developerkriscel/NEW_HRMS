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

  const match = { deleted: false, status: 'ACTIVE' }
  
  if (startDateStr && endDateStr) {
    match.startDate = { $gte: new Date(startDateStr), $lte: new Date(endDateStr) }
  }

  if (tenantId) match.tenant = new mongoose.Types.ObjectId(tenantId)

  const pipeline = [
    { $match: match },
    { $lookup: { from: 'plans', localField: 'plan', foreignField: '_id', as: 'planDoc' } },
    { $unwind: '$planDoc' },
    { $group: { _id: '$planDoc._id', planName: { $first: '$planDoc.name' }, revenue: { $sum: '$planDoc.price' }, companies: { $addToSet: '$tenant' } } },
    { $project: { _id: 1, planName: 1, revenue: 1, companyCount: { $size: '$companies' } } },
    { $sort: { revenue: -1 } }
  ]

  const results = await Subscription.aggregate(pipeline)

  return ok(results)
})
