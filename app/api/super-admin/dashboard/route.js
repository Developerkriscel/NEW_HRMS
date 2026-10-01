export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import Tenant from '@/models/Tenant'
import Plan from '@/models/Plan'
import Subscription from '@/models/Subscription'
import TenantProvisioningJob from '@/models/TenantProvisioningJob'
import TenantUsage from '@/models/TenantUsage'

const dashboardCache = global._nexahrDashboardCache || new Map()
global._nexahrDashboardCache = dashboardCache
const DASHBOARD_CACHE_TTL = 30000 // 30s server cache

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'platform.dashboard.view')

  const { searchParams } = new URL(req.url)
  const days = Math.min(365, Math.max(7, Number(searchParams.get('days') || 90)))
  
  const cacheKey = `dashboard:${days}`
  const cached = dashboardCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < DASHBOARD_CACHE_TTL) {
    return ok(cached.data)
  }

  const since = new Date(Date.now() - days * 86400000)

    const [
    statusCountsRaw,
    totalPlans,
    recentTenants,
    failedProvisioning,
    latestUsagePerTenant,
    subscriptionSummaryRaw,
    tenantsByStatusRaw,
    planDistributionRaw,
    companiesByMonthRaw,
    subscriptionTrendRaw,
    storageAgg,
    employeeTrendRaw,
    upcomingRenewals
  ] = await Promise.all([
    Tenant.aggregate([{ $match: { deleted: false } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Plan.countDocuments({ deleted: false, active: true }),
    Tenant.find({ deleted: false }).sort({ createdAt: -1 }).limit(10).select('companyName tenantCode status provisioningStatus createdAt').lean(),
    TenantProvisioningJob.find({ status: { $in: ['FAILED', 'PARTIALLY_COMPLETED'] } }).populate('tenant', 'companyName').sort({ updatedAt: -1 }).limit(10).lean(),
    TenantUsage.aggregate([
      { $sort: { tenant: 1, snapshotAt: -1 } },
      { $group: { _id: '$tenant', employeeCount: { $first: '$employeeCount' }, storageUsedMb: { $first: '$storageUsedMb' } } },
      { $group: { _id: null, totalEmployees: { $sum: '$employeeCount' }, totalStorageMb: { $sum: '$storageUsedMb' } } },
    ]),
    Subscription.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Tenant.aggregate([{ $match: { deleted: false } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Tenant.aggregate([
      { $match: { deleted: false, plan: { $ne: null } } },
      { $lookup: { from: 'plans', localField: 'plan', foreignField: '_id', as: 'planDoc' } },
      { $unwind: '$planDoc' },
      { $group: { _id: '$planDoc.name', count: { $sum: 1 } } },
    ]),
    Tenant.aggregate([
      { $match: { deleted: false, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Subscription.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Tenant.aggregate([{ $match: { deleted: false } }, { $group: { _id: null, used: { $sum: '$storageUsedMb' }, limit: { $sum: '$storageLimitMb' } } }]),
    TenantUsage.aggregate([
      { $match: { snapshotAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$snapshotAt' } }, employees: { $sum: '$employeeCount' }, storage: { $sum: '$storageUsedMb' } } },
      { $sort: { _id: 1 } },
    ]),
    Subscription.find({
      status: { $in: ['ACTIVE', 'TRIAL', 'GRACE'] },
      endDate: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 86400000) },
    }).populate('tenant', 'companyName').populate('plan', 'name').sort({ endDate: 1 }).limit(10).lean(),
  ])

  const statusMap = Object.fromEntries(statusCountsRaw.map((r) => [r._id, r.count]))
  const totalCompanies = statusCountsRaw.reduce((acc, r) => acc + r.count, 0)
  const activeCompanies = statusMap['ACTIVE'] || 0
  const trialCompanies = statusMap['TRIAL'] || 0
  const graceCompanies = statusMap['GRACE'] || 0
  const suspendedCompanies = statusMap['SUSPENDED'] || 0
  const activeEmployees = latestUsagePerTenant[0]?.totalEmployees || 0
  const storageUsedMbFromSnapshots = latestUsagePerTenant[0]?.totalStorageMb || 0

  const subscriptionTrend = subscriptionTrendRaw.map((r) => ({ month: r._id, count: r.count }))
  const tenantsByStatus = tenantsByStatusRaw.map((r) => ({ status: r._id, count: r.count }))
  const planDistribution = planDistributionRaw.map((r) => ({ plan: r._id, count: r.count }))
  const moduleAdoption = []

  const result = {
    cards: {
      totalCompanies,
      activeCompanies,
      trialCompanies,
      graceCompanies, 
      suspendedCompanies,
      activeEmployees,
      storageUsedMb: storageAgg[0]?.used || storageUsedMbFromSnapshots || 0,
      storageLimitMb: storageAgg[0]?.limit || 0,
      totalPlans,
      failedProvisioningJobs: failedProvisioning.length,
    },
    charts: {
      companiesByMonth: companiesByMonthRaw.map((r) => ({ month: r._id, count: r.count })),
      tenantsByStatus,
      planDistribution,
      subscriptionTrend,
      employeeTrend: employeeTrendRaw.map((r) => ({ date: r._id, count: r.employees })),
      storageTrend: employeeTrendRaw.map((r) => ({ date: r._id, mb: r.storage })),
      moduleAdoption,
    },
    tables: {
      recentCompanies: recentTenants,
      failedProvisioning,
      upcomingRenewals,
      subscriptionSummary: subscriptionSummaryRaw.map((r) => ({ status: r._id, count: r.count })),
    },
  }

  dashboardCache.set(cacheKey, { data: result, timestamp: Date.now() })
  return ok(result)
})
