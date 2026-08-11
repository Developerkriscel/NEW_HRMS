import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { MATCH_LABEL } from '@/lib/matchingConstants'

// candidate_job_matches — Step 7. Deliberately kept separate from
// Application (never baked into it) so re-running the match (job
// requirements changed, a new resume was reviewed) is just a new/updated
// row here, not a destructive edit to the application record itself. One
// row per application (an application only ever applies to one job).
const CandidateJobMatchSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },

    overallScore: { type: Number, required: true },
    skillsScore: { type: Number, required: true },
    experienceScore: { type: Number, required: true },
    educationScore: { type: Number, required: true },
    locationScore: { type: Number, required: true },
    ctcScore: { type: Number, required: true },
    noticeScore: { type: Number, required: true },
    screeningScore: { type: Number, required: true },

    matchLabel: { type: String, enum: Object.values(MATCH_LABEL), required: true },

    // { required: [...], preferred: [...] } — skill names, not full objects,
    // this is a display/explanation artifact, not a source of truth.
    matchedSkills: { type: mongoose.Schema.Types.Mixed, default: () => ({ required: [], preferred: [] }) },
    missingSkills: { type: mongoose.Schema.Types.Mixed, default: () => ({ required: [], preferred: [] }) },

    // Short display strings, e.g. "Node.js — 3 years" — the ✓ rows from the
    // spec's example. All strengths render the same way, so plain strings.
    strengths: [{ type: String }],
    // Concerns split by severity so the UI can tell a missing *required*
    // skill (✕, hard) from a softer gap like notice period or a missing
    // *preferred* skill (△, soft) — both are "concerns" but read differently.
    concerns: [{
        severity: { type: String, enum: ['CRITICAL', 'MODERATE'], default: 'MODERATE' },
        text: { type: String, required: true },
      }],

    summary: { type: String, default: null },

    modelVersion: { type: String, required: true },
    rulesVersion: { type: String, required: true },

    // What this result was actually computed against — so a stale match can
    // be recognized instead of silently trusted after the job or resume
    // changes. jobVersion is the Job's updatedAt at generation time (Job has
    // no dedicated version counter); resumeVersion is the CandidateResume
    // version number used.
    jobVersion: { type: Date, default: null },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'CandidateResume', default: null },
    resumeVersion: { type: Number, default: null },

    generatedAt: { type: Date, default: Date.now },

    ...tenantFields,
  },
  { timestamps: true, collection: 'candidate_job_matches' }
)

CandidateJobMatchSchema.index({ tenantId: 1, applicationId: 1 }, { unique: true })
CandidateJobMatchSchema.index({ tenantId: 1, jobId: 1, overallScore: -1 })

export default model('CandidateJobMatch', CandidateJobMatchSchema)
