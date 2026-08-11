import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { RESUME_PARSING_STATUS, RESUME_PARSING_STATUS_LIST, RESUME_UPLOAD_SOURCE_LIST } from '@/lib/candidateConstants'

// Step 6 — one row per uploaded resume file (versioned; a returning
// candidate's newer resume never overwrites an older one, see
// PARSING_WORKFLOW notes in lib/resumeParser.js). candidateId is nullable
// while a resume is a "draft" upload attached to no candidate yet — the
// Manual Candidate Entry flow parses a resume BEFORE the Candidate record
// exists, to auto-fill the Add Candidate form; the draft is claimed
// (candidateId set) once HR actually saves the new candidate.
const CandidateResumeSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', default: null, index: true },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', default: null },

    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true }, // stored filename (matches lib/resumeStorage.js output)
    originalFileName: { type: String, default: null }, // what the uploader's browser called it
    fileExt: { type: String, required: true },
    sizeBytes: { type: Number, default: null },

    version: { type: Number, required: true, default: 1 },
    isPrimary: { type: Boolean, default: true },

    // Who/how this resume entered the system — both feed the same parser.
    uploadSource: { type: String, enum: RESUME_UPLOAD_SOURCE_LIST, default: 'APPLICATION' },

    parsingStatus: { type: String, enum: RESUME_PARSING_STATUS_LIST, default: RESUME_PARSING_STATUS.UPLOADED },
    parsedData: { type: mongoose.Schema.Types.Mixed, default: null }, // structured JSON + confidence, see lib/resumeParser.js
    parserVersion: { type: String, default: null },
    errorMessage: { type: String, default: null },

    // Fields already merged into the candidate profile via apply-parsed-data
    // — lets the Review UI show "Applied" instead of re-offering them.
    appliedFields: [{ type: String }],
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: String, default: null },

    // Duplicate-identity flag — set when the resume's extracted email/phone
    // points at a *different* existing Candidate than the one this resume
    // is attached to. Never auto-merges (see lib/candidateProfileHelpers.js).
    possibleDuplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', default: null },
    duplicateDismissed: { type: Boolean, default: false },

    uploadedAt: { type: Date, default: Date.now },
    parsedAt: { type: Date, default: null },

    ...tenantFields,
  },
  { timestamps: true, collection: 'candidate_resumes' }
)

CandidateResumeSchema.index({ tenantId: 1, candidateId: 1, version: -1 })

export default model('CandidateResume', CandidateResumeSchema)
