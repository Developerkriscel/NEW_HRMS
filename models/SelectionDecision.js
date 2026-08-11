import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { SELECTION_DECISION_TYPE_LIST, APPROVAL_STATUS, APPROVAL_STATUS_LIST } from '@/lib/selectionConstants'

// selection_decisions — one row per decision *event*. A candidate who goes
// Additional Round -> (back through interviews) -> Selected ends up with
// two rows here, which is the point: this is an audit trail, not a
// single mutable "current decision" record.
const SelectionDecisionSchema = new mongoose.Schema(
  {
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },

    decision: { type: String, enum: SELECTION_DECISION_TYPE_LIST, required: true },

    // SELECT
    recommendedDesignationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation', default: null },
    recommendedDepartmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    recommendedManagerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    proposedJoiningDate: { type: Date, default: null },
    employmentType: { type: String, default: null },

    // ADDITIONAL_ROUND
    interviewType: { type: String, default: null },

    // HOLD
    reviewDate: { type: Date, default: null },

    // REJECT
    addToTalentPool: { type: Boolean, default: false },

    decisionReason: { type: String, default: null },
    comments: { type: String, default: null },

    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    decidedByName: { type: String, default: null },
    decidedAt: { type: Date, default: Date.now },

    // Only meaningful for decision === SELECT, when an approval level is
    // configured (see lib/selectionConstants.js#SELECTION_APPROVAL_LEVEL).
    approvalStatus: { type: String, enum: APPROVAL_STATUS_LIST, default: APPROVAL_STATUS.NOT_REQUIRED },
    approvalLevel: { type: String, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    approvedByName: { type: String, default: null },
    approvedAt: { type: Date, default: null },
    approvalComment: { type: String, default: null },

    ...tenantFields,
  },
  { timestamps: true, collection: 'selection_decisions' }
)

SelectionDecisionSchema.index({ tenantId: 1, applicationId: 1, decidedAt: -1 })
SelectionDecisionSchema.index({ tenantId: 1, jobId: 1 })

export default model('SelectionDecision', SelectionDecisionSchema)
