import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { SCHEDULE_HISTORY_ACTION } from '@/lib/interviewConstants'

// interview_schedule_history — append-only. "Do not overwrite without an
// audit trail" — every schedule/reschedule/cancel transition lands here in
// addition to updating Interview's own fields.
const InterviewScheduleHistorySchema = new mongoose.Schema(
  {
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', required: true },
    action: { type: String, enum: Object.values(SCHEDULE_HISTORY_ACTION), required: true },

    previousDate: { type: Date, default: null },
    previousStartTime: { type: String, default: null },
    previousEndTime: { type: String, default: null },
    newDate: { type: Date, default: null },
    newStartTime: { type: String, default: null },
    newEndTime: { type: String, default: null },

    reason: { type: String, default: null },
    comment: { type: String, default: null },

    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    changedByName: { type: String, default: null },
    changedAt: { type: Date, default: Date.now },

    ...tenantFields,
  },
  { timestamps: true, collection: 'interview_schedule_history' }
)

InterviewScheduleHistorySchema.index({ tenantId: 1, interviewId: 1, changedAt: 1 })

export default model('InterviewScheduleHistory', InterviewScheduleHistorySchema)
