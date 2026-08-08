import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import {
  REQUISITION_STATUS,
  REQUISITION_STATUS_LIST,
  PRIORITY_LIST,
  EMPLOYMENT_TYPE_LIST,
  WORK_MODE_LIST,
  HIRING_REASON_LIST,
  BUDGET_TYPE_LIST,
} from '@/lib/recruitmentConstants'

// Denormalized snapshot of who did what and when — kept on the requisition
// itself (rather than joined from AuditLog) so the Activity Timeline /
// Approval History sections render with one query and survive the actor
// being renamed or deleted later.
const ActivityEntrySchema = new mongoose.Schema(
  {
    type: { type: String, required: true }, // CREATED | UPDATED | SUBMITTED | APPROVED | REJECTED | CANCELLED
    message: { type: String, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    actorName: { type: String },
    comment: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const JobRequisitionSchema = new mongoose.Schema(
  {
    // Human-readable REQ-2026-0001 code — see requisitionCodeGenerator in
    // the API route. Never expose the Mongo _id in the UI.
    requisitionCode: { type: String, required: true },

    // Section 1 — Position Details
    jobTitle: { type: String, required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    designation: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation', default: null },
    openings: { type: Number, default: 1, min: 1 },
    employmentType: { type: String, enum: EMPLOYMENT_TYPE_LIST, default: null },
    workMode: { type: String, enum: WORK_MODE_LIST, default: null },
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    hiringManager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },

    // Section 2 — Hiring Reason
    hiringReason: { type: String, enum: HIRING_REASON_LIST, default: null },
    replacementEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    replacementReason: { type: String },
    lastWorkingDate: { type: Date },
    otherReasonDetails: { type: String },

    // Section 3 — Experience & Skills (skills themselves live in
    // RequisitionSkill, not here — see requisition_skills)
    minExperience: { type: Number },
    maxExperience: { type: Number },
    education: { type: String },
    certifications: { type: String },
    industryExperience: { type: String },
    roleSummary: { type: String },

    // Section 4 — Hiring Budget
    minCtc: { type: Number },
    maxCtc: { type: Number },
    currency: { type: String, default: 'INR' },
    budgetType: { type: String, enum: BUDGET_TYPE_LIST, default: null },
    budgetApproved: { type: Boolean, default: false },

    // Section 5 — Timeline
    expectedJoiningDate: { type: Date },
    applicationTargetDate: { type: Date },
    priority: { type: String, enum: PRIORITY_LIST, default: 'MEDIUM' },

    // Section 6 — Job Description
    jobSummary: { type: String },
    responsibilities: { type: String },
    requiredQualifications: { type: String },
    preferredQualifications: { type: String },
    benefits: { type: String },
    additionalNotes: { type: String },

    // Workflow
    status: { type: String, enum: REQUISITION_STATUS_LIST, default: REQUISITION_STATUS.DRAFT, required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    submittedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    approvedAt: { type: Date, default: null },
    approvalComment: { type: String },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String },

    // Step 3 — set when this requisition is converted into a Job Opening
    // (status flips to JOB_CREATED at the same time). Doubles as an extra
    // guard against Rule 2 (one requisition -> one job) alongside the
    // status check itself.
    linkedJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },

    activityLog: [ActivityEntrySchema],

    ...tenantFields,
  },
  { timestamps: true, collection: 'job_requisitions' }
)

JobRequisitionSchema.index({ tenantId: 1, status: 1 })
JobRequisitionSchema.index({ tenantId: 1, requisitionCode: 1 }, { unique: true })
JobRequisitionSchema.index({ tenantId: 1, requestedBy: 1 })
JobRequisitionSchema.index({ tenantId: 1, department: 1 })

export default model('JobRequisition', JobRequisitionSchema)
