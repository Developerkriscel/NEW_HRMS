export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Tenant from '@/models/Tenant'
import Module from '@/models/Module'
import '@/models/Plan'
import PlanModule from '@/models/PlanModule'
import Subscription from '@/models/Subscription'

const LABELS = {
  core_hr: 'Core HR',
  attendance: 'Attendance',
  leave: 'Leave Management',
  payroll: 'Payroll',
  recruitment: 'Recruitment',
  performance: 'Performance',
  assets: 'Assets',
  helpdesk: 'Helpdesk',
  training: 'Training',
  reports: 'Reports',
  ai_assistant: 'AI Assistant',
}

const DESCRIPTIONS = {
  core_hr: 'Employee records, org structure, and company profile basics.',
  attendance: 'Punch in/out, attendance review, regularization, and reports.',
  leave: 'Leave requests, approvals, balances, and holiday calendars.',
  payroll: 'Salary structures, payroll runs, payslips, and statutory summaries.',
  recruitment: 'Jobs, applications, interviews, offers, and onboarding.',
  performance: 'KRA, review cycles, and performance tracking.',
  assets: 'Asset allocation, recovery, and employee asset history.',
  helpdesk: 'Employee tickets, support queues, and issue tracking.',
  training: 'Training sessions, assignments, and completion tracking.',
  reports: 'Company analytics, HR reports, and operational exports.',
  ai_assistant: 'AI-powered assistance and automated analysis features.',
}

function humanize(key) {
  return LABELS[key] || String(key || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function featureMapToObject(features) {
  if (!features) return {}
  if (features instanceof Map) return Object.fromEntries(features.entries())
  if (typeof features.toObject === 'function') return features.toObject()
  return { ...features }
}

function moduleFromKey(key, index = 0) {
  return {
    key,
    name: humanize(key),
    description: DESCRIPTIONS[key] || 'Configured product feature for this tenant.',
    category: 'Workspace',
    dependencies: [],
    status: 'ACTIVE',
    sortOrder: index,
  }
}

export const GET = withApi(async () => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)

  const tenant = await Tenant.findOne({ _id: tenantId, deleted: false }).populate('plan')
  if (!tenant) return fail('Company profile not found', 404)

  const subscription = await Subscription.findOne({
    tenant: tenantId,
    deleted: false,
    status: { $in: ['TRIAL', 'ACTIVE', 'GRACE'] },
  }).populate('plan').lean()

  const currentPlan = subscription?.plan || tenant.plan || null
  const tenantFeatures = featureMapToObject(tenant.features)
  const enabledKeys = Object.entries(tenantFeatures).filter(([, enabled]) => !!enabled).map(([key]) => key)
  const planFeatureKeys = Array.isArray(currentPlan?.features) ? currentPlan.features : []

  const [catalogue, planMappings] = await Promise.all([
    Module.find({ deleted: false, status: 'ACTIVE' }).sort({ category: 1, name: 1 }).lean(),
    currentPlan?._id ? PlanModule.find({ plan: currentPlan._id }).populate('module').lean() : [],
  ])

  const moduleByKey = new Map()
  catalogue.forEach((module_, index) => {
    moduleByKey.set(module_.key, { ...module_, sortOrder: index })
  })

  const mappingByKey = new Map()
  planMappings.forEach((mapping) => {
    if (mapping.module?.key) {
      mappingByKey.set(mapping.module.key, mapping.availability)
      if (!moduleByKey.has(mapping.module.key)) moduleByKey.set(mapping.module.key, mapping.module)
    }
  })

  const allKeys = new Set([
    ...catalogue.map((module_) => module_.key),
    ...enabledKeys,
    ...planFeatureKeys,
    ...planMappings.map((mapping) => mapping.module?.key).filter(Boolean),
  ])

  const modules = Array.from(allKeys).map((key, index) => {
    const module_ = moduleByKey.get(key) || moduleFromKey(key, index)
    const planAvailability = mappingByKey.get(key) || (planFeatureKeys.includes(key) ? 'INCLUDED' : 'UNAVAILABLE')
    const enabled = !!tenantFeatures[key]
    return {
      key,
      name: module_.name || humanize(key),
      description: module_.description || DESCRIPTIONS[key] || 'Configured product feature for this tenant.',
      category: module_.category || 'Workspace',
      dependencies: module_.dependencies || [],
      planAvailability,
      enabled,
      locked: !enabled,
      source: enabled ? 'Tenant enabled' : planAvailability === 'ADD_ON' ? 'Available as add-on' : 'Plan upgrade required',
    }
  }).sort((a, b) => {
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return ok({
    currentPlan: currentPlan ? {
      _id: currentPlan._id,
      name: currentPlan.name,
      billingCycle: currentPlan.billingCycle,
      employeeLimit: currentPlan.employeeLimit,
    } : null,
    summary: {
      total: modules.length,
      enabled: modules.filter((module_) => module_.enabled).length,
      availableAddOns: modules.filter((module_) => !module_.enabled && module_.planAvailability === 'ADD_ON').length,
      upgradeRequired: modules.filter((module_) => !module_.enabled && module_.planAvailability === 'UNAVAILABLE').length,
    },
    modules,
  })
})
