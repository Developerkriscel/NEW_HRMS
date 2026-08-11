import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { PANEL_ROLE_LIST, ATTENDANCE_STATUS, ATTENDANCE_STATUS_LIST, FEEDBACK_STATUS, FEEDBACK_STATUS_LIST } from '@/lib/interviewConstants'

// interview_panel_members — one row per interviewer on an interview.
const InterviewPanelMemberSchema = new mongoose.Schema(
  {
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    employeeName: { type: String, default: null }, // denormalized for fast list rendering

    role: { type: String, enum: PANEL_ROLE_LIST, required: true },
    attendanceStatus: { type: String, enum: ATTENDANCE_STATUS_LIST, default: ATTENDANCE_STATUS.PENDING },
    feedbackStatus: { type: String, enum: FEEDBACK_STATUS_LIST, default: FEEDBACK_STATUS.PENDING },

    ...tenantFields,
  },
  { timestamps: true, collection: 'interview_panel_members' }
)

InterviewPanelMemberSchema.index({ tenantId: 1, interviewId: 1 })
InterviewPanelMemberSchema.index({ tenantId: 1, employeeId: 1 })

export default model('InterviewPanelMember', InterviewPanelMemberSchema)
