import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { PIPELINE_STAGE_CATEGORY_LIST } from '@/lib/jobConstants'

// The per-job stage list a Pipeline Template seeds (see lib/jobConstants.js)
// and HR can then reorder/rename — this table, not the template, is what
// Step 3.5+ (candidate pipeline movement) will actually read from.
const JobPipelineStageSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    name: { type: String, required: true },
    category: { type: String, enum: PIPELINE_STAGE_CATEGORY_LIST, required: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    ...tenantFields,
  },
  { timestamps: true, collection: 'job_pipeline_stages' }
)

JobPipelineStageSchema.index({ tenantId: 1, jobId: 1, order: 1 })

export default model('JobPipelineStage', JobPipelineStageSchema)
