import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { CANDIDATE_STATUS, CANDIDATE_STATUS_LIST, APPLICATION_SOURCE_LIST } from '@/lib/candidateConstants'

// Step 5 — this replaces the flat Step-2 shape (name/roleApplied/stage all
// on one record). A candidate is now a person, independent of any one job;
// what they applied for and where they are in that process lives on
// Application instead — see models/Application.js. One candidate can have
// many applications.
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

const CandidateSchema = new mongoose.Schema(
  {
    candidateCode: { type: String, required: true }, // CAN-2026-0001, never expose _id in the UI

    firstName: { type: String, required: true },
    lastName: { type: String, default: '' },
    email: { type: String, required: true },
    phone: { type: String, required: true },

    currentLocation: { type: String, default: null },
    currentCompany: { type: String, default: null },
    currentDesignation: { type: String, default: null },

    totalExperience: { type: Number, default: null },
    relevantExperience: { type: Number, default: null },

    currentCtc: { type: Number, default: null },
    expectedCtc: { type: Number, default: null },

    noticePeriod: { type: String, default: null },
    lastWorkingDate: { type: Date, default: null },

    linkedinUrl: { type: String, default: null },
    githubUrl: { type: String, default: null },
    portfolioUrl: { type: String, default: null },

    resumeUrl: { type: String, default: null },

    // Where this person first entered the ATS — an individual Application
    // tracks its own source too, since the same candidate can apply to a
    // second job via a different channel later.
    source: { type: String, enum: APPLICATION_SOURCE_LIST, default: 'DIRECT' },

    status: { type: String, enum: CANDIDATE_STATUS_LIST, default: CANDIDATE_STATUS.ACTIVE },

    // Not in the spec's literal DB field list, but the Candidate Detail
    // page needs somewhere for both — kept basic/manual per Step 5 ("Skills
    // basic/manual. Resume parsing comes next"); Notes reuses the same
    // activity-entry shape as Job/JobRequisition (type NOTE) rather than a
    // separate collection.
    skills: [{ type: String }],
    activityLog: [ActivityEntrySchema],

    ...tenantFields,
  },
  { timestamps: true, collection: 'candidates' }
)

CandidateSchema.index({ tenantId: 1, candidateCode: 1 }, { unique: true })
CandidateSchema.index({ tenantId: 1, email: 1 })
CandidateSchema.index({ tenantId: 1, phone: 1 })

CandidateSchema.methods.getFullName = function () {
  return `${this.firstName} ${this.lastName}`.trim()
}

export default model('Candidate', CandidateSchema)
