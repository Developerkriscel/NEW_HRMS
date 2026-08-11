import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

// candidate_tag_assignments — a tag describes the *person*, not one
// specific application, so this is keyed off candidateId (a candidate with
// two applications carries the same tags into both).
const CandidateTagAssignmentSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    tagId: { type: mongoose.Schema.Types.ObjectId, ref: 'CandidateTag', required: true },
    assignedBy: { type: String, default: null },
    ...tenantFields,
  },
  { timestamps: true, collection: 'candidate_tag_assignments' }
)

CandidateTagAssignmentSchema.index({ tenantId: 1, candidateId: 1, tagId: 1 }, { unique: true })

export default model('CandidateTagAssignment', CandidateTagAssignmentSchema)
