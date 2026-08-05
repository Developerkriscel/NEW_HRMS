import api from './api'

// Not present in the original frontend (it was a gap — DepartmentController
// existed on the backend with no matching frontend service). Added here so
// the Departments/Designations/Branches pages can actually be wired up.
export const departmentApi = {
  getAll: () => api.get('/departments'),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
}

export const designationApi = {
  getAll: () => api.get('/designations'),
  create: (data) => api.post('/designations', data),
}

export const branchApi = {
  getAll: () => api.get('/branches'),
  create: (data) => api.post('/branches', data),
}

export const shiftApi = {
  getAll: () => api.get('/shifts'),
  create: (data) => api.post('/shifts', data),
  update: (id, data) => api.put(`/shifts/${id}`, data),
  delete: (id) => api.delete(`/shifts/${id}`),
}

export const holidayApi = {
  getAll: (params) => api.get('/holidays', { params }),
  create: (data) => api.post('/holidays', data),
  update: (id, data) => api.put(`/holidays/${id}`, data),
  delete: (id) => api.delete(`/holidays/${id}`),
}
