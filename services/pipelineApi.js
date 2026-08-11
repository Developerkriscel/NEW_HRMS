import api from './api'

export const pipelineApi = {
  getBoard: (params) => api.get('/recruitment/pipeline', { params }),
  bulkMove: (applicationIds, stageId, comment) => api.post('/recruitment/applications/bulk-move', { applicationIds, stageId, comment }),
  bulkAction: (applicationIds, action, payload) => api.post('/recruitment/applications/bulk-action', { applicationIds, action, payload }),
}
