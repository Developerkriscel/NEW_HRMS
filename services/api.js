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
