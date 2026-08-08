import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { SKILL_TYPE_LIST } from '@/lib/recruitmentConstants'

// One row per skill tag, not a comma-joined string on JobRequisition — this
// is what a future AI candidate-matching pass will query against.
const RequisitionSkillSchema = new mongoose.Schema(
  {
    requisitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobRequisition', required: true },
    skillName: { type: String, required: true },
    type: { type: String, enum: SKILL_TYPE_LIST, required: true }, // REQUIRED | PREFERRED
    ...tenantFields,
  },
  { timestamps: true, collection: 'requisition_skills' }
)

RequisitionSkillSchema.index({ tenantId: 1, requisitionId: 1 })

export default model('RequisitionSkill', RequisitionSkillSchema)
