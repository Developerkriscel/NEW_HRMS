export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import mongoose from 'mongoose'
import Subscription from '@/models/Subscription'
import Tenant from '@/models/Tenant'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'platform.dashboard.view')

  const { searchParams } = new URL(req.url)
  const startDateStr = searchParams.get('startDate')
  const endDateStr = searchParams.get('endDate')
  const tenantId = searchParams.get('tenantId')
  const planId = searchParams.get('planId')

  const match = { deleted: false, status: 'ACTIVE' }
  
  if (startDateStr && endDateStr) {
    match.startDate = { $gte: new Date(startDateStr), $lte: new Date(endDateStr) }
  }

  if (tenantId) match.tenant = new mongoose.Types.ObjectId(tenantId)
  if (planId) match.plan = new mongoose.Types.ObjectId(planId)

  const mrrResult = await Subscription.aggregate([
    { $match: match },
    { $lookup: { from: 'plans', localField: 'plan', foreignField: '_id', as: 'planDoc' } },
    { $unwind: '$planDoc' },
    { $group: { _id: null, total: { $sum: '$planDoc.price' } } }
  ])

  const pendingResult = await Subscription.aggregate([
    { $match: { ...match, status: 'GRACE' } },
    { $lookup: { from: 'plans', localField: 'plan', foreignField: '_id', as: 'planDoc' } },
    { $unwind: '$planDoc' },
    { $group: { _id: null, total: { $sum: '$planDoc.price' } } }
  ])

  const activeCompaniesCount = await Subscription.distinct('tenant', match)
  
  const renewalsCount = await Subscription.countDocuments({ 
    ...match, 
    endDate: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 86400000) } 
  })

  return ok({
    collectedRevenue: mrrResult[0]?.total || 0,
    activeCompanies: activeCompaniesCount.length || 0,
    pendingRevenue: pendingResult[0]?.total || 0,
    refundAmount: 0,
    renewals: renewalsCount
  })
})
