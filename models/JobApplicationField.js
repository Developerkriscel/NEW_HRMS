import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { APPLICATION_FIELD_LIST, APPLICATION_FIELD_REQUIREMENT_LIST } from '@/lib/jobConstants'

// Lets every job have a different application form — one row per candidate-
// facing field, so a future application form just reads this list instead
// of a hardcoded field set.
const JobApplicationFieldSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    fieldName: { type: String, enum: APPLICATION_FIELD_LIST, required: true },
    requirement: { type: String, enum: APPLICATION_FIELD_REQUIREMENT_LIST, default: 'OPTIONAL' },
    ...tenantFields,
  },
  { timestamps: true, collection: 'job_application_fields' }
)

JobApplicationFieldSchema.index({ tenantId: 1, jobId: 1, fieldName: 1 }, { unique: true })

export default model('JobApplicationField', JobApplicationFieldSchema)
