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

function mockPayloadForPath(path, params = {}) {
  if (path === '/attendance/today') return null
  if (path === '/attendance' && params?.summaryOnly) return { summary: { present: 0, absent: 0, late: 0, total: 0 } }
  if (path.startsWith('/attendance')) return []

  if (path === '/employees/reports') return { months: [], headcount: [], joiners: [], exits: [] }
  if (path === '/payroll/eligibility') return []
  if (path.includes('/payslip') || path.includes('/salary-structure')) return null

  if (path === '/recruitment/pipeline') return { jobs: [], columns: [] }
  if (path === '/recruitment/dashboard') return { stats: {}, recentActivity: [] }
  if (path === '/hr/dashboard' || path === '/manager/dashboard') return { stats: {}, upcomingHolidays: [], recentAnnouncements: [] }

  if (path.includes('/reports/payments')) return { data: [], totalElements: 0 }
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
