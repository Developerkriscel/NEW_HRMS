import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

const api = axios.create({
  baseURL: BASE_URL,
  // Keep the timeout generous for cold dev starts, but avoid refresh storms
  // below so normal navigation is not delayed by duplicate auth retries.
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

const GET_CACHE_TTL_MS = Number(process.env.NEXT_PUBLIC_API_CACHE_TTL_MS || 30000)
const getCache = new Map()

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

for (const method of ['post', 'put', 'patch', 'delete']) {
  const rawMethod = api[method].bind(api)
  api[method] = async (...args) => {
    clearGetCache()
    return rawMethod(...args)
  }
}

let refreshPromise = null
let redirectingToLogin = false

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
