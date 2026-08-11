import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { COMPENSATION_STATUS, COMPENSATION_STATUS_LIST } from '@/lib/compensationConstants'

// compensation_proposals — versioned; a revision never overwrites an
// earlier proposal (item 10). `version` + `supersedes` is what lets the UI
// show "Proposal V1 (Rejected) -> Proposal V2 (Approved)" as real history
// rather than a single mutable row.
const CompensationProposalSchema = new mongoose.Schema(
  {
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },

    version: { type: Number, required: true, default: 1 },
    supersedes: { type: mongoose.Schema.Types.ObjectId, ref: 'CompensationProposal', default: null },

    currentCtc: { type: Number, default: null },
    expectedCtc: { type: Number, default: null },

    fixedPay: { type: Number, required: true, default: 0 },
    variablePay: { type: Number, default: 0 },
    performanceBonus: { type: Number, default: 0 },
    joiningBonus: { type: Number, default: 0 },
    retentionBonus: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    benefits: { type: Number, default: 0 },
    totalCtc: { type: Number, required: true, default: 0 }, // always server-computed, never trusted from the client

    salaryStructureId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryStructure', default: null },
    salaryStructureName: { type: String, default: null },

    // Snapshotted from the job at proposal time — so a later job-budget
    // edit doesn't rewrite what this specific proposal was actually
    // measured against.
    budgetMin: { type: Number, default: null },
    budgetMax: { type: Number, default: null },
    budgetVariance: { type: Number, default: 0 }, // amount over budgetMax; 0 if within
    budgetVariancePercent: { type: Number, default: 0 },

    status: { type: String, enum: COMPENSATION_STATUS_LIST, default: COMPENSATION_STATUS.DRAFT },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    createdByName: { type: String, default: null },
    submittedAt: { type: Date, default: null },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    approvedByName: { type: String, default: null },
    approvedAt: { type: Date, default: null },

    rejectionReason: { type: String, default: null },
    revisionComment: { type: String, default: null },
    revisionSuggestedCtc: { type: Number, default: null },

    // Configurable multi-level chain — see compensation_approvals for the
    // per-level audit trail, this just tracks "which level are we on now."
    approvalLevel: { type: String, default: null },
    currentApprovalStage: { type: String, default: null },

    ...tenantFields,
  },
  { timestamps: true, collection: 'compensation_proposals' }
)

CompensationProposalSchema.index({ tenantId: 1, applicationId: 1, version: -1 })

export default model('CompensationProposal', CompensationProposalSchema)
