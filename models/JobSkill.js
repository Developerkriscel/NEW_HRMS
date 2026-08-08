import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { SKILL_TYPE_LIST, SKILL_PROFICIENCY_LIST } from '@/lib/jobConstants'

// One row per skill, same reasoning as requisition_skills — this is what
// future AI candidate matching will query against. minYears/proficiency are
// optional per-skill metadata ("Node.js, 2 Years, Intermediate+").
const JobSkillSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    skillName: { type: String, required: true },
    type: { type: String, enum: SKILL_TYPE_LIST, required: true }, // REQUIRED | PREFERRED
    minYears: { type: Number, default: null },
    proficiency: { type: String, enum: SKILL_PROFICIENCY_LIST, default: null },
    ...tenantFields,
  },
  { timestamps: true, collection: 'job_skills' }
)

JobSkillSchema.index({ tenantId: 1, jobId: 1 })

export default model('JobSkill', JobSkillSchema)
