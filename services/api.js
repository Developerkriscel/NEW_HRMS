import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

const api = axios.create({
  baseURL: BASE_URL,
  // 60s, not 30s — the first request after a dev-server restart pays for a
  // cold MongoDB connection (see lib/db.js) on top of the query itself, and
  // has been observed taking ~30s alone, tripping a tighter timeout.
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send the httpOnly auth cookies
})

// Response interceptor — silent refresh on 401. Unlike the original (which
// carried the JWT in JS and had to manually attach it), the access/refresh
// tokens now live in httpOnly cookies, so there's nothing to read/attach
// here — the browser sends them automatically and the refresh endpoint
// reads/rewrites them server-side.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true
      try {
        await api.post('/auth/refresh-token')
        return api(original)
      } catch {
        if (typeof window !== 'undefined') window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
