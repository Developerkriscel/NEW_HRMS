import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

const LeaveRequestSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    leaveType: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    numberOfDays: { type: Number, required: true },
    reason: { type: String },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'], default: 'PENDING' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    approverRemarks: { type: String },
    rejectionReason: { type: String },
    halfDay: { type: Boolean, default: false },
    halfDayType: { type: String, enum: ['FIRST_HALF', 'SECOND_HALF'], default: null },
    ...tenantFields,
  },
  { timestamps: true }
)

LeaveRequestSchema.index({ employee: 1 })
LeaveRequestSchema.index({ tenantId: 1, status: 1 })

export default model('LeaveRequest', LeaveRequestSchema)
