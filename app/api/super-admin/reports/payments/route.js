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
  const page = parseInt(searchParams.get('page') || '0', 10)
  const limit = parseInt(searchParams.get('limit') || '10', 10)
  const skip = page * limit

  const match = { deleted: false, status: { $in: ['ACTIVE', 'TRIAL', 'GRACE'] } }
  
  if (startDateStr && endDateStr) {
    match.startDate = { $gte: new Date(startDateStr), $lte: new Date(endDateStr) }
  }

  if (tenantId) match.tenant = new mongoose.Types.ObjectId(tenantId)
  if (planId) match.plan = new mongoose.Types.ObjectId(planId)

  let pipeline = [
    { $match: match },
    { $lookup: { from: 'tenants', localField: 'tenant', foreignField: '_id', as: 'tenantDoc' } },
    { $unwind: '$tenantDoc' },
    { $lookup: { from: 'plans', localField: 'plan', foreignField: '_id', as: 'planDoc' } },
    { $unwind: '$planDoc' },
  ]

  const countPipeline = [...pipeline, { $count: 'total' }]
  const itemsPipeline = pipeline.concat([
    { $sort: { startDate: -1 } },
    { $skip: skip },
    { $limit: limit },
    { $project: {
        _id: 1,
        amount: '$planDoc.price',
        currency: { $literal: 'INR' },
        method: { $literal: 'PLATFORM_SUB' },
        reference: '$_id',
        paidAt: '$startDate',
        invoiceNumber: { $concat: ['SUB-', { $substr: ['$_id', 18, -1] }] },
        companyName: '$tenantDoc.companyName',
        planName: '$planDoc.name'
    }}
  ])

  const [countResult, results] = await Promise.all([
    Subscription.aggregate(countPipeline),
    Subscription.aggregate(itemsPipeline),
  ])
  const total = countResult[0]?.total || 0

  return ok({
    data: results,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  })
})
