import mongoose from 'mongoose'
import { baseFields, model } from './_base'
import { SELECTION_APPROVAL_LEVEL, SELECTION_APPROVAL_LEVEL_LIST } from '@/lib/selectionConstants'
import { COMPENSATION_APPROVAL_LEVEL, COMPENSATION_APPROVAL_LEVEL_LIST } from '@/lib/compensationConstants'

// recruitment_settings — one row per tenant (upserted, never duplicated).
// Holds the configurable approval workflows for Steps 11 & 12 — "do not
// hard-code one workflow for every tenant."
const RecruitmentSettingsSchema = new mongoose.Schema(
  {
    selectionApprovalLevel: { type: String, enum: SELECTION_APPROVAL_LEVEL_LIST, default: SELECTION_APPROVAL_LEVEL.NONE },
    compensationApprovalLevel: { type: String, enum: COMPENSATION_APPROVAL_LEVEL_LIST, default: COMPENSATION_APPROVAL_LEVEL.HIRING_MANAGER },
    updatedByName: { type: String, default: null },
    ...baseFields,
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
  },
  { timestamps: true, collection: 'recruitment_settings' }
)

export default model('RecruitmentSettings', RecruitmentSettingsSchema)
