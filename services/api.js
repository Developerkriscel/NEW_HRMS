import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

const api = axios.create({
  baseURL: BASE_URL,
  // Keep the timeout generous for AI and bulk tasks
  timeout: Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS || 120000),
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

const GET_CACHE_TTL_MS = Number(process.env.NEXT_PUBLIC_API_CACHE_TTL_MS || 30000)
const JSON_GET_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_API_GET_TIMEOUT_MS || 12000)
const getCache = new Map()
const DEV_LOGIN_STORAGE_KEY = 'nexahr_dev_login'

function isDevLoginMockEnabled() {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return false
  return window.localStorage.getItem(DEV_LOGIN_STORAGE_KEY) === 'true'
}

function pageData(content = [], params = {}) {
  const page = Number(params?.page || 0)
  const size = Number(params?.size || content.length || 20)
  return {
    content,
    page,
    size,
    totalElements: content.length,
    totalPages: 1,
    first: true,
    last: true,
  }
}

function okEnvelope(data) {
  return {
    success: true,
    message: 'Dev data',
    data,
    timestamp: new Date().toISOString(),
    errorCode: null,
  }
}

function superAdminDashboardData() {
  const emptySeries = [
    { month: 'Jan', count: 0 },
    { month: 'Feb', count: 0 },
    { month: 'Mar', count: 0 },
    { month: 'Apr', count: 0 },
    { month: 'May', count: 0 },
    { month: 'Jun', count: 0 },
  ]
  return {
    cards: {
      totalCompanies: 0,
      activeCompanies: 0,
      trialCompanies: 0,
      suspendedCompanies: 0,
      activeEmployees: 0,
      storageUsedMb: 0,
      graceCompanies: 0,
    },
    charts: {
      companiesByMonth: emptySeries,
      tenantsByStatus: [
        { status: 'ACTIVE', count: 0 },
        { status: 'TRIAL', count: 0 },
        { status: 'SUSPENDED', count: 0 },
      ],
      planDistribution: [],
      subscriptionTrend: emptySeries,
      moduleAdoption: [],
    },
    tables: {
      recentCompanies: [],
      failedProvisioning: [],
      upcomingRenewals: [],
    },
  }
}

function reportOverviewData() {
  return {
    totalRevenue: 0,
    mrr: 0,
    arr: 0,
    activeSubscriptions: 0,
    overdueInvoices: 0,
    churnRate: 0,
  }
}

function tenantProfileData() {
  return {
    companyName: 'Acme Technologies',
    tenantCode: 'ACME',
    phone: '',
    logoUrl: '',
    industryType: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    gstNumber: '',
    panNumber: '',
    features: {},
    hrSettings: {
      employeeIdPrefix: 'EMP',
      officeStartTime: '09:30',
      officeEndTime: '18:30',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      weeklyOff: ['Saturday', 'Sunday'],
    },
  }
}

function employeeProfileData() {
  return {
    _id: 'dev-employee',
    employeeCode: 'EMP-DEV',
    firstName: 'Dev',
    lastName: 'User',
    email: 'dev.user@example.com',
    phone: '',
    role: 'EMPLOYEE',
    status: 'ACTIVE',
    department: null,
    designation: null,
    branch: null,
    reportingManager: null,
    joiningDate: null,
    dateOfBirth: null,
    gender: null,
    bloodGroup: null,
    address: '',
    city: '',
    state: '',
    country: 'India',
    workLocation: '',
  }
}

function employeeReportData() {
  return {
    totalEmployees: 0,
    byStatus: [],
    byDepartment: [],
    newJoinersTrend: [
      { month: 'Jan', count: 0 },
      { month: 'Feb', count: 0 },
      { month: 'Mar', count: 0 },
      { month: 'Apr', count: 0 },
      { month: 'May', count: 0 },
      { month: 'Jun', count: 0 },
    ],
  }
}

function attendanceReportData() {
  return {
    presentDays: 0,
    absentDays: 0,
    halfDays: 0,
    lateCount: 0,
    totalOvertimeMinutes: 0,
  }
}

function leaveReportData() {
  return {
    totalDays: 0,
    totalRequests: 0,
    byType: [],
    byDepartment: [],
  }
}

function payrollMonthlyData(params = {}) {
  return {
    ...pageData([], params),
    totalGross: 0,
    totalNet: 0,
    totalDeductions: 0,
  }
}

function payrollReportData() {
  return {
    processedCount: 0,
    totalGross: 0,
    totalNet: 0,
    totalDeductions: 0,
    byDepartment: [],
  }
}

function companySubscriptionData() {
  return {
    currentPlan: null,
    subscription: null,
    tenant: { status: 'ACTIVE', employeeLimit: 0, storageLimitMb: 0 },
    plans: [],
    daysRemaining: null,
    renewalDate: null,
  }
}

function companyModulesData() {
  return {
    currentPlan: null,
    summary: { total: 0, enabled: 0, availableAddOns: 0, upgradeRequired: 0 },
    modules: [],
  }
}

function platformSettingsData() {
  return {
    settings: {
      organizationDefaults: {
        defaultCountry: 'India',
        defaultTimezone: 'Asia/Kolkata',
        tenantCodePrefix: '',
      },
      provisioning: {
        databasePrefix: 'nexahr_tenant',
      },
    },
    updatedAt: null,
    updatedBy: null,
    version: 1,
    editable: true,
  }
}

function mockPayloadForPath(path, params = {}) {
  if (path === '/company/profile') return tenantProfileData()
  if (path === '/company/subscription') return companySubscriptionData()
  if (path === '/company/modules') return companyModulesData()
  if (path === '/company/mail-settings') return { enabled: false, host: '', port: '', username: '', fromEmail: '' }
  if (path === '/company/audit-logs') return pageData([], params)
  if (path === '/notifications') {
    return {
      notifications: [
        {
          id: 'dev_mock_1',
          title: 'System Notification',
          message: 'All services running normally.',
          type: 'info',
          category: 'system',
          link: null,
          read: false,
          time: new Date().toISOString(),
        },
      ],
      unreadCount: 1,
    }
  }

  if (path === '/attendance/today') return null
  if (path === '/attendance' && params?.summaryOnly) return { summary: { present: 0, absent: 0, late: 0, total: 0 } }
  if (path === '/attendance/monthly-report') return attendanceReportData()
  if (path.startsWith('/attendance')) return []

  if (path === '/employees/reports') return employeeReportData()
  if (/^\/employees\/[^/]+$/.test(path)) return employeeProfileData()
  if (/^\/employees\/[^/]+\/(timeline|assets|payslips|leave-balance)$/.test(path)) return []
  if (path === '/employees') return pageData([], params)

  if (path === '/payroll/eligibility') return []
  if (path === '/payroll/monthly') return payrollMonthlyData(params)
  if (path === '/payroll/reports') return payrollReportData()
  if (path === '/payroll/salary-structures') return { rows: [], totals: { total: 0, structured: 0, ctcOnly: 0, missing: 0 } }
  if (/^\/payroll\/salary-structure\/[^/]+$/.test(path)) return { history: [] }
  if (path.includes('/payslip') || path.includes('/salary-structure')) return null

  if (path === '/leaves/reports') return leaveReportData()
  if (path === '/manager/reports') return { rows: [] }
  if (path === '/manager/approvals') return []
  if (path === '/hr/settings/ai') return { enabled: false, provider: '', model: '', maskedApiKey: '', prompt: '' }

  if (path === '/recruitment/pipeline') return { jobs: [], columns: [] }
  if (path === '/recruitment/dashboard') return { stats: {}, recentActivity: [] }
  if (path === '/hr/dashboard' || path === '/manager/dashboard') return { stats: {}, upcomingHolidays: [], recentAnnouncements: [] }

  if (path === '/super-admin/dashboard') return superAdminDashboardData()
  if (path === '/super-admin/admins') return []
  if (path === '/super-admin/support/tickets') return []
  if (path === '/super-admin/settings') return platformSettingsData()
  if (path === '/super-admin/reports/overview') return reportOverviewData()
  if (path === '/super-admin/reports/revenue-trend') return []
  if (path === '/super-admin/reports/revenue-by-company') return []
  if (path === '/super-admin/reports/revenue-by-plan') return []
  if (path === '/super-admin/reports/payments') return { data: [], total: 0, totalElements: 0 }
  if (path === '/super-admin/tenants' && params?.size && !params?.page && Object.keys(params).length === 1) return []
  if (path === '/super-admin/tenants') return pageData([], params)
  if (path === '/platform/subscriptions') return pageData([], params)
  if (path === '/platform/modules') return []
  if (path.includes('/reports/payments')) return { data: [], total: 0, totalElements: 0 }
  if (path.includes('/reports')) return []

  const arrayOnlyPatterns = [
    '/departments',
    '/designations',
    '/branches',
    '/shifts',
    '/permissions',
    '/holidays',
    '/leaves/balance',
    '/leaves/types',
    '/leaves/calendar',
    '/leaves/holidays',
    '/documents',
    '/assets',
    '/asset-requests',
    '/training',
    '/announcements',
    '/company/modules',
    '/company/audit-logs',
    '/recruitment/pipeline/jobs',
    '/recruitment/requisitions/employees',
    '/recruitment/candidate-tags',
    '/recruitment/salary-structures',
    '/recruitment/settings',
    '/recruitment/integrations',
    '/recruitment/jobs/referrals',
    '/recruitment/offer-templates',
    '/recruitment/document-requirements',
    '/platform/modules',
    '/super-admin/plans',
    '/platform/plans',
  ]

  if (arrayOnlyPatterns.some((item) => path === item || path.startsWith(`${item}/`))) return []
  if (params?.page !== undefined || params?.size !== undefined) return pageData([], params)
  if (/\/(employees|leaves|team-requests|helpdesk|expenses|kra|performance-reviews|resignations|rosters)$/.test(path)) return pageData([], params)
  if (path.startsWith('/recruitment/') || path.startsWith('/payroll/') || path.startsWith('/platform/') || path.startsWith('/super-admin/')) return pageData([], params)
  return []
}

function shouldMockDevGet(config) {
  const method = String(config.method || 'get').toLowerCase()
  if (method !== 'get' || config.responseType || config.devMock === false) return false
  if (!isDevLoginMockEnabled()) return false

  const path = normalizePath(config.url)
  if (path.startsWith('/auth/') || path.startsWith('/public/') || path.startsWith('/candidate/')) return false
  return true
}

function devMockAdapter(config) {
  const path = normalizePath(config.url)
  return Promise.resolve({
    data: okEnvelope(mockPayloadForPath(path, config.params || {})),
    status: 200,
    statusText: 'OK',
    headers: { 'x-nexahr-dev-mock': 'true' },
    config,
    request: null,
  })
}

function stableParams(params) {
  if (!params) return ''
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
  return JSON.stringify(entries)
}

function getCacheKey(url, config = {}) {
  return `${url}?${stableParams(config.params)}`
}

const rawGet = api.get.bind(api)

api.get = async (url, config = {}) => {
  if (
    config.skipCache
    || config.responseType
    || GET_CACHE_TTL_MS <= 0
    || String(url).includes('/auth/')
  ) {
    return rawGet(url, config)
  }

  const key = getCacheKey(url, config)
  const cached = getCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise
  }

  const promise = rawGet(url, config).catch((error) => {
    getCache.delete(key)
    throw error
  })
  getCache.set(key, { promise, expiresAt: Date.now() + GET_CACHE_TTL_MS })
  return promise
}

function clearGetCache() {
  getCache.clear()
}

function normalizePath(value) {
  try {
    return new URL(value, 'http://nexahr.local').pathname
  } catch {
    return String(value || '').split('?')[0]
  }
}

function cacheGroup(path) {
  const parts = normalizePath(path).split('/').filter(Boolean)
  if (parts[0] === 'recruitment' && parts[1]) return `/recruitment/${parts[1]}`
  if (parts[0] === 'super-admin' && parts[1]) return `/super-admin/${parts[1]}`
  if (parts[0] === 'platform' && parts[1]) return `/platform/${parts[1]}`
  return parts[0] ? `/${parts[0]}` : '/'
}

function clearGetCacheForUrl(url) {
  const group = cacheGroup(url)
  let removed = false
  for (const key of getCache.keys()) {
    const cachedGroup = cacheGroup(key.split('?')[0])
    if (cachedGroup === group) {
      getCache.delete(key)
      removed = true
    }
  }
  if (!removed && group === '/') clearGetCache()
}

for (const method of ['post', 'put', 'patch', 'delete']) {
  const rawMethod = api[method].bind(api)
  api[method] = async (...args) => {
    const response = await rawMethod(...args)
    clearGetCacheForUrl(args[0])
    return response
  }
}

let refreshPromise = null
let redirectingToLogin = false

api.interceptors.request.use((config) => {
  const method = String(config.method || 'get').toLowerCase()
  if (shouldMockDevGet(config)) {
    config.adapter = devMockAdapter
  }
  if (method === 'get' && !config.responseType && (!config.timeout || config.timeout === api.defaults.timeout)) {
    config.timeout = JSON_GET_TIMEOUT_MS
  }
  return config
})

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = api.post('/auth/refresh-token').finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

async function redirectToLoginOnce() {
  if (redirectingToLogin || typeof window === 'undefined') return
  redirectingToLogin = true
  try { await api.post('/auth/logout') } catch {}
  window.location.href = '/login'
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && original && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true
      try {
        await refreshSession()
        return api(original)
      } catch {
        redirectToLoginOnce()
      }
    }
    return Promise.reject(error)
  }
)

export default api
