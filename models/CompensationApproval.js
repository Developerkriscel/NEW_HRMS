import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { COMPENSATION_APPROVAL_STAGE, APPROVAL_ACTION_STATUS } from '@/lib/compensationConstants'

// compensation_approvals — one row per approval *step* a proposal goes
// through (relevant when COMPENSATION_APPROVAL_LEVEL is the two-stage
// chain). A single-level approval still gets exactly one row here, so the
// audit trail shape stays consistent either way.
const CompensationApprovalSchema = new mongoose.Schema(
  {
    proposalId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompensationProposal', required: true },
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    approverName: { type: String, default: null },
    approvalLevel: { type: String, enum: Object.values(COMPENSATION_APPROVAL_STAGE), required: true },
    status: { type: String, enum: Object.values(APPROVAL_ACTION_STATUS), default: APPROVAL_ACTION_STATUS.PENDING },
    comment: { type: String, default: null },
    actedAt: { type: Date, default: null },
    ...tenantFields,
  },
  { timestamps: true, collection: 'compensation_approvals' }
)

CompensationApprovalSchema.index({ tenantId: 1, proposalId: 1 })

export default model('CompensationApproval', CompensationApprovalSchema)
