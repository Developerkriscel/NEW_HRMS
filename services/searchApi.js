import api from './api'

export const searchApi = {
  global: (q, options = {}) => api.get('/search', { params: { q }, ...options }),
}
