import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import {
  JOB_STATUS, JOB_STATUS_LIST, JOB_EMPLOYMENT_TYPE_LIST, WORK_MODE_LIST, JOB_VISIBILITY_LIST,
} from '@/lib/jobConstants'

// Same denormalized activity-entry shape as JobRequisition's — kept
// per-model (not shared) so Step 2 stays untouched.
const ActivityEntrySchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    message: { type: String, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    actorName: { type: String },
    comment: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const JobSchema = new mongoose.Schema(
  {
    jobCode: { type: String, required: true }, // JOB-2026-0001, never expose _id in the UI

    // At most one job per requisition (Rule 2) — enforced at the API layer
    // (requisition.status gate + this field) rather than a unique index,
    // since a CANCELLED job legitimately frees the requisition up again.
    requisitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobRequisition', default: null },

    // Section 1 — Basic Information
    jobTitle: { type: String, required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    designation: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation', default: null },
    totalOpenings: { type: Number, default: 1, min: 1 },
    filledOpenings: { type: Number, default: 0, min: 0 },
    employmentType: { type: String, enum: JOB_EMPLOYMENT_TYPE_LIST, default: null },
    workMode: { type: String, enum: WORK_MODE_LIST, default: null },
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    hiringManager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },

    // Section 2 — Experience & Eligibility (deliberately no "Minimum Age"
    // field — usually unnecessary and can create unfair hiring criteria;
    // only worth adding later if a specific legal/business need shows up)
    minExperience: { type: Number },
    maxExperience: { type: Number },
    minEducation: { type: String },
    preferredEducation: { type: String },
    certifications: { type: String },
    industryExperience: { type: String },
    freshersAllowed: { type: Boolean, default: false },

    // Section 4 — Compensation. Internal budget vs public-facing range are
    // deliberately separate fields — the public number can be narrower or
    // hidden entirely even when an internal budget exists.
    internalMinCtc: { type: Number },
    internalMaxCtc: { type: Number },
    publicSalaryVisible: { type: Boolean, default: false },
    publicMinCtc: { type: Number },
    publicMaxCtc: { type: Number },
    currency: { type: String, default: 'INR' },

    // Section 5 — Job Description
    jobSummary: { type: String },
    responsibilities: { type: String },
    requiredQualifications: { type: String },
    preferredQualifications: { type: String },
    aboutRole: { type: String },
    benefits: { type: String },
    perks: { type: String },

    // Step 4 — Public Listing overrides. HR may want the external-facing
    // copy to read differently from the internal jobTitle/jobSummary
    // (tone, phrasing, what's disclosed) without touching the internal
    // record. Null means "use the internal value" — see
    // lib/publicJobHelpers.js for the fallback.
    publicTitle: { type: String, default: null },
    publicDescription: { type: String, default: null },

    // Section 8 — Hiring Pipeline. Not a live FK — pipeline templates are
    // static starting points (lib/jobConstants.js), not a persisted,
    // tenant-configurable collection in Step 3. The stages a template
    // produces are what actually get stored, in job_pipeline_stages.
    pipelineTemplate: { type: String, default: 'DEFAULT_HIRING' },

    // Section 9 — Dates
    openingDate: { type: Date, default: null },
    applicationDeadline: { type: Date, default: null },
    expectedJoiningDate: { type: Date, default: null },
    targetClosingDate: { type: Date, default: null },

    // Section 10 — Visibility
    visibility: { type: String, enum: JOB_VISIBILITY_LIST, default: 'INTERNAL_ONLY' },

    status: { type: String, enum: JOB_STATUS_LIST, default: JOB_STATUS.DRAFT, required: true },

    // Who actually created the posting (vs. tenantFields' createdBy, which
    // is the email-string audit convention used across this codebase) —
    // kept as a real ref so the detail page can show "Created by <name>".
    createdByEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },

    activityLog: [ActivityEntrySchema],

    ...tenantFields,
  },
  { timestamps: true, collection: 'jobs' }
)

JobSchema.index({ tenantId: 1, status: 1 })
JobSchema.index({ tenantId: 1, jobCode: 1 }, { unique: true })
JobSchema.index({ tenantId: 1, requisitionId: 1 })
JobSchema.index({ tenantId: 1, department: 1 })

export default model('Job', JobSchema)
