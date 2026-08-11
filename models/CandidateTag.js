import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

// candidate_tags — the reusable tag vocabulary for a tenant (item 15).
// Actual per-candidate assignment lives in CandidateTagAssignment.
const CandidateTagSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    ...tenantFields,
  },
  { timestamps: true, collection: 'candidate_tags' }
)

CandidateTagSchema.index({ tenantId: 1, name: 1 }, { unique: true })

export default model('CandidateTag', CandidateTagSchema)
