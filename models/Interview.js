import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import {
  INTERVIEW_TYPE_LIST, INTERVIEW_MODE_LIST, MEETING_PROVIDER_LIST, INTERVIEW_STATUS, INTERVIEW_STATUS_LIST,
  CANCELLATION_REASON_LIST, NO_SHOW_TYPE,
} from '@/lib/interviewConstants'

// interviews — field list matches the spec's Database section for Step 10
// almost verbatim.
const InterviewSchema = new mongoose.Schema(
  {
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },

    pipelineStageId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPipelineStage', default: null },
    roundName: { type: String, required: true }, // e.g. "Technical Round 1"
    type: { type: String, enum: INTERVIEW_TYPE_LIST, required: true },

    date: { type: Date, required: true }, // calendar date, midnight UTC
    startTime: { type: String, required: true }, // "HH:mm", paired with `date` + `timezone`
    endTime: { type: String, required: true },
    timezone: { type: String, default: 'Asia/Kolkata' },

    mode: { type: String, enum: INTERVIEW_MODE_LIST, required: true },
    meetingProvider: { type: String, enum: MEETING_PROVIDER_LIST, default: null },
    meetingUrl: { type: String, default: null },
    location: { type: String, default: null },

    candidateInstructions: { type: String, default: null },
    internalNotes: { type: String, default: null }, // never exposed to the candidate/interviewer confirmation

    scorecardTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewScorecardTemplate', default: null },

    status: { type: String, enum: INTERVIEW_STATUS_LIST, default: INTERVIEW_STATUS.SCHEDULED },

    scheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    scheduledByName: { type: String, default: null },
    scheduledAt: { type: Date, default: Date.now },

    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, enum: [...CANCELLATION_REASON_LIST, null], default: null },
    cancellationComment: { type: String, default: null },

    noShowType: { type: String, enum: [...Object.values(NO_SHOW_TYPE), null], default: null },

    ...tenantFields,
  },
  { timestamps: true, collection: 'interviews' }
)

InterviewSchema.index({ tenantId: 1, applicationId: 1 })
InterviewSchema.index({ tenantId: 1, date: 1, status: 1 })
InterviewSchema.index({ tenantId: 1, jobId: 1 })

export default model('Interview', InterviewSchema)
