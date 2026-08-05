const stamp = () => new Date().toISOString()

const DEFAULT_FEATURES = {
  core_hr: true,
  attendance: true,
  leave: true,
  payroll: false,
  recruitment: false,
  performance: false,
  assets: false,
  ai_assistant: false,
}

const store = global._nexahrDevSuperAdminStore || {
  nextTenant: 2,
  nextPlan: 3,
  nextAudit: 1,
  tenants: [
    {
      _id: 'tenant_acme',
      tenantCode: 'ACME',
      companyName: 'Acme Technologies',
      email: 'hr@acme.test',
      phone: '+91 98765 43210',
      address: 'Bengaluru',
      country: 'India',
      timezone: 'Asia/Kolkata',
      logoUrl: '',
      status: 'TRIAL',
      employeeLimit: 50,
      storageLimitMb: 5120,
      storageUsedMb: 640,
      databaseName: 'nexahr_tenant_acme',
      databaseStatus: 'READY',
      databaseProvisionedAt: stamp(),
      databaseLastCheckedAt: stamp(),
      databaseError: null,
      features: { ...DEFAULT_FEATURES },
      hrSettings: {
        employeeIdPrefix: 'ACM',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        weeklyOff: ['Saturday', 'Sunday'],
        officeStartTime: '09:00',
        officeEndTime: '18:00',
      },
      createdAt: stamp(),
      updatedAt: stamp(),
      deleted: false,
    },
  ],
  plans: [
    { _id: 'plan_starter', name: 'Starter', description: 'Small teams', price: 2999, billingCycle: 'MONTHLY', employeeLimit: 50, storageLimitMb: 5120, features: ['core_hr', 'attendance', 'leave'], active: true, trialDays: 14, sortOrder: 1, deleted: false, createdAt: stamp(), updatedAt: stamp() },
    { _id: 'plan_professional', name: 'Professional', description: 'Growing teams', price: 7999, billingCycle: 'MONTHLY', employeeLimit: 250, storageLimitMb: 20480, features: ['core_hr', 'attendance', 'leave', 'payroll'], active: true, trialDays: 14, sortOrder: 2, deleted: false, createdAt: stamp(), updatedAt: stamp() },
  ],
  auditLogs: [],
  supportTickets: [
    { _id: 'ticket_1', subject: 'Payroll setup guidance', tenantName: 'Acme Technologies', status: 'OPEN', priority: 'MEDIUM', createdAt: stamp() },
  ],
}

global._nexahrDevSuperAdminStore = store

const copy = (value) => (value == null ? value : JSON.parse(JSON.stringify(value)))

function paged(content, page = 0, size = 20) {
  const totalElements = content.length
  const totalPages = Math.max(1, Math.ceil(totalElements / size))
  return {
    content: copy(content.slice(page * size, page * size + size)),
    page,
    size,
    totalElements,
    totalPages,
    first: page === 0,
    last: page >= totalPages - 1,
  }
}

function audit(action, description, tenantId = null, entityType = 'Tenant', entityId = null) {
  store.auditLogs.unshift({
    _id: `audit_${store.nextAudit++}`,
    tenantId,
    performedBy: 'dev-super-admin',
    performerEmail: 'admin@nexahr.io',
    performerRole: 'SUPER_ADMIN',
    action,
    entityType,
    entityId,
    description,
    createdAt: stamp(),
  })
}

const tenantById = (id) => store.tenants.find((item) => item._id === id && !item.deleted)
const planById = (id) => store.plans.find((item) => item._id === id && !item.deleted)

export const devSuperAdminStore = {
  // Shape must mirror the real DB-backed route (app/api/super-admin/dashboard/route.js)
  // — the dashboard page destructures { cards, charts, tables } unconditionally.
  dashboard() {
    const tenants = store.tenants.filter((item) => !item.deleted)
    const countByStatus = (status) => tenants.filter((item) => item.status === status).length
    return {
      cards: {
        totalCompanies: tenants.length,
        activeCompanies: countByStatus('ACTIVE'),
        trialCompanies: countByStatus('TRIAL'),
        graceCompanies: countByStatus('GRACE'),
        suspendedCompanies: countByStatus('SUSPENDED'),
        activeEmployees: 0,
        storageUsedMb: tenants.reduce((sum, item) => sum + Number(item.storageUsedMb || 0), 0),
        storageLimitMb: tenants.reduce((sum, item) => sum + Number(item.storageLimitMb || 0), 0),
        totalPlans: store.plans.filter((item) => item.active && !item.deleted).length,
        failedProvisioningJobs: 0,
      },
      charts: {
        companiesByMonth: [],
        tenantsByStatus: ['ACTIVE', 'TRIAL', 'GRACE', 'SUSPENDED']
          .map((status) => ({ status, count: countByStatus(status) }))
          .filter((row) => row.count > 0),
        planDistribution: [],
        subscriptionTrend: [],
        employeeTrend: [],
        storageTrend: [],
        moduleAdoption: [],
      },
      tables: {
        recentCompanies: copy(tenants.slice(0, 5)),
        failedProvisioning: [],
        upcomingRenewals: [],
        subscriptionSummary: [],
      },
    }
  },
  listTenants({ page = 0, size = 20, status, search } = {}) {
    let rows = store.tenants.filter((item) => !item.deleted)
    if (status) rows = rows.filter((item) => item.status === status)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter((item) => item.companyName.toLowerCase().includes(q) || item.email.toLowerCase().includes(q) || item.tenantCode.toLowerCase().includes(q))
    }
    return paged(rows, page, size)
  },
  createTenant(body = {}) {
    const tenantCode = String(body.tenantCode || '').trim().toUpperCase()
    if (!body.companyName || !tenantCode || !body.email) return { error: 'Company name, code and email are required' }
    if (store.tenants.some((item) => !item.deleted && (item.email === body.email || item.tenantCode === tenantCode))) return { error: 'A tenant with this email or code already exists' }
    const tenant = {
      _id: `tenant_${store.nextTenant++}`,
      tenantCode,
      companyName: body.companyName,
      email: body.email,
      phone: body.phone || '',
      address: body.address || '',
      country: body.country || 'India',
      timezone: body.timezone || 'Asia/Kolkata',
      logoUrl: body.logoUrl || '',
      status: body.status || 'TRIAL',
      employeeLimit: Number(body.employeeLimit || 50),
      storageLimitMb: 5120,
      storageUsedMb: 0,
      databaseName: `nexahr_tenant_${tenantCode.toLowerCase()}`,
      databaseStatus: 'READY',
      databaseProvisionedAt: stamp(),
      databaseLastCheckedAt: stamp(),
      databaseError: null,
      features: { ...DEFAULT_FEATURES, ...(body.features || {}) },
      plan: body.planId ? planById(body.planId) || null : null,
      hrSettings: {
        employeeIdPrefix: body.employeeIdPrefix || 'EMP',
        workingDays: body.workingDays || [],
        weeklyOff: body.weeklyOff || [],
        officeStartTime: body.officeStartTime || '09:00',
        officeEndTime: body.officeEndTime || '18:00',
      },
      createdAt: stamp(),
      updatedAt: stamp(),
      deleted: false,
    }
    store.tenants.unshift(tenant)
    audit('TENANT_CREATED', `Tenant ${tenant.companyName} (${tenant.tenantCode}) created`, tenant._id, 'Tenant', tenant._id)
    return { tenant: copy(tenant), adminTempPassword: body.adminEmail ? 'Nexahr@1234' : null }
  },
  getTenant(id) {
    return copy(tenantById(id))
  },
  updateTenant(id, body = {}) {
    const tenant = tenantById(id)
    if (!tenant) return null
    for (const field of ['companyName', 'phone', 'address', 'city', 'state', 'country', 'employeeLimit', 'storageLimitMb']) if (body[field] !== undefined) tenant[field] = body[field]
    tenant.updatedAt = stamp()
    audit('TENANT_UPDATED', `Tenant ${tenant.companyName} updated`, tenant._id, 'Tenant', tenant._id)
    return copy(tenant)
  },
  setTenantStatus(id, status, reason = null) {
    const tenant = tenantById(id)
    if (!tenant) return null
    tenant.status = status
    tenant.suspensionReason = reason
    tenant.updatedAt = stamp()
    audit(status === 'SUSPENDED' ? 'TENANT_SUSPENDED' : 'TENANT_ACTIVATED', `Tenant ${tenant.companyName} ${status.toLowerCase()}`, tenant._id, 'Tenant', tenant._id)
    return copy(tenant)
  },
  provisionDatabase(id) {
    const tenant = tenantById(id)
    if (!tenant) return null
    tenant.databaseStatus = 'READY'
    tenant.databaseError = null
    tenant.databaseLastCheckedAt = stamp()
    audit('TENANT_DATABASE_PROVISIONED', `Tenant database ${tenant.databaseName} provisioned`, tenant._id, 'Tenant', tenant._id)
    return copy(tenant)
  },
  usage(id) {
    const tenant = tenantById(id)
    if (!tenant) return null
    const employeeCount = Math.min(tenant.employeeLimit, Math.max(1, Math.round(tenant.employeeLimit * 0.34)))
    return { employeeCount, employeeLimit: tenant.employeeLimit, usagePercent: Math.round((employeeCount / tenant.employeeLimit) * 100), storageLimitMb: tenant.storageLimitMb, storageUsedMb: tenant.storageUsedMb, databaseName: tenant.databaseName, databaseStatus: tenant.databaseStatus, databaseLastCheckedAt: tenant.databaseLastCheckedAt, databaseError: tenant.databaseError }
  },
  updateFeatures(id, features = {}) {
    const tenant = tenantById(id)
    if (!tenant) return null
    tenant.features = { ...tenant.features, ...features }
    tenant.updatedAt = stamp()
    audit('TENANT_FEATURES_UPDATED', `Feature flags updated for ${tenant.companyName}`, tenant._id, 'Tenant', tenant._id)
    return copy(tenant)
  },
  listPlans() {
    return copy(store.plans.filter((item) => !item.deleted).sort((a, b) => a.sortOrder - b.sortOrder))
  },
  createPlan(body = {}) {
    if (store.plans.some((item) => !item.deleted && item.name === body.name)) return { error: 'A plan with this name already exists' }
    const plan = { _id: `plan_${store.nextPlan++}`, name: body.name || 'New Plan', description: body.description || '', price: Number(body.price || 0), billingCycle: body.billingCycle || 'MONTHLY', employeeLimit: Number(body.employeeLimit || 50), storageLimitMb: Number(body.storageLimitMb || 5120), features: body.features || [], active: true, trialDays: Number(body.trialDays || 14), sortOrder: Number(body.sortOrder || store.plans.length + 1), deleted: false, createdAt: stamp(), updatedAt: stamp() }
    store.plans.push(plan)
    audit('PLAN_CREATED', `Plan ${plan.name} created`, null, 'Plan', plan._id)
    return copy(plan)
  },
  updatePlan(id, body = {}) {
    const plan = planById(id)
    if (!plan) return null
    for (const field of ['name', 'description', 'price', 'billingCycle', 'employeeLimit', 'storageLimitMb', 'features', 'trialDays', 'sortOrder', 'active']) if (body[field] !== undefined) plan[field] = body[field]
    plan.updatedAt = stamp()
    return copy(plan)
  },
  disablePlan(id) {
    const plan = planById(id)
    if (!plan) return false
    plan.active = false
    plan.updatedAt = stamp()
    audit('PLAN_DISABLED', `Plan ${plan.name} disabled`, null, 'Plan', plan._id)
    return true
  },
  revenue(period = 'monthly') {
    const monthlyRecurring = store.plans.filter((item) => item.active && !item.deleted).reduce((sum, item) => sum + Number(item.price || 0), 0)
    return { period, monthlyRecurring, annualRecurring: monthlyRecurring * 12 }
  },
  auditLogs({ page = 0, size = 50, tenantId, action } = {}) {
    let rows = store.auditLogs
    if (tenantId) rows = rows.filter((item) => item.tenantId === tenantId)
    if (action) rows = rows.filter((item) => item.action === action)
    return paged(rows, page, size)
  },
  supportTickets({ page = 0, size = 20 } = {}) {
    return paged(store.supportTickets, page, size)
  },
}
