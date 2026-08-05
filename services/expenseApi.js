import api from './api'

export const expenseApi = {
  list: (params) => api.get('/expenses', { params }),
  submit: (data) => api.post('/expenses', data),
  approve: (id, remarks) => api.put(`/expenses/${id}/approve`, { remarks }),
  reject: (id, remarks) => api.put(`/expenses/${id}/reject`, { remarks }),
  sendBack: (id, remarks) => api.put(`/expenses/${id}/send-back`, { remarks }),
}
