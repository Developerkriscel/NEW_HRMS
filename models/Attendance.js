import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

const AttendanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true }, // stored at midnight UTC, compared by day
    checkInTime: { type: Date, default: null },
    checkOutTime: { type: Date, default: null },
    checkInLatitude: { type: Number },
    checkInLongitude: { type: Number },
    checkOutLatitude: { type: Number },
    checkOutLongitude: { type: Number },
    checkInAccuracy: { type: Number },
    checkOutAccuracy: { type: Number },
    checkInPhoto: { type: String, default: null },
    checkOutPhoto: { type: String, default: null },
    breaks: [{
      start: { type: Date, required: true },
      end: { type: Date, default: null },
      duration: { type: Number, default: 0 } // in minutes
    }],
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'CAMERA_VERIFIED', 'LOCATION_VERIFIED', 'VERIFIED', 'REJECTED'],
      default: 'PENDING'
    },
    checkInSource: {
      type: String,
      enum: ['WEB', 'MOBILE', 'GPS', 'BIOMETRIC', 'QR_CODE', 'FACE_RECOGNITION', 'MANUAL', 'WFH'],
      default: 'WEB',
    },
    status: {
      type: String,
      enum: ['PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY', 'WEEKEND', 'WFH'],
      default: 'PRESENT',
    },
    lateMark: { type: Boolean, default: false },
    earlyLogout: { type: Boolean, default: false },
    halfDay: { type: Boolean, default: false },
    absent: { type: Boolean, default: false },
    workingMinutes: { type: Number, default: 0 },
    overtimeMinutes: { type: Number, default: 0 },
    breakMinutes: { type: Number, default: 0 },
    remarks: { type: String },
    regularizationRequested: { type: Boolean, default: false },
    regularizationCheckIn: { type: Date, default: null },
    regularizationCheckOut: { type: Date, default: null },
    regularizationReason: { type: String },
    regularizationStatus: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: null },
    regularizationApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    regularizationApprovedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    ...tenantFields,
  },
  { timestamps: true }
)

AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true })
AttendanceSchema.index({ tenantId: 1, date: 1 })
AttendanceSchema.index({ tenantId: 1, date: -1 })
AttendanceSchema.index({ tenantId: 1, regularizationStatus: 1, date: -1 })
AttendanceSchema.index({ employee: 1, date: -1 })

export default model('Attendance', AttendanceSchema)
