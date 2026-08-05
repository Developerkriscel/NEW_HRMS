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
import { devSuperAdminStore } from '@/lib/devSuperAdminStore'

const MODULE_KEYS = ['core_hr', 'attendance', 'leave', 'payroll', 'recruitment', 'performance', 'assets', 'ai_assistant']

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'platform.dashboard.view')
  if (session.devLogin && process.env.NODE_ENV !== 'production') return ok(devSuperAdminStore.dashboard())

  const { searchParams } = new URL(req.url)
  const days = Math.min(365, Math.max(7, Number(searchParams.get('days') || 90)))
  const since = new Date(Date.now() - days * 86400000)

  const [
    totalCompanies, activeCompanies, trialCompanies, graceCompanies, suspendedCompanies,
    totalPlans, recentTenants, failedProvisioning,
  ] = await Promise.all([
    Tenant.countDocuments({ deleted: false }),
    Tenant.countDocuments({ deleted: false, status: 'ACTIVE' }),
    Tenant.countDocuments({ deleted: false, status: 'TRIAL' }),
    Tenant.countDocuments({ deleted: false, status: 'GRACE' }),
    Tenant.countDocuments({ deleted: false, status: 'SUSPENDED' }),
    Plan.countDocuments({ deleted: false, active: true }),
    Tenant.find({ deleted: false }).sort({ createdAt: -1 }).limit(10).select('companyName tenantCode status provisioningStatus createdAt'),
    TenantProvisioningJob.find({ status: { $in: ['FAILED', 'PARTIALLY_COMPLETED'] } }).populate('tenant', 'companyName').sort({ updatedAt: -1 }).limit(10),
  ])

  // Employee/storage totals are read from the latest cached TenantUsage
  // snapshot per tenant rather than iterating every tenant's own database
  // live on every dashboard load — see lib/platformBilling.js's
  // computeUsageSnapshot for how those snapshots get taken.
  const latestUsagePerTenant = await TenantUsage.aggregate([
    { $sort: { tenant: 1, snapshotAt: -1 } },
    { $group: { _id: '$tenant', employeeCount: { $first: '$employeeCount' }, storageUsedMb: { $first: '$storageUsedMb' } } },
    { $group: { _id: null, totalEmployees: { $sum: '$employeeCount' }, totalStorageMb: { $sum: '$storageUsedMb' } } },
  ])
  const activeEmployees = latestUsagePerTenant[0]?.totalEmployees || 0
  const storageUsedMbFromSnapshots = latestUsagePerTenant[0]?.totalStorageMb || 0

  const [subscriptionSummaryRaw, tenantsByStatusRaw, planDistributionRaw, companiesByMonthRaw, subscriptionTrendRaw, storageAgg] = await Promise.all([
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
  ])

  const employeeTrendRaw = await TenantUsage.aggregate([
    { $match: { snapshotAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$snapshotAt' } }, employees: { $sum: '$employeeCount' }, storage: { $sum: '$storageUsedMb' } } },
    { $sort: { _id: 1 } },
  ])

  const featureBuckets = await Tenant.aggregate([{ $match: { deleted: false } }, { $project: { features: { $objectToArray: '$features' } } }])
  const moduleAdoption = MODULE_KEYS.map((key) => ({
    module: key,
    count: featureBuckets.filter((t) => t.features.some((f) => f.k === key && f.v === true)).length,
  }))

  const upcomingRenewals = await Subscription.find({
    status: { $in: ['ACTIVE', 'TRIAL', 'GRACE'] },
    endDate: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 86400000) },
  }).populate('tenant', 'companyName').populate('plan', 'name').sort({ endDate: 1 }).limit(10)

  return ok({
    cards: {
      totalCompanies, activeCompanies, trialCompanies, graceCompanies, suspendedCompanies,
      activeEmployees,
      storageUsedMb: storageAgg[0]?.used || storageUsedMbFromSnapshots || 0,
      storageLimitMb: storageAgg[0]?.limit || 0,
      totalPlans,
      failedProvisioningJobs: failedProvisioning.length,
    },
    charts: {
      companiesByMonth: companiesByMonthRaw.map((r) => ({ month: r._id, count: r.count })),
      tenantsByStatus: tenantsByStatusRaw.map((r) => ({ status: r._id, count: r.count })),
      planDistribution: planDistributionRaw.map((r) => ({ plan: r._id, count: r.count })),
      subscriptionTrend: subscriptionTrendRaw.map((r) => ({ month: r._id, count: r.count })),
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
  })
})
